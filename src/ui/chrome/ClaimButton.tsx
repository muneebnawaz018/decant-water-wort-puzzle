import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { gradients, ui } from '@/theme/colors';
import { usePressBounce } from '../hooks/usePressBounce';
import { useTapBurst } from '../hooks/useTapBurst';
import { useTapHandler } from '../hooks/useTapHandler';
import { styles } from './styles/ClaimButton.styles';

/**
 * Daily's claim control — the one button in the app with two jobs.
 *
 * Written as its own component rather than as another `GlossButton` variant,
 * because the two states are not "enabled" and "disabled". Waiting is a *live*
 * state: it counts down, it is the thing the screen is about, and treating it
 * as an inert button is what produced three rounds of the wrong colour. A
 * greyed-out control says "you cannot do this". This one has to say "not yet",
 * which is a different sentence.
 *
 * So the surfaces differ by intent, not by dimming:
 *
 * - **Waiting** is the panel surface with a gold edge and the time on it.
 *   Nothing is faded — there is no translucency here for a renderer to disagree
 *   about, which is what made the faded version land gold on Android and brown
 *   on iOS.
 * - **Ready** is the lit gold face with dark ink. It is the only thing on the
 *   screen worth pressing, and it should be impossible to miss.
 *
 * Two idle animations were tried here and both are gone. A highlight sweeping
 * the face read as a loading shimmer — the thing a skeleton screen does while
 * it waits for data. A Lottie clock beside the numbers was drawn for a dial
 * three times this size, so its ring and ticks landed under a pixel wide and
 * came out as a smudge; thickening the artwork helped and did not save it.
 *
 * What carries the waiting state now is the button's own slow breath — see
 * `breath` below — plus the numbers changing every second. Both are the button
 * moving rather than something moving across it, which is the distinction the
 * first two attempts missed.
 */
export const ClaimButton = memo(function ClaimButton({
  label,
  caption,
  onPress,
  waiting,
}: {
  label: string;
  /** Small line above the label. Omitted when the button is ready to pay. */
  caption?: string;
  onPress: () => void;
  /** Counting down. The button is live either way — it just cannot pay yet. */
  waiting: boolean;
}) {
  const handlePress = useTapHandler(onPress);
  const bounce = usePressBounce();
  const burst = useTapBurst(waiting ? 'light' : 'dark');

  /**
   * A breath, not a shimmer.
   *
   * Two idle effects were tried on this button and both were wrong in the same
   * way: a sweep and a spinning clock are things *added on top* of a surface,
   * so they read as decoration stuck to it. Scaling the button itself does not
   * — it is the button moving, which is why a two percent swell over three
   * seconds registers as alive while a bright bar crossing it registered as a
   * loading state.
   *
   * `withRepeat(..., true)` reverses rather than restarting, so it never
   * snaps back to the start of the cycle. Runs on the UI thread and is
   * cancelled on unmount, per this project's rule that nothing loops
   * unattended.
   */
  const breath = useSharedValue(0);
  useEffect(() => {
    if (!waiting) {
      breath.value = withTiming(0, { duration: 300 });
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return () => cancelAnimation(breath);
  }, [waiting, breath]);

  const breathing = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.02 }],
    opacity: 1 - breath.value * 0.12,
  }));

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        bounce.onPressIn();
        burst.fire();
      }}
      onPressOut={bounce.onPressOut}
      // Pressable while waiting, deliberately: the press animation and the
      // burst still answer, and the handler no-ops. A control that has a live
      // clock in it should not feel dead to the touch.
      accessibilityRole="button"
      accessibilityState={{ disabled: waiting }}
    >
      <Animated.View
        style={[waiting ? styles.restShadow : styles.readyShadow, breathing, bounce.style]}
      >
        <View style={[styles.face, waiting ? styles.restEdge : styles.readyEdge]}>
          <LinearGradient
            colors={waiting ? gradients.panel : ui.buttonFace}
            style={styles.fill}
          >
            {burst.node}

            {/*
              One line, two sizes.
              
              A bare clock is ambiguous — session timer, cooldown, ad
              countdown, no way to tell. The caption names what is being
              counted; the numbers carry it. Nesting it inside the same `Text`
              keeps them on one baseline, which stacked rows could not do: two
              centred lines in a 50dp button read as two messages rather than
              as a label and its value.

              The caption is dropped once the reward is claimable, where the
              label says the whole thing on its own.
            */}
            <Text style={[styles.label, waiting ? styles.restLabel : styles.readyLabel]}>
              {caption ? (
                <Text
                  style={[
                    styles.caption,
                    waiting ? styles.restCaption : styles.readyCaption,
                  ]}
                >
                  {caption}{' '}
                </Text>
              ) : null}
              {label}
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>
    </Pressable>
  );
});
