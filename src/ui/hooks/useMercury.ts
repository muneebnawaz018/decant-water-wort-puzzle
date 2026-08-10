import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

/** How long one pass takes, and how long the fill rests between passes. */
const SWEEP_MS = 1100;
const REST_MS = 1500;

/**
 * A highlight running along a progress fill, forever.
 *
 * **Reanimated rather than Lottie, and that is the interesting part.** Every
 * other mark on this card is a generated Lottie file, and this one cannot be:
 * `resizeMode` fits a composition into the box it is given, and a progress fill
 * has no fixed box — it is 4% wide on level 2 and 96% wide on level 49. `cover`
 * would crop the sweep's travel away on a narrow fill; `contain` would squash a
 * 6dp-tall band into a sliver. A Lottie needs to know its aspect, and this does
 * not have one.
 *
 * A translating view has no such problem: it is measured against whatever the
 * fill turns out to be, every frame, for free.
 *
 * The band travels from just off the left edge to just off the right, then waits.
 * The rest is most of the cycle on purpose — a bar that shimmers continuously
 * reads as *loading*, which is the one thing this bar is not. It is reporting a
 * number that only changes when a level is finished.
 *
 * On the UI thread, like everything else here, and stopped by unmount. The fill
 * it lives in already clips (`styles.bar`), so the band needs no mask.
 */
export function useMercury(): AnimatedStyle<ViewStyle> {
  const travel = useSharedValue(0);

  useEffect(() => {
    travel.value = withRepeat(
      withDelay(
        REST_MS,
        withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [travel]);

  return useAnimatedStyle(() => ({
    // Percentages of the *band*, which is three times the fill's width — so one
    // pass carries it from entirely off the left to entirely off the right
    // whatever the fill happens to measure. A translation in points would need
    // the width, and needing the width is what forced this out of Lottie.
    transform: [{ translateX: `${-100 + travel.value * 133}%` }],
  }));
}
