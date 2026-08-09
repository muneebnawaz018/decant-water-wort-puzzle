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
import { claimToast } from './rewardTrack';
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
/**
 * The payout shower, for the doubled bonus.
 *
 * A second animation rather than replaying the confetti, because they say
 * different things: the confetti fired for *finishing the level*, and this
 * fires for *being paid*. The same burst twice reads as the first one
 * stuttering.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const COIN_SHOWER = require('../../assets/lottie/coins.json');

/**
 * How long the shower runs, taken from the file itself.
 *
 * `op` is its last frame and `fr` its frame rate, so this is the animation's
 * own length rather than a duration guessed to match it. Regenerate
 * `coins.json` longer and the screen waits longer with no edit here.
 */
const SHOWER_MS = (COIN_SHOWER.op / COIN_SHOWER.fr) * 1000;

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
  /** What this run has paid in total, counting the ad bonus if it was taken. */
  const paid = doubled ? reward * EARNINGS.adMultiplier : reward;

  const double = useCallback(() => {
    if (doubled || reward <= 0) return;
    setDoubled(true);
    // `- 1` because the run already paid one share. Doubling adds the
    // difference, not the whole amount again.
    useEconomyStore.getState().add(reward * (EARNINGS.adMultiplier - 1));

    /**
     * What the run is now worth, and what the player now has.
     *
     * It used to announce the *bonus* — "Doubled · +60" on a run that paid 60,
     * which reads as the run having earned 60 when it has earned 120. The
     * number that matters is what the level paid, not the arithmetic that got
     * there.
     *
     * And the balance with it, because a payout with no balance beside it sends
     * the player to check the coin pill — the same reason the undo toasts carry
     * one. Read after the credit, so it is the total they now hold.
     */
    const balance = useEconomyStore.getState().coins;
    overlay.toast(claimToast(reward * EARNINGS.adMultiplier, balance));

    /**
     * And the card is done — but not this instant.
     *
     * The offer is the last thing this screen has to say, so leaving is right:
     * the coins are paid, the balance is on screen, and what remains is a
     * receipt for a run the player has finished reading. Leaving it up means a
     * card whose only live control is now spent.
     *
     * The wait is the coin shower. Paying and closing in the same frame threw
     * the animation away before a single coin had drawn — the player pressed a
     * button that promised double and got a screen change. `SHOWER_MS` is the
     * animation's own length at its own frame rate, not a number picked to feel
     * right; if the file is regenerated longer, this follows it.
     *
     * The toast carries the numbers out regardless: the overlay is global and
     * outlives the screen that raised it.
     */
  }, [doubled, reward]);

  /**
   * The timer is owned by an effect, not by the handler that started it.
   *
   * A `setTimeout` left running past unmount calls `onHome` on a screen that is
   * gone — harmless here, and the kind of thing that stops being harmless the
   * moment the callback does more than navigate.
   */
  useEffect(() => {
    if (!doubled) return;
    const done = setTimeout(onHome, SHOWER_MS);
    return () => clearTimeout(done);
  }, [doubled, onHome]);

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
          {paid > 0 ? (
            <Animated.View
              style={styles.reward}
              entering={FadeIn.duration(500).delay(rewardDelay)}
            >
              <View style={styles.coin} />
              {/* The doubled figure once it has been taken. The card is a
                  receipt for the run, and after the offer the run paid twice
                  what the level's stars are worth — leaving the original there
                  would have the card and the coin pill disagreeing. */}
              <Text style={styles.rewardText}>+{paid}</Text>
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
              Doubling the payout, in the slot Home used to hold.

              Home was the third way to reach a screen the nav bar already
              carries — the bar shows on this screen — so it spent the win
              moment on navigation the player has two other routes to. What
              belongs here is the offer, and this is the moment for it: the
              coins have just landed and the number is still on screen.

              Ghost, not primary. It was gold, and gold directly under the gold
              `Level N` button gave the card two things claiming to be the main
              action — the eye had nowhere to land, and the offer competed with
              the button that carries the game forward. It sits in the
              secondary row and should look like the rest of it.

              Disabled when the run paid nothing, which happens on a replay that
              did not beat its own best. It stays in place rather than swapping
              back to Home: a button that changes identity between two visits to
              the same screen is worse than one that is plainly unavailable, and
              the label already says what there is to double.

              It reports `Doubled` afterwards rather than staying `Make it 2X`
              while dimmed. A disabled button whose words still offer something
              reads as broken; one that says what happened is a receipt.
            */}
            <GlossButton
              label={doubled ? 'Doubled' : `Make it ${EARNINGS.adMultiplier}X`}
              variant="ghost"
              size="dialog"
              trailing={
                <Icon
                  name={doubled ? 'check' : 'video'}
                  size={s(15)}
                  color={apothecary.goldLight}
                />
              }
              onPress={double}
              disabled={doubled || reward <= 0}
              style={styles.secondaryButton}
            />
          </Animated.View>
        </Panel>
      </Animated.View>

      {/*
        The Lottie burst plays *over* the card, once.

        It used to sit behind it, and behind is where a full-screen burst is
        least visible: the card covers the middle of the screen, which is
        exactly where the confetti comes from, so what showed was the fringe
        around the edges. The same mistake the reward dialog made — see
        `Overlays.styles.ts`, where the celebration layer had to be lifted over
        the modal's scrim for the same reason.

        `loop={false}` is the rule for every animation in this folder: a looping
        Lottie on a mounted screen redraws forever, which is the cost this
        project already paid once on Home's rack.

        `pointerEvents` is what makes drawing over the card safe, and it goes on
        the wrapper because `LottieView` does not take it. Without it this layer
        covers the buttons and the card cannot be pressed at all.

        Last in the tree rather than given a `zIndex`. Neither this nor the card
        carries one, so paint order alone decides — and an explicit `zIndex`
        here would be a number to keep in step with a card that has none.
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

      {/* The payout shower, mounted only once the bonus is taken.
          Conditionally rather than always-mounted-and-paused: a `LottieView` is
          a native view whether or not it is playing, and this one is never seen
          on the runs where the offer is declined. */}
      {doubled ? (
        <View style={styles.lottie} pointerEvents="none">
          <LottieView
            source={COIN_SHOWER}
            autoPlay
            loop={false}
            resizeMode="cover"
            style={styles.fill}
          />
        </View>
      ) : null}
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
