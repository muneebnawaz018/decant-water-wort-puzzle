import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colours } from '@/theme/colors';
import { Wordmark } from './chrome/Wordmark';
import { styles } from './styles/SplashScreen.styles';

interface SplashScreenProps {
  onDone: () => void;
}

/** Spec §4.1: auto-advance after ~3s, or on tap. */
const FILL_MS = 900;
const RISE_MS = 900;
const HOLD_MS = 700;

/**
 * A vial glowing to life on a dark bench, then the wordmark rising (spec §4.1).
 *
 * Everything runs on the UI thread and stops when it finishes. The one looping
 * animation — the tap hint — is cancelled on unmount, so nothing ticks behind
 * Home.
 */
export function SplashScreen({ onDone }: SplashScreenProps) {
  const fill = useSharedValue(0);
  const title = useSharedValue(0);
  const titleLift = useSharedValue(14);
  const tagline = useSharedValue(0);
  const hint = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(1, {
      duration: FILL_MS,
      easing: Easing.inOut(Easing.cubic),
    });

    title.value = withDelay(500, withTiming(1, { duration: RISE_MS }));
    titleLift.value = withDelay(
      500,
      withTiming(0, {
        duration: RISE_MS,
        easing: Easing.out(Easing.back(1.6)),
      })
    );

    tagline.value = withDelay(
      1100,
      withSequence(
        withTiming(1, { duration: RISE_MS }),
        // Hand off only once the last frame has actually landed.
        withDelay(
          HOLD_MS,
          withTiming(1, { duration: 0 }, (finished) => {
            'worklet';
            if (finished) runOnJS(onDone)();
          })
        )
      )
    );

    hint.value = withDelay(
      1800,
      withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    );

    return () => {
      // Leaving early must not leave animations running against a dead tree.
      cancelAnimation(fill);
      cancelAnimation(title);
      cancelAnimation(titleLift);
      cancelAnimation(tagline);
      cancelAnimation(hint);
    };
  }, [fill, title, titleLift, tagline, hint, onDone]);

  const liquidStyle = useAnimatedStyle(() => ({
    height: `${fill.value * 100}%`,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: fill.value * 0.55 }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [{ translateY: titleLift.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + hint.value * 0.6,
  }));

  const skip = useCallback(() => onDone(), [onDone]);

  return (
    <Pressable style={styles.root} onPress={skip} accessibilityRole="button">
      <View style={styles.vialSlot}>
        <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
        <View style={styles.vial}>
          <Animated.View style={[styles.liquidSlot, liquidStyle]}>
            <LinearGradient
              // Named colours, never `pieces[n]`: the palette is ordered by
              // separation, so an index points at a different colour the next
              // time it is reordered. Decoration must not move with it.
              colors={[colours.aqua, colours.teal]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={styles.shine} pointerEvents="none" />
        </View>
      </View>

      <Animated.View style={titleStyle}>
        <Wordmark size={46} />
      </Animated.View>

      <Animated.Text style={[styles.tagline, taglineStyle]}>
        measure · pour · settle
      </Animated.Text>

      <Animated.Text style={[styles.hint, hintStyle]}>TAP TO BEGIN</Animated.Text>
    </Pressable>
  );
}
