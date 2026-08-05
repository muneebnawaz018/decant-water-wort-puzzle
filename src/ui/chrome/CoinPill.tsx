import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useEconomyStore } from '@/state/economyStore';
import { apothecary } from '@/theme/apothecary';
import { gradients } from '@/theme/colors';
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

  return (
    <Animated.View style={animated}>
      <LinearGradient
        colors={[apothecary.surfaceTop, apothecary.surface]}
        style={styles.pill}
      >
        <View style={styles.coin}>
          <LinearGradient
            colors={gradients.coin}
            locations={[0, 0.62, 1]}
            start={{ x: 0.34, y: 0.3 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <Text style={styles.value}>{coins}</Text>
      </LinearGradient>
    </Animated.View>
  );
});
