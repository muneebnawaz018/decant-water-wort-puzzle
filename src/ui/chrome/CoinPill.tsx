import { LinearGradient } from 'expo-linear-gradient';
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
import { styles } from './styles/CoinPill.styles';

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
            <View style={styles.coin}>
              <LinearGradient
                colors={gradients.coin}
                locations={[0, 0.62, 1]}
                start={{ x: 0.34, y: 0.3 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
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
              <Icon name="plus" size={s(14)} color={apothecary.ink} />
            </Animated.View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
});
