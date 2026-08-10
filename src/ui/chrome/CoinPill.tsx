import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
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
import { compactCoins } from '@/utils';
import { useTapHandler } from '../hooks/useTapHandler';
import { useTapScale } from '../hooks/useTapScale';
import { Icon } from '../Icon';
import { Coin } from './Coin';
import { COIN_SIZE, styles } from './styles/CoinPill.styles';

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

  return (
    <Animated.View style={animated}>
      {/*
        The whole pill opens the shop, not only the plus.

        The plus is the affordance — it says what a tap does — but it is a 20dp
        target inside a 94dp control, and a player reaching for "more coins"
        aims at the pill. Making the balance dead meant most of that reach
        landed on nothing.
      */}
      <Pressable
        onPress={openShop}
        onPressIn={tap.onPressIn}
        onPressOut={tap.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${coins} coins. Get more`}
      >
        <View style={styles.pill}>
          <LinearGradient
            colors={[apothecary.surfaceTop, apothecary.surface]}
            style={styles.pillFace}
          >
            <Coin size={COIN_SIZE} />
            {/* Compact, because the pill is a fixed-width control in a row with
              the settings button: a five-figure balance pushed it into that
              button, and the two-day-old player who first sees 10,000 is
              exactly the one this breaks for. The full number is spoken to
              screen readers above — a shortened figure is a layout answer,
              not the value. */}
            <Text style={styles.value}>{compactCoins(coins)}</Text>

            {/* The affordance, no longer the target. It still springs on press,
                because the thing that says "tap me" is the thing that should
                answer — wherever on the pill the tap actually landed. */}
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
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
});
