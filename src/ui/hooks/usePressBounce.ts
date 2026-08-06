import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

/** How far the button squashes under a finger. */
const SQUASH = 0.94;
/** How much wider it goes while it squashes — a pressed thing spreads. */
const SPREAD = 1.03;
/** The drop, in dp. */
const SINK = 3;

/**
 * The release spring, well under critical damping.
 *
 * The overshoot is the whole effect. A button that returns exactly to rest
 * reads as a state change; one that goes slightly past and settles reads as
 * something with weight in it.
 */
const RELEASE = { damping: 8, stiffness: 120, mass: 1.1 } as const;

/**
 * The shiver: a tilt one way, a smaller one back, then straight.
 *
 * Slow enough to be seen. At 70ms a leg the whole thing was over in a fifth of
 * a second and registered as a flicker — the eye caught that *something*
 * happened without catching what. Read speed, not physics, sets this number.
 */
const SHIVER_DEG = 1.6;
const SHIVER_MS = 150;

export interface PressBounce {
  style: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * Squash on press, spring and shiver on release.
 *
 * The button used to drop 2px and come back, which is correct and lifeless.
 * Three things carry the weight now, and they are separable on purpose:
 *
 * - **Squash and spread.** Pressing shortens the button and widens it, the way
 *   anything soft behaves under a thumb. Scaling both axes equally just makes
 *   it smaller, which reads as moving away rather than as being pressed.
 * - **Overshoot.** The release spring is underdamped, so the face passes rest
 *   and settles back into it.
 * - **Shiver.** A degree and a half of tilt, once each way, over just under
 *   half a second. Small enough that nobody sees a rotation — what they notice
 *   is that the button *reacted*.
 *
 * All of it runs in worklets on the UI thread, so a press never costs a React
 * render. That matters most on the board, where a control tap happens during
 * the pour animation.
 */
export function usePressBounce(): PressBounce {
  const press = useSharedValue(0);
  const tilt = useSharedValue(0);

  const onPressIn = useCallback(() => {
    // Going in stays quick — a press should feel like it lands the moment the
    // finger does. It is the return that wants time.
    press.value = withTiming(1, { duration: 110 });
  }, [press]);

  const onPressOut = useCallback(() => {
    press.value = withSpring(0, RELEASE);
    tilt.value = withSequence(
      withTiming(SHIVER_DEG, { duration: SHIVER_MS }),
      withTiming(-SHIVER_DEG * 0.6, { duration: SHIVER_MS }),
      withTiming(0, { duration: SHIVER_MS })
    );
  }, [tilt, press]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: press.value * SINK },
      { scaleX: 1 + press.value * (SPREAD - 1) },
      { scaleY: 1 - press.value * (1 - SQUASH) },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  return { style, onPressIn, onPressOut };
}
