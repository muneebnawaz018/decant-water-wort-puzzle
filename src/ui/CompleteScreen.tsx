import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EARNINGS } from '@/game/economy';
import { useEconomyStore } from '@/state/economyStore';
import { useGameStore } from '@/state/gameStore';
import { overlay } from '@/state/overlayStore';
import { apothecary } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { fract, plural } from '@/utils';
import LottieView from 'lottie-react-native';

import { GlossButton } from './chrome/GlossButton';
import { Panel } from './chrome/Panel';
import { useScreenPadding } from './hooks/useScreenPadding';
import { Icon } from './Icon';
import { styles } from './styles/CompleteScreen.styles';

interface CompleteScreenProps {
  onHome: () => void;
  onReplay: () => void;
  onNext: () => void;
}

/**
 * The win burst.
 *
 * Required at module scope rather than inline, so Metro resolves it once and
 * the same parsed source is handed to every mount of this screen.
 *
 * `assets/lottie/win.json` is a placeholder — three gold dots. Replace the file
 * and nothing here changes; see the README beside it for what to check on a
 * downloaded animation before it ships.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WIN_BURST = require('../../assets/lottie/win.json');

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
  const bonus = useGameStore((state) => state.bonus);
  const moves = useGameStore((state) => state.history.length);
  const stars = useGameStore((state) => state.earned);
  // What the run actually paid, not what its stars are worth: a replay that
  // matches a previous result earns three stars and no coins, and announcing
  // a payout that never landed is worse than announcing none.
  const reward = useGameStore((state) => state.earnedCoins);
  const rewardDelay = STAR_START + stars * STAR_DELAY + 150;

  /**
   * Whether the ad bonus has been taken for this run.
   *
   * Local state rather than a store field, and that is the right scope: the
   * offer belongs to the card that is on screen. Leaving the screen ends the
   * run, and the next one arrives with a fresh card and a fresh offer.
   *
   * The button is disabled afterwards rather than hidden. A control that
   * vanishes under the finger moves everything beside it, and this row is two
   * buttons wide.
   */
  const [doubled, setDoubled] = useState(false);

  /**
   * Pay the bonus. **The ad is not wired** — spec §10 puts the SDK in phase 2,
   * so this pays outright rather than refusing, the same trade the daily
   * reward's offer makes.
   *
   * When the SDK lands: show the ad, and move this into its completion
   * callback. Nothing else has to change — the coins are already paid
   * separately from the level's own payout, so a failed or skipped ad simply
   * leaves the run's earnings as they were.
   */
  const double = useCallback(() => {
    if (doubled || reward <= 0) return;
    setDoubled(true);
    // `- 1` because the run already paid one share. Doubling adds the
    // difference, not the whole amount again.
    useEconomyStore.getState().add(reward * (EARNINGS.adMultiplier - 1));
    overlay.toast(`Doubled · +${reward * (EARNINGS.adMultiplier - 1)} coins`);
  }, [doubled, reward]);

  return (
    <View style={[styles.root, padding.frame]}>
      {/*
        The scrim is what makes this read as a result rather than as somewhere
        new. It darkens the ground the card sits on, so the card is lit and
        everything else recedes.

        Note what is behind it: the backdrop, not the board. Screens mount one
        at a time here (see `Root`), so the solved position is already gone by
        the time this draws. Keeping the board alive underneath would mean
        stacking two screens and holding its Skia surface for the length of a
        win animation, which is the cost the one-at-a-time rule exists to
        avoid.
      */}
      <Animated.View
        style={[styles.scrim, { backgroundColor: ui.scrim }]}
        entering={FadeIn.duration(260)}
        pointerEvents="none"
      />

      {/*
        The Lottie burst plays behind the card, once.

        `loop={false}` is the rule for every animation in this folder: a looping
        Lottie on a mounted screen redraws forever, which is the cost this
        project already paid once on Home's rack.

        The wrapper carries `pointerEvents`, because `LottieView` does not take
        it — and it covers the card, so without it the buttons underneath are
        unreachable.
      */}
      <View style={styles.lottie} pointerEvents="none">
        <LottieView
          source={WIN_BURST}
          autoPlay
          loop={false}
          resizeMode="cover"
          style={styles.fill}
        />
      </View>

      {/*
        The hand-rolled burst stays for now, on top of the Lottie.

        `win.json` is a placeholder and the sparks are not — dropping them today
        would trade a finished effect for three gold dots. Delete `Confetti`,
        `Spark` and their constants once a real animation is in place; two
        bursts is one too many.
      */}
      <Confetti />

      <Animated.View
        style={styles.cardSlot}
        entering={ZoomIn.springify().damping(14).mass(0.6)}
      >
        <Panel contentStyle={styles.card}>
          <View style={styles.stars}>
            {[0, 1, 2].map((index) => (
              <CompleteStar key={index} index={index} earned={index < stars} />
            ))}
          </View>

          <ShimmerTitle />

          <Text style={styles.moves}>
            {/* Par drives the rating but is not shown. It is golf jargon, and a
                number the player cannot verify reads as a score they failed to
                hit rather than one they beat — the stars already say how it
                went. */}
            Solved in {plural(moves, 'move')}
          </Text>

          {/* Nothing at all when a replay matched a result already paid for.
              "+0" is worse than silence: it draws the eye to a reward, then
              says the run was worth none. The stars above already say how it
              went, and they are the honest part. */}
          {reward > 0 ? (
            <Animated.View
              style={styles.reward}
              entering={FadeIn.duration(500).delay(rewardDelay)}
            >
              <View style={styles.coin} />
              <Text style={styles.rewardText}>+{reward}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.divider} />

          <Animated.View
            style={styles.next}
            entering={FadeIn.duration(500).delay(rewardDelay + 200)}
          >
            {/*
              The bonus puzzle has no next level, and "Level 20676" is what
              `level + 1` prints there — the day index plus one. It is also
              once a day, so there is nothing to advance *to*; the button goes
              home instead, which is where the player was headed anyway.
            */}
            <GlossButton
              label={bonus ? 'Done' : `Level ${level + 1}`}
              variant="primary"
              size="dialog"
              trailing={
                <Icon name={bonus ? 'check' : 'play'} size={s(15)} color={ui.onGold} />
              }
              onPress={bonus ? onHome : onNext}
            />
          </Animated.View>

          <Animated.View
            style={styles.secondary}
            entering={FadeIn.duration(500).delay(rewardDelay + 320)}
          >
            {/* "Again", not "Replay" — one word, and it says what the button
                does without borrowing a media-player verb. */}
            <GlossButton
              label="Again"
              variant="ghost"
              size="dialog"
              trailing={<Icon name="restart" size={s(15)} color={apothecary.goldLight} />}
              onPress={onReplay}
              style={styles.secondaryButton}
            />
            {/*
              Doubling the payout, where Home used to be.

              Home was the third way to reach a screen the nav bar already
              carries — the bar shows on this screen — so the slot was spending
              the win moment on navigation the player has two other routes to.
              What belongs here is the offer, and this is the moment for it:
              the coins have just landed and the number is still on screen.

              Named for the outcome rather than the price — "Make it 2X", not
              "Watch ad". It shares a row with Again, so each button gets about
              half the card, and the longer wording wrapped to two lines and
              left the pair at different heights.

              Only when there is something to double. A replay that matched a
              previous result pays nothing, and "2X of nothing" is a button
              that takes a press and changes no number.
            */}
            {reward > 0 ? (
              <GlossButton
                label={`Make it ${EARNINGS.adMultiplier}X`}
                variant="primary"
                size="dialog"
                trailing={<Icon name="video" size={s(15)} color={ui.onGold} />}
                onPress={double}
                disabled={doubled}
                style={styles.secondaryButton}
              />
            ) : (
              <GlossButton
                label="Home"
                variant="ghost"
                size="dialog"
                trailing={<Icon name="home" size={s(15)} color={apothecary.goldLight} />}
                onPress={onHome}
                style={styles.secondaryButton}
              />
            )}
          </Animated.View>
        </Panel>
      </Animated.View>
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
      <View style={[styles.starSlot, index === 1 && styles.starMiddle]}>
        <Icon name="star" size={s(54)} color={ui.ghostStar} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.starSlot, index === 1 && styles.starMiddle, style]}>
      <Icon name="star" size={s(54)} color={apothecary.gold} />
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
