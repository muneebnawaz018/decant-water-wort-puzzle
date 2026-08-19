import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useEconomyStore } from '@/state/economyStore';
import { nav } from '@/state/navStore';
import { apothecary } from '@/theme/apothecary';
import { gradients } from '@/theme/colors';
import { s } from '@/theme/scale';
import { compactCoins, groupedNumber } from '@/utils';
import { useTapHandler } from '../hooks/useTapHandler';
import { useTapScale } from '../hooks/useTapScale';
import { Icon } from '../Icon';
import { Coin } from './Coin';
import { COIN_SIZE, styles } from './CoinPill.styles';

/**
 * The sheen crossing the plus — `script/make-shine.py`.
 *
 * **Nothing in it is clipped, and it does not need to be.** The band runs across
 * a square frame; `styles.plus` carries `borderRadius` and `overflow: 'hidden'`
 * already, for its own gradient, so the disc's own corner does the masking. That
 * is what keeps the file inside the portable subset — masks and track mattes are
 * where the three Lottie renderers stop agreeing.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SHINE = require('../../../assets/lottie/shine.json');

/** How long the balance note stays up. Matches the global toast. */
const TIP_MS = 1800;

/**
 * Coin balance, top-left of most screens (spec §4.2).
 *
 * Pulses when the balance goes up, which is the only feedback that a reward
 * actually landed once the "+N" has floated away.
 */
export const CoinPill = memo(function CoinPill() {
  const coins = useEconomyStore((state) => state.coins);
  const scale = useSharedValue(1);
  const previous = useRef(coins);

  useEffect(() => {
    if (coins > previous.current) {
      scale.value = withSequence(
        withTiming(1.22, { duration: 160 }),
        withTiming(1, { duration: 240 })
      );
    }
    previous.current = coins;
  }, [coins, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const tap = useTapScale();
  // Through `useTapHandler`, so the plus ticks like every other button in the
  // chrome rather than being the one control that navigates in silence.
  const openShop = useTapHandler(useCallback(() => nav.go('shop'), []));

  /**
   * The exact balance, because the pill cannot show it.
   *
   * `compactCoins` truncates by design — it has a fixed width to keep — so a
   * player holding 1,204,832 coins reads `1.2M` and has no way to find the
   * other 4,832. This note is that way, and it is why the balance is now its
   * own press rather than a dead half of a shop button.
   *
   * **Under the pill, not in the global toast.** The toast lands 104dp off the
   * bottom of the screen, which puts the answer as far from the question as the
   * layout allows — and it reads as an announcement about the app rather than a
   * label on the thing just pressed. Hung off the pill it is what it is: that
   * number, spelled out.
   *
   * No `i` mark to advertise it. The pill is 94dp of chrome on every screen and
   * a badge on it would be permanent furniture explaining a number most players
   * never need to the digit; the affordance already on there is the plus, and
   * it belongs to the shop.
   */
  const [tip, setTip] = useState(false);
  const toggleTip = useTapHandler(useCallback(() => setTip((open) => !open), []));

  // Auto-dismisses, like the toast it replaced — the balance is not a dialog,
  // and a note that waits to be closed is a note the player has to deal with.
  // A second press closes it early; so does the balance changing underneath it,
  // since the figure on screen would otherwise be the old one.
  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => setTip(false), TIP_MS);
    return () => clearTimeout(timer);
  }, [tip]);

  useEffect(() => setTip(false), [coins]);

  return (
    <View style={styles.anchor}>
      <Animated.View style={animated}>
        <View style={styles.pill}>
          <LinearGradient
            colors={[apothecary.surfaceTop, apothecary.surface]}
            style={styles.pillFace}
          >
            {/*
            The balance half, and it used to be dead.

            The whole pill opened the shop, on the argument that the plus is a
            20dp target inside a 94dp control and a player reaching for "more
            coins" aims at the pill. That was right while the number was only a
            readout. It stopped being right once the number was abbreviated:
            the shortened figure raises a question — *how many exactly* — and
            the pill is the only place that can answer it.

            So the halves now do the two different things a player wants from a
            balance. Tap the number to read it; tap the plus to change it.
          */}
            <Pressable
              style={styles.balance}
              onPress={toggleTip}
              accessibilityRole="button"
              accessibilityLabel={`${coins} coins`}
            >
              <Coin size={COIN_SIZE} />
              {/* Compact, because the pill is a fixed-width control in a row with
              the settings button: a five-figure balance pushed it into that
              button, and the two-day-old player who first sees 10,000 is
              exactly the one this breaks for. The full number is spoken to
              screen readers above — a shortened figure is a layout answer,
              not the value. */}
              <Text style={styles.value}>{compactCoins(coins)}</Text>
            </Pressable>

            <Pressable
              onPress={openShop}
              onPressIn={tap.onPressIn}
              onPressOut={tap.onPressOut}
              accessibilityRole="button"
              accessibilityLabel="Get more coins"
              // The disc is 20dp, under the 44dp both platforms ask for. The slop
              // takes it there without widening the pill, which is a declared
              // constant the header centers its title against.
              hitSlop={s(12)}
            >
              <Animated.View style={[styles.plus, tap.style]}>
                <LinearGradient colors={gradients.green} style={StyleSheet.absoluteFill} />
                {/*
                Over the face, under the glyph. A sheen passing *behind* the plus
                is a light behind the button rather than on it, and at 20dp the
                difference is the whole effect.

                It loops, which the README tells you not to do. The exemption is
                the size: this is a 20dp view, so the redraw is confined to 400
                square points of a screen, and five sixths of the cycle is the
                band parked outside the frame with nothing changing. Anything
                larger owes the usual argument.
              */}
                {/* Wrapped, because `LottieView` takes no `pointerEvents` of its
                  own — and it is a native view laid over the plus, so without
                  this it eats the press on the one part of the pill that looks
                  like a button. */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <LottieView
                    source={SHINE}
                    autoPlay
                    loop
                    resizeMode="cover"
                    style={StyleSheet.absoluteFill}
                  />
                </View>
                <Icon name="plus" size={s(14)} color={apothecary.ink} />
              </Animated.View>
            </Pressable>
          </LinearGradient>
        </View>
      </Animated.View>

      {/*
        Outside the pulsing wrapper, so a reward landing mid-note does not
        scale the text — and `pointerEvents="none"` because it hangs over the
        screen below and must not eat a tap meant for whatever is under it.
      */}
      {tip ? (
        <Animated.View
          style={styles.tipSlot}
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(160)}
          pointerEvents="none"
        >
          <View style={styles.tip}>
            {/*
              One line, at full size, every digit.

              `adjustsFontSizeToFit` was tried as a backstop and had to go: it
              needs a fixed width to measure against, and the box sized itself
              to the shrunken text while the text shrank to fit the box, so 13px
              collapsed to about 8 on a string that fits perfectly well.

              It fits because `tipSlot` is the screen less its margins — ~350dp
              on a small phone — and even a twenty-six character balance
              measures around 170 at this size. Nothing the game can pay comes
              close, so nothing is ever shortened.
            */}
            <Text style={styles.tipText} numberOfLines={1}>
              {`${groupedNumber(coins)} coins`}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
});
