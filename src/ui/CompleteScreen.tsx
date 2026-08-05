import { memo, useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { coinsFor } from '@/game/stars';
import { useGameStore } from '@/state/gameStore';
import { apothecary } from '@/theme/apothecary';
import { alpha, colours } from '@/theme/colors';
import { fract, plural } from '@/utils';
import { GlossButton } from './chrome/GlossButton';
import { Panel } from './chrome/Panel';
import { ChromeIconButton } from './chrome/ScreenHeader';
import { useScreenPadding } from './hooks/useScreenPadding';
import { Icon } from './Icon';
import { styles } from './styles/CompleteScreen.styles';

interface CompleteScreenProps {
  onHome: () => void;
  onReplay: () => void;
  onNext: () => void;
}

/** Spec §6: stars pop in ~230ms apart, reward after them. */
const STAR_DELAY = 230;
const STAR_START = 300;

/** Spec §6: ~28 particles radiate outward on a win. */
const CONFETTI_COUNT = 28;
const CONFETTI_COLOURS = [
  colours.coral,
  colours.mango,
  colours.tangerine,
  colours.lime,
  colours.aqua,
  colours.blueberry,
  colours.plum,
  colours.rose,
];

export const CompleteScreen = memo(function CompleteScreen({
  onHome,
  onReplay,
  onNext,
}: CompleteScreenProps) {
  const padding = useScreenPadding();
  const level = useGameStore((state) => state.level);
  const moves = useGameStore((state) => state.history.length);
  const par = useGameStore((state) => state.par);
  const stars = useGameStore((state) => state.earned);

  const reward = coinsFor(stars);
  const rewardDelay = STAR_START + stars * STAR_DELAY + 150;

  return (
    <View style={[styles.root, padding.frame]}>
      <Confetti />

      <View style={styles.homeButton}>
        <ChromeIconButton icon="home" onPress={onHome} label="Home" />
      </View>

      <View style={styles.content}>
        <ShimmerTitle />

        <View style={styles.stars}>
          {[0, 1, 2].map((index) => (
            <CompleteStar key={index} index={index} earned={index < stars} />
          ))}
        </View>

        <Animated.Text style={styles.moves} entering={FadeIn.duration(600).delay(900)}>
          Solved in {plural(moves, 'move')} · par {par}
        </Animated.Text>

        <Animated.View entering={FadeIn.duration(500).delay(rewardDelay)}>
          <Panel contentStyle={styles.reward} radius={16}>
            <View style={styles.coin} />
            <Text style={styles.rewardText}>+{reward}</Text>
          </Panel>
        </Animated.View>

        <Animated.View
          style={styles.buttons}
          entering={FadeIn.duration(600).delay(rewardDelay + 250)}
        >
          <GlossButton label="Replay" onPress={onReplay} style={styles.button} />
          <GlossButton
            label={`Level ${level + 1}`}
            variant="primary"
            onPress={onNext}
            style={styles.button}
          />
        </Animated.View>
      </View>
    </View>
  );
});

/**
 * The gold title, shimmering (spec §6, 2.6s loop).
 *
 * A moving gradient across the glyphs would need Skia text; at this size a
 * brightness pulse reads the same and costs one shared value.
 */
const ShimmerTitle = memo(function ShimmerTitle() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withDelay(
      800,
      withTiming(1, { duration: 2600, easing: Easing.linear })
    );
    return () => cancelAnimation(shimmer);
  }, [shimmer]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.85 + Math.sin(shimmer.value * Math.PI * 4) * 0.15,
  }));

  return (
    <Animated.View entering={FadeIn.duration(700).delay(100)}>
      <Animated.Text style={[styles.title, style]}>Beautifully sorted</Animated.Text>
    </Animated.View>
  );
});

const CompleteStar = memo(function CompleteStar({
  index,
  earned,
}: {
  index: number;
  earned: boolean;
}) {
  const pop = useSharedValue(0);

  useEffect(() => {
    if (!earned) return;
    pop.value = withDelay(
      STAR_START + index * STAR_DELAY,
      withSpring(1, { damping: 9, stiffness: 150 })
    );
    return () => cancelAnimation(pop);
  }, [pop, index, earned]);

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      { scale: 0.2 + pop.value * 0.8 },
      { rotate: `${(1 - pop.value) * -40}deg` },
    ],
  }));

  if (!earned) {
    return (
      <View style={styles.starSlot}>
        <Icon name="star" size={46} color={alpha('white', 0.14)} filled />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.starSlot, style]}>
      <Icon name="star" size={46} color={apothecary.gold} filled />
    </Animated.View>
  );
});

/**
 * The burst. Each particle is a plain view driven by one shared value on the
 * UI thread; they animate once and stop rather than looping.
 */
const Confetti = memo(function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        // Deterministic, so the burst is the same every win — and so it never
        // re-rolls on a re-render mid-flight.
        const a = fract(Math.sin(i * 12.9898) * 43758.5453);
        const b = fract(Math.sin(i * 78.233) * 43758.5453);
        return {
          angle: a * Math.PI * 2,
          distance: 90 + b * 170,
          colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]!,
          delay: i * 12,
        };
      }),
    []
  );

  return (
    <View style={styles.burst} pointerEvents="none">
      {particles.map((particle, index) => (
        <Spark key={index} {...particle} />
      ))}
    </View>
  );
});

const Spark = memo(function Spark({
  angle,
  distance,
  colour,
  delay,
}: {
  angle: number;
  distance: number;
  colour: string;
  delay: number;
}) {
  const flight = useSharedValue(0);

  useEffect(() => {
    flight.value = withDelay(
      delay,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
    );
    return () => cancelAnimation(flight);
  }, [flight, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - flight.value,
    transform: [
      { translateX: Math.cos(angle) * distance * flight.value },
      { translateY: Math.sin(angle) * distance * flight.value },
      { scale: 1 - flight.value * 0.8 },
    ],
  }));

  return <Animated.View style={[styles.spark, { backgroundColor: colour }, style]} />;
});
