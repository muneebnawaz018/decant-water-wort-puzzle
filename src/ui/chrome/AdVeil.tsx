import LottieView from 'lottie-react-native';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { isAdLoading, subscribeToAdLoading } from '@/ads/loading';
import { styles } from './AdVeil.styles';

/**
 * Two gold arcs turning against each other — `script/make-loader.py`.
 *
 * The one looping animation in the app, and the exemption is deliberate: the
 * rule in `assets/lottie/README.md` is that a mounted loop redraws forever, and
 * this component is mounted only while a fetch is running. A loader that plays
 * once and stops is worse than none, because a frozen spinner says the app has
 * hung.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOADER = require('../../../assets/lottie/loader.json');

/**
 * How long a load may run before the player is shown anything.
 *
 * A fetch that comes back inside this is invisible, which is the right outcome:
 * on wifi an ad often lands in a couple of hundred milliseconds, and in flight
 * mode the request fails almost at once because there is no network to try. Both
 * would otherwise flash a full-screen loader for a frame or two, which reads as
 * a glitch rather than as loading.
 *
 * Long enough to swallow those, short enough that a genuinely slow connection
 * still answers the press before the player decides the button is broken.
 */
const REVEAL_DELAY_MS = 400;

/**
 * Takes the press and does nothing with it.
 *
 * A full-screen `View` is not enough on its own: React Native's hit test keeps
 * looking behind a view that claims no responder, so the buttons underneath
 * would still fire through the veil. A `Pressable` with a handler claims it, and
 * the handler being empty is the whole point — the veil is a wall, not a way
 * out. Cancelling an ad request half-loaded is not an offer worth making, and
 * the deadline in `rewarded.ts` ends the wait regardless.
 */
const swallow = (): void => {};

/**
 * The mark over a rewarded ad that is still loading.
 *
 * Mounted once, in `Overlays`, rather than owned by the three screens that offer
 * ads. Two reasons, and the second is the one that decides it: the offers are
 * raised from very different places — a board control, a win card, a modal's
 * secondary button — and the daily one closes its own dialog on the way, so
 * there is no button left to spin. A layer above all of them is the only spot
 * that covers every case.
 *
 * It is a real barrier, not decoration. `showRewarded` already refuses a second
 * offer while one is in flight, but a refusal the player cannot see is still a
 * press that did nothing, and this app's rule is that a press either does
 * something or is disabled. Swallowing the taps is the visible half of a guard
 * the logic was already keeping.
 */
export const AdVeil = memo(function AdVeil() {
  const [loading, setLoading] = useState(isAdLoading);
  const [shown, setShown] = useState(false);

  useEffect(() => subscribeToAdLoading(setLoading), []);

  /*
    The delay is held here rather than inside the ads module, because it is a
    fact about what looks right on screen and not about how ads load. The timer
    is cleared on the way out, so a fetch that finishes inside the window never
    reveals anything.
  */
  useEffect(() => {
    if (!loading) {
      setShown(false);
      return;
    }
    const reveal = setTimeout(() => setShown(true), REVEAL_DELAY_MS);
    return () => clearTimeout(reveal);
  }, [loading]);

  if (!shown) return null;

  return (
    <Animated.View
      style={styles.scrim}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(160)}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={swallow} />

      <View style={styles.card} pointerEvents="none">
        {/* Square box for a square frame — see `MARK_SIZE`. */}
        <LottieView
          source={LOADER}
          autoPlay
          loop
          resizeMode="contain"
          style={styles.mark}
        />
        <Text style={styles.label}>Loading ad</Text>
      </View>
    </Animated.View>
  );
});
