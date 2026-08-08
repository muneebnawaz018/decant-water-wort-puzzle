import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { syncReminders } from '@/notifications/dailyReminder';
import { DAILY_REWARDS, useEconomyStore } from '@/state/economyStore';
import { overlay, useOverlayStore } from '@/state/overlayStore';
import { colours, gradients, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { countdown, percentWidth, plural } from '@/utils';
import { ClaimButton } from './chrome/ClaimButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SettingGroup, SettingRow } from './chrome/SettingRow';
import { useBonusTimer } from './hooks/useBonusTimer';
import { useClaimTimer } from './hooks/useClaimTimer';
import { useTapBurst } from './hooks/useTapBurst';
import { useTapHandler } from './hooks/useTapHandler';
import { useTapScale } from './hooks/useTapScale';
import { Icon } from './Icon';
import { claimToast, dayState, offerMessage } from './rewardTrack';
import { COIN_SIZE, FLAME_SIZE, styles, TODAY_TINT } from './styles/DailyScreen.styles';
import { EARNINGS } from '@/game/economy';

/**
 * What the week builds to, for the streak card's sentence.
 *
 * The split that used to live here — six days and a finale — went with the
 * grand row. The grid renders `DAILY_REWARDS` whole now, so there is nothing
 * left for the two halves to disagree about.
 */
const FINALE = DAILY_REWARDS[DAILY_REWARDS.length - 1]!;

/** What the bonus puzzle pays. Flat — see `economy.ts` for why. */
const BONUS_REWARD = EARNINGS.bonusPuzzle;

/**
 * The streak card's second line.
 *
 * Deliberately not the countdown. The card used to print "Next reward in
 * 19:44:04" and the claim button below it printed the same clock 90dp away —
 * the button is the one that has to explain itself, so the card says the thing
 * the button cannot: what the streak is being kept for.
 */
function streakDetail(claimsLeft: number): string {
  if (claimsLeft <= 0) return 'Week complete — the track restarts';
  return `${plural(claimsLeft, 'day')} to the ${FINALE}-coin reward`;
}

interface DailyScreenProps {
  onPlayBonus: () => void;
}

/** The seven-day reward track, spec §4.6. */
export const DailyScreen = memo(function DailyScreen({ onPlayBonus }: DailyScreenProps) {
  const streak = useEconomyStore((state) => state.streak);
  const { reward, remaining, dayIndex } = useClaimTimer();
  const waiting = reward === null;

  // The tile the track is sitting on. While the timer runs that is the one
  // just claimed, not the one coming next.
  const currentIndex = waiting
    ? (streak - 1 + DAILY_REWARDS.length) % DAILY_REWARDS.length
    : dayIndex;

  // Claims still to come before the week's biggest reward, today's included
  // when there is one to make. The tile the track sits on is already claimed
  // while the timer runs, which is the `waiting` term.
  const claimsLeft = DAILY_REWARDS.length - currentIndex - (waiting ? 1 : 0);
  const claimed = DAILY_REWARDS.length - claimsLeft;

  const claim = useCallback(() => {
    // Still counting down: nothing to offer, so no dialog. The press answers
    // itself through the tile's own bounce and tick, and that is the whole
    // response — a dialog offering coins it will not pay would be a lie.
    if (waiting) return;

    /*
      The dialog is the offer; Collect is the payment.

      `claimDaily` runs inside `onConfirm`, not here. Opened *after* paying,
      the dialog was a receipt with one button that merely dismissed it — and
      the celebration marked the dismissal, the least interesting press on the
      screen. This way the sequence is the one the words promise: read what day
      it is and what it pays, press Collect, the coins move, and the burst
      lands on the moment they do.
    */
    overlay.modal({
      // The day lives in the body now, where the sentence carries it.
      title: 'Daily reward',
      body: offerMessage(currentIndex, DAILY_REWARDS),
      confirmLabel: 'Collect',
      // No cancel — the scrim already dismisses, and "decline my coins" is not
      // a choice worth a button. The left slot carries the doubling offer
      // instead, which is a real second answer to the same question.
      //
      // "Make it 2X" rather than "Watch ad · 2X". The pair splits the card
      // between them, so each button has about 110dp — and the longer wording
      // wrapped to two lines there, which made the offer taller than the
      // Collect beside it. It also says what the player *gets*; the ad is the
      // price, and a button is better named for its outcome.
      cancelLabel: null,
      secondaryLabel: `Make it ${EARNINGS.adMultiplier}X`,
      // The host leaves the card up; the burst plays over it and its finish
      // closes it. Tied to the animation rather than a timeout, so the artwork
      // can change length without a second number drifting out of step.
      stayOpen: true,
      onConfirm: () => {
        // Collect can be pressed again while the burst runs — the card is
        // still up. The coins moved on the first press; a second is a no-op
        // rather than a double-pay or a stuttering replay.
        if (useOverlayStore.getState().celebration) return;

        useEconomyStore.getState().claimDaily(Date.now());
        // The reminder is anchored to the claim, so a new claim moves it.
        // Fire and forget: nothing on screen waits for the OS.
        void syncReminders();

        // Read the balance *after* paying, so the toast quotes the number the
        // coin pill now shows rather than one derived from the reward.
        const balance = useEconomyStore.getState().coins;

        overlay.celebrate(() => {
          overlay.closeModal();
          // Raised on the burst's finish, not with it. The celebration layer is
          // full-screen and drawn above the toast, so a toast shown at the same
          // moment spends its whole life behind confetti.
          overlay.toast(claimToast(DAILY_REWARDS[currentIndex]!, balance));
        });
      },
      /**
       * Double it — doc §8's highest-value rewarded slot.
       *
       * **The ad is not wired, and this pays anyway.** Spec §10 puts the SDK in
       * phase 2; until it lands the choice is between a button that opens an
       * offer and does nothing, and one that is generous early. The second
       * keeps the whole flow — offer, payment, burst, toast, dismissal —
       * exercisable now rather than after the SDK.
       *
       * When the SDK arrives this becomes: show the ad, pay the bonus from its
       * completion callback. `claimDaily` stays where it is regardless — the
       * base reward is owed either way, and an ad that fails to load or is
       * skipped must not cost the player their daily claim.
       */
      onSecondary: () => {
        if (useOverlayStore.getState().celebration) return;

        // Read from what the claim returned rather than from the table, so the
        // two cannot disagree about which day was paid. `- 1` because the
        // claim already paid one share: doubling means adding the difference,
        // not the whole amount again.
        const paid = useEconomyStore.getState().claimDaily(Date.now());
        useEconomyStore.getState().add(paid * (EARNINGS.adMultiplier - 1));
        void syncReminders();

        const balance = useEconomyStore.getState().coins;

        overlay.celebrate(() => {
          overlay.closeModal();
          overlay.toast(claimToast(paid * EARNINGS.adMultiplier, balance));
        });
      },
    });
  }, [currentIndex, waiting]);

  return (
    <ScrollPage title="Rewards">
      <Panel contentStyle={styles.streak}>
        <StreakFlame />
        <View style={styles.streakText}>
          <Text style={styles.streakTitle}>
            {streak === 1 ? '1-day streak' : `${streak}-day streak`}
          </Text>
          <View style={styles.streakBar}>
            <LinearGradient
              colors={gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.streakBarFill,
                { width: percentWidth(claimed, DAILY_REWARDS.length) },
              ]}
            />
          </View>
          <Text style={styles.streakDetail}>{streakDetail(claimsLeft)}</Text>
        </View>
      </Panel>

      <Text style={styles.label}>7-day rewards</Text>

      {/*
        All seven days in one grid, and the claim control in the space day
        seven leaves behind.

        Day seven used to sit outside the track in a full-width card, on the
        argument that the reward it pays is ten times day one and a square tile
        says otherwise. What that actually produced was a week the player could
        not read as a week: six tiles, then a different-shaped card, then a
        third full-width bar for the timer — three blocks for one idea, and the
        "DAY 7" tile everyone was looking for was missing from the row of days.

        Seven into three leaves one tile on the last row and two slots spare,
        which is exactly where the claim control belongs: it is what the seventh
        row is *for*, and it costs the page a block rather than adding one.

        The grand reward still reads as grand — the tile names 150 against
        neighbours paying 10 to 75, and the number is the part that says so.
      */}
      <View style={styles.track}>
        {DAILY_REWARDS.map((amount, index) => (
          <DayTile
            key={index}
            day={index + 1}
            amount={amount}
            state={dayState(index, currentIndex, waiting)}
            onClaim={waiting ? undefined : claim}
          />
        ))}

        <View style={styles.claimSlot}>
          <ClaimButton
            label={waiting ? countdown(remaining) : `Claim ${reward} coins`}
            caption={waiting ? 'Next in' : undefined}
            onPress={claim}
            waiting={waiting}
            fill
          />
        </View>
      </View>

      <View style={styles.spacer} />

      <SettingGroup title="Bonus">
        <BonusRow onPlay={onPlayBonus} />
      </SettingGroup>
    </ScrollPage>
  );
});

/**
 * Today's bonus puzzle.
 *
 * The row used to open whatever level `gameStore` was holding — a player on
 * stage 3 pressed it and got stage 3, paying the same coins for the same board
 * a second time. It now has its own board, its own seed and its own reward; see
 * `game/dailyPuzzle.ts`.
 *
 * Two states and no third. Open, and it says what it pays. Played, and it
 * counts down with **no `onPress` at all** rather than a greyed one — a
 * `Pressable` that is simply absent cannot be tapped, cannot buzz, and drops
 * the trailing chevron on its own, so nothing has to remember to turn three
 * things off together.
 */
const BonusRow = memo(function BonusRow({ onPlay }: { onPlay: () => void }) {
  const { available, remaining } = useBonusTimer();

  return (
    <SettingRow
      icon="book"
      label={available ? "Today's brew — bonus puzzle" : 'Today\u2019s brew — played'}
      divider={false}
      onPress={available ? onPlay : undefined}
      spent={!available}
    >
      <Text style={available ? styles.bonusReward : styles.bonusWait}>
        {available ? `+${BONUS_REWARD}` : countdown(remaining)}
      </Text>
    </SettingRow>
  );
});

/**
 * The coin disc, lit from the upper left. Used at two sizes.
 *
 * The mockup's is a radial gradient — bright at 34%/30%, gold by 62%, bronze at
 * the rim — and `expo-linear-gradient` has no radial mode. A linear ramp on its
 * own was what shipped, and at 28dp it read as a flat brown disc: a straight
 * ramp spends the bottom third of a small circle in the darkest stop, so the
 * shape is more rim than coin.
 *
 * Faked in two layers instead of reaching for Skia, which would mean a native
 * surface per coin and there are seven on this screen. A diagonal ramp does the
 * body, and a soft highlight sits where the radial's hot spot would be. What
 * makes it read as round is the specular, not the ramp — the ramp only has to
 * get darker towards the far edge.
 */
const CoinFace = memo(function CoinFace() {
  return (
    <>
      <LinearGradient
        colors={gradients.coin}
        locations={[0, 0.55, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.coinSpecular} />
    </>
  );
});

/**
 * The streak's flame.
 *
 * A drawn glyph, breathing — not a simulation. A procedural fire was built for
 * this slot and thrown away: at 30dp the noise that makes it look like burning
 * is smaller than a pixel, so it reads as a flickering smudge, and realism is
 * the wrong target anyway. Spec §9's rule for this app is cartoon — flat fills,
 * bold outlines — and a photoreal fire beside seven flat tiles looks like it
 * wandered in from another game.
 *
 * Two loops at unrelated periods (1400ms and 2200ms). One period and they peak
 * together every cycle, which reads as a throb; left to drift they never quite
 * repeat, so the motion stays alive without ever calling attention to itself.
 * Both are slow on purpose: this sits beside text the player is reading.
 *
 * `transformOrigin` pins the pivot at the base. Scaled about its centre the
 * flame grows downward too, which nothing burning does — it is anchored at its
 * fuel.
 */
const StreakFlame = memo(function StreakFlame() {
  const lick = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    const breathe = (value: typeof lick, period: number): void => {
      value.value = withRepeat(
        withSequence(
          withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: period, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    };

    breathe(lick, 1400);
    breathe(glow, 2200);

    return () => {
      cancelAnimation(lick);
      cancelAnimation(glow);
    };
  }, [lick, glow]);

  // Taller and narrower together, so the flame keeps its volume as it licks up.
  // Growing in both directions at once is a balloon.
  const flame = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + lick.value * 0.1 }, { scaleX: 1 - lick.value * 0.05 }],
  }));

  const halo = useAnimatedStyle(() => ({
    opacity: 0.35 + glow.value * 0.35,
    transform: [{ scale: 0.92 + glow.value * 0.16 }],
  }));

  return (
    <View style={styles.flame}>
      <Animated.View style={[styles.flameHalo, halo]} />
      <Animated.View style={[styles.flameGlyph, flame]}>
        <Icon name="flame" size={FLAME_SIZE} color={colours.mango} />
      </Animated.View>
    </View>
  );
});

const DayTile = memo(function DayTile({
  day,
  amount,
  state,
  onClaim,
}: {
  day: number;
  amount: number;
  state: 'claimed' | 'today' | 'future';
  /**
   * Claims the day, when there is one to claim.
   *
   * Only ever passed to today's tile, and only while the reward is actually
   * waiting to be taken — a tile that cannot pay must not answer a press.
   */
  onClaim?: () => void;
}) {
  const claimable = state === 'today' && onClaim !== undefined;

  const tile = (
    <>
      <Panel
        contentStyle={[
          styles.day,
          state === 'claimed' && styles.dayClaimed,
          state === 'future' && styles.dayFuture,
          state === 'today' && styles.dayToday,
        ]}
        tint={state === 'today' ? TODAY_TINT : undefined}
      >
        <Text style={[styles.dayNumber, state === 'today' && styles.dayNumberToday]}>
          DAY {day}
        </Text>
        <View style={[styles.dayCoin, { width: COIN_SIZE, height: COIN_SIZE }]}>
          <CoinFace />
        </View>
        <Text style={styles.dayAmount}>{amount}</Text>
      </Panel>

      {state === 'claimed' ? (
        <View style={styles.check}>
          <Icon name="check" size={s(11)} color={ui.onAccent} />
        </View>
      ) : null}
    </>
  );

  if (!claimable) return <View style={styles.daySlot}>{tile}</View>;

  // No `daySlot` wrapper here: `ClaimTile`'s own `Pressable` is the row child
  // and carries the slot width. Nested, `daySlot`'s `flexBasis` would be read
  // down the Pressable's column axis and become a *height*.
  return <ClaimTile onClaim={onClaim}>{tile}</ClaimTile>;
});

/**
 * Today's tile, as a second way to take the reward.
 *
 * The Claim button below is the one that says what you get, and it stays. This
 * exists because the tile is the thing a player is already looking at — it is
 * ringed gold, it names the amount, and until now pressing it did nothing,
 * which reads as a dead control rather than as a label.
 *
 * The press scale and the burst are the same pair every button in this app
 * uses, so the tile answers a tap exactly like a button does. It has to: a
 * surface that pays coins and responds with nothing is indistinguishable from
 * one that failed.
 *
 * Wrapped around the slot rather than built into `Panel`, so the burst clips to
 * the card and the six tiles that are *not* claimable stay plain views with no
 * Lottie player behind them — there is one player per mounted `useTapBurst`,
 * and six idle ones on a screen is six native views for nothing.
 */
const ClaimTile = memo(function ClaimTile({
  onClaim,
  children,
}: {
  onClaim: () => void;
  children: ReactNode;
}) {
  const handlePress = useTapHandler(onClaim);
  const bounce = useTapScale();
  // Gold rings would vanish into the tile's gold ring and its lit surface.
  const burst = useTapBurst('light');

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        bounce.onPressIn();
        burst.fire();
      }}
      onPressOut={bounce.onPressOut}
      accessibilityRole="button"
      accessibilityLabel="Claim today's reward"
      style={styles.claimTile}
    >
      <Animated.View style={[styles.claimTileFace, bounce.style]}>
        {children}
        {burst.node}
      </Animated.View>
    </Pressable>
  );
});
