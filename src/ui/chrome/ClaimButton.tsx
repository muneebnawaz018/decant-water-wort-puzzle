import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
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
import { Coin } from './Coin';
import { CAPTION_COIN, styles } from './ClaimButton.styles';

/**
 * The waiting mark: a vial filling a drop at a time.
 *
 * Required at module scope rather than inline, so Metro resolves it once — the
 * same rule `CompleteScreen` and `useTapBurst` already follow.
 *
 * Generated, not authored: `python3 script/make-brew.py` redraws it from the
 * palette. See that script for why this project generates its artwork.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BREW = require('../../../assets/lottie/brew.json');

/**
 * Daily's claim control — the one button in the app with two jobs.
 *
 * Written as its own component rather than as another `GlossButton` variant,
 * because the two states are not "enabled" and "disabled". Waiting is a *live*
 * state: it counts down, it is the thing the screen is about, and treating it
 * as an inert button is what produced three rounds of the wrong color. A
 * grayed-out control says "you cannot do this". This one has to say "not yet",
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
  captionAmount,
  onPress,
  waiting,
  fill = false,
}: {
  label: string;
  /** Small line above the label. Omitted when the button is ready to pay. */
  caption?: string;
  /**
   * What the next reward pays, shown beside the caption.
   *
   * The countdown said when and never what, so the one line on this screen that
   * could give a player a reason to come back was the one line that did not
   * name the prize. A number with a coin beside it is that reason, and it
   * belongs on the caption's row rather than under the clock — the clock is
   * already the largest thing here and a second number below it competes.
   */
  captionAmount?: number;
  onPress: () => void;
  /** Counting down. The button is live either way — it just cannot pay yet. */
  waiting: boolean;
  /**
   * Fill the slot it is placed in, rather than sizing to its own content.
   *
   * For the reward track's last row, where it sits beside day seven's tile and
   * has to be the same height as it — a control that shrinks to its text leaves
   * the row looking like a tile with a pill parked next to it. The height comes
   * from the tile, so nothing here states one.
   */
  fill?: boolean;
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
   * canceled on unmount, per this project's rule that nothing loops
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
      style={fill ? styles.grow : undefined}
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
        style={[
          waiting ? styles.restShadow : styles.readyShadow,
          fill && styles.grow,
          breathing,
          bounce.style,
        ]}
      >
        <View
          style={[
            styles.face,
            waiting ? styles.restEdge : styles.readyEdge,
            fill && styles.grow,
          ]}
        >
          <LinearGradient
            colors={waiting ? gradients.panel : ui.buttonFace}
            style={styles.fill}
          >
            {burst.node}

            {/*
              Waiting and ready are laid out differently, because they are
              different things.

              Ready is one line: a label that says the whole thing. Waiting was
              the same line with a caption spliced into it — `Next in 23:58:10`
              — and it never balanced. Two short words carry no weight against
              an eight-digit clock, and the obvious fixes both make it worse:
              growing the words fights the number that is actually the value,
              and shrinking the number is shrinking the thing people came to
              read.

              So the words leave the line. A mark takes the left, the clock
              takes the rest, and the caption sits above it small — where a
              caption belongs and where its length stops mattering.

              The mark is a vial filling a drop at a time. It says *waiting* in
              the game's own vocabulary rather than in English, which is the
              other half of why the words could go: a countdown beside a
              dripping vial does not need to be told what it is counting.
            */}
            {waiting ? (
              <View style={styles.waitRow}>
                {/*
                  `autoPlay` and `loop`, and no ref. Unlike the tap burst this
                  is not fired by a press — it runs for as long as the row is on
                  screen, which is only while a reward is pending. Once the
                  timer is up the whole branch unmounts and the player goes with
                  it; a Lottie left mounted is a native view and a redraw target
                  for as long as it exists.
                */}
                <LottieView
                  source={BREW}
                  autoPlay
                  loop
                  resizeMode="contain"
                  style={styles.brew}
                />
                {/*
                  Three boxes, not one flow: the mark, the caption row, the
                  clock. Each sized by its own rules.

                  The clock is why. Its text changes every second and Poppins is
                  proportionally spaced, so `23:59:59` and `11:11:11` are
                  different widths — laid out as plain siblings, every tick
                  nudged the caption and the vial beside it. Giving the clock a
                  box with a floor under its width stops the row resizing
                  against its own content, and the caption above it is measured
                  independently rather than against whatever the digits happen to
                  be.
                */}
                <View style={styles.waitText}>
                  {caption ? (
                    <View style={styles.captionRow}>
                      <Text style={styles.waitCaption}>{caption}</Text>
                      {captionAmount !== undefined ? (
                        <View style={styles.captionValue}>
                          <Coin size={CAPTION_COIN} />
                          <Text style={styles.captionAmount}>{captionAmount}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  <View style={styles.clockBox}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.label, styles.restLabel]}
                    >
                      {label}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              /* One line, always. The control shares a row with day seven's
                 tile, so a wrap would make it taller than the tile beside it
                 and the last row would stop lining up with the two above. */
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.label, styles.readyLabel]}
              >
                {label}
              </Text>
            )}
          </LinearGradient>
        </View>
      </Animated.View>
    </Pressable>
  );
});
