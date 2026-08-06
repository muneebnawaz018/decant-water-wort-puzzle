import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

/** How far in the glyph pulls on press. */
const PRESS_SCALE = 0.86;

/**
 * The spring that lets it back out.
 *
 * Underdamped on purpose — it overshoots slightly, which is the difference
 * between a control that springs back and one that merely returns. The press
 * itself is a `withTiming` rather than a spring: going in should feel
 * immediate and mechanical, coming out should feel alive.
 */
const RELEASE = { damping: 9, stiffness: 320, mass: 0.5 } as const;

export interface TapScale {
  style: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * Press feedback for an icon, on the UI thread.
 *
 * Every icon in this app is a Skia path on its own canvas, which makes it cheap
 * to draw and impossible to animate from React without re-rendering it. The
 * transform goes on a wrapping `Animated.View` instead: the canvas is never
 * touched, nothing re-renders, and the whole thing runs in a worklet.
 *
 * It is a hook rather than a component because the two handlers have to reach
 * the `Pressable`, which is a different node from the one being scaled — and
 * because a component would put another view in every button in the app.
 *
 * This is the free half of "animated icons". Lottie is the other half, and it
 * is for moments — a claim, a win, an unlock — not for the thirty glyphs a
 * player taps all day. Those want to feel responsive, which is a spring, not a
 * clip.
 */
export function useTapScale(): TapScale {
  const press = useSharedValue(0);

  const onPressIn = useCallback(() => {
    press.value = withTiming(1, { duration: 80 });
  }, [press]);

  const onPressOut = useCallback(() => {
    press.value = withSpring(0, RELEASE);
  }, [press]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * (1 - PRESS_SCALE) }],
  }));

  return { style, onPressIn, onPressOut };
}
