import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { showRewarded } from '@/ads/rewarded';
import { standingFor, type StreakStanding } from '@/game/streak';
import { syncReminders } from '@/notifications/dailyReminder';
import { DAILY_REWARDS, useEconomyStore } from '@/state/economyStore';
import { overlay, useOverlayStore } from '@/state/overlayStore';
import { colors, gradients, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { countdown, percentWidth, plural } from '@/utils';
import { ClaimButton } from './chrome/ClaimButton';
import { Coin } from './chrome/Coin';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SettingGroup, SettingRow } from './chrome/SettingRow';
import { useBonusTimer } from './hooks/useBonusTimer';
import { useClaimTimer } from './hooks/useClaimTimer';
import { useTapBurst } from './hooks/useTapBurst';
import { useTapHandler } from './hooks/useTapHandler';
import { useTapScale } from './hooks/useTapScale';
import { Icon } from './Icon';
import { claimToast, dayState, nextRewardIndex, offerMessage } from './rewardTrack';
import { COIN_SIZE, FLAME_SIZE, styles, TODAY_TINT } from './DailyScreen.styles';
import { EARNINGS } from '@/game/economy';

/**
 * The most the bonus puzzle can pay — three stars' worth.
 *
 * The row advertises the ceiling rather than a flat figure, because the payout
 * is per star now (see `economy.ts`). "Up to" is doing real work: a one-star
 * finish pays a third of it, and a row promising 120 for any completion would
 * be the kind of small lie a player notices exactly once.
 */
const BONUS_MAX = EARNINGS.bonusPuzzlePerStar * 3;

/**
 * The streak card's second line.
 *
 * Deliberately not the countdown. The card used to print "Next reward in
 * 19:44:04" and the claim button below it printed the same clock 90dp away —
 * the button is the one that has to explain itself, so the card says the thing
 * the button cannot: what the streak is being kept for.
 */
function streakDetail(standing: StreakStanding, lapseIn: number): string {
  /*
    The deadline wins the line whenever there is one.

    **It is the reward track's deadline, not the streak's** — hence "your
    place", which is where the player sits on the seven-day payout. Missing a
    collection drops them to day one and its ten coins; it does not touch the
    number above this line, which counts days the app was opened.

    Until this the deadline existed only in the code: the card showed a Collect
    button with no hint that anything was at stake. Progress lost to a rule
    nobody could see reads as the game losing it, and the notification does not
    cover the gap — that setting is off by default.

    Hours rather than a live clock. This is a nudge, not a countdown, and the
    button below already carries a clock when there is one to carry.
  */
  if (lapseIn > 0) {
    const hours = Math.max(1, Math.ceil(lapseIn / (60 * 60 * 1000)));
    return `Collect within ${plural(hours, 'hour')} to keep your place`;
  }

  if (standing.days <= 0) return 'Open the app tomorrow to start a run';

  // One line for every day of the run, including the day a milestone is
  // passed — the marker has already moved to the next one by then, so there is
  // no "complete" state to word differently and nothing that reads as done.
  return `Day ${standing.days} of ${standing.target} — keep it going`;
}

interface DailyScreenProps {
  onPlayBonus: () => void;
}

/** The seven-day reward track, spec §4.6. */
export const DailyScreen = memo(function DailyScreen({ onPlayBonus }: DailyScreenProps) {
  const streak = useEconomyStore((state) => state.streak);
  // Derived from the streak rather than selected as a method: a selector
  // returning a function has a stable identity, so the card would never
  // re-render when the run advanced. The same rule Home's `lastClaim` follows.
  const standing = standingFor(streak);
  const { reward, remaining, dayIndex, lapseIn } = useClaimTimer();
  const waiting = reward === null;

  /**
   * The tile today's visit landed on.
   *
   * One expression now, where it used to need two. The day is decided by the
   * visit rather than by the claim, so it no longer matters whether the reward
   * has been taken — `waiting` says only whether *this* tile is still owed, and
   * `dayState` turns that into claimed-or-today.
   */
  const currentIndex = dayIndex;

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
      // A coin, not a tick. Both buttons here pay, so the glyphs have to say
      // *what* is being taken rather than which one confirms — and a tick on
      // Collect read as "OK" beside an offer that was visibly about money. The
      // coin is the same mark the balance pill carries, so the dialog names its
      // payout in the app's own vocabulary.
      //
      // The video stays: it is the price of the doubled offer, and the Complete
      // screen marks the identical bargain the same way.
      confirmIcon: 'coin',
      secondaryIcon: 'video',
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

        /*
          What was actually paid, not what the tile advertised.

          `claimDaily` answers 0 when the clock says nothing is owed, and the
          toast used to quote `DAILY_REWARDS[currentIndex]` regardless — so a
          claim that paid nothing still announced a payout and still threw
          confetti. The two can only disagree in a narrow window (the dialog
          sits open across the unlock, or another surface claims underneath
          it), which is exactly the kind of gap that ships.
        */
        const paid = useEconomyStore.getState().claimDaily(Date.now());
        if (paid === 0) {
          overlay.closeModal();
          overlay.toast('That reward has already been collected');
          return;
        }

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
          overlay.toast(claimToast(paid, balance));
        });
      },
      /**
       * Double it — doc §8's highest-value rewarded slot.
       *
       * **The ad gates the bonus and nothing else.** A refusal claims nothing
       * at all — the base reward is still sitting there and Collect still pays
       * it — because claiming and then skipping only the bonus would spend the
       * day's reward on a video the player did not watch.
       *
       * `double_daily_reward` is not in `paysWithoutAd`, so an empty auction
       * pays nothing here. That is the right way round: the bonus sits on top
       * of a reward the player already has, so a failed fill costs them nothing
       * they held — unlike the spare vial, where an unfilled ad would leave a
       * board with no way out.
       */
      onSecondary: () => {
        if (useOverlayStore.getState().celebration) return;

        /*
          The ad first, the coins after — behind `showRewarded`, so the SDK
          landing changes nothing here.

          Nothing is claimed on a refusal, deliberately: the base reward is
          still sitting there and Collect still pays it. Claiming anyway and
          skipping only the bonus would spend the day's reward on an ad the
          player did not watch.
        */
        void showRewarded('double_daily_reward').then((outcome) => {
          if (outcome !== 'earned') {
            overlay.toast(
              outcome === 'dismissed'
                ? 'The ad was closed early — nothing doubled'
                : 'No ad available right now'
            );
            return;
          }

          // Read from what the claim returned rather than from the table, so
          // the two cannot disagree about which day was paid. `- 1` because
          // the claim already paid one share: doubling means adding the
          // difference, not the whole amount again.
          const paid = useEconomyStore.getState().claimDaily(Date.now());

          /*
            The claim came back empty *after* the ad was watched.

            Only reachable in a narrow window — the dialog sits open across the
            claim window closing, or another surface claims underneath it — but
            without this the player got a coin shower and a receipt for zero
            coins, which is the app telling them it paid when it did not.

            The bonus share is credited anyway, on the rule the board controls
            follow: a watched ad always pays. The ad was the price of the
            doubling specifically, so the doubling is what it settles; the base
            reward is a claim, and a claim that has already happened is not
            something an ad can buy again.
          */
          if (paid === 0) {
            const bonus = DAILY_REWARDS[currentIndex]! * (EARNINGS.adMultiplier - 1);
            useEconomyStore.getState().add(bonus);
            overlay.closeModal();
            overlay.toast(`Reward already collected — ${bonus} coins added instead`);
            return;
          }

          useEconomyStore.getState().add(paid * (EARNINGS.adMultiplier - 1));
          void syncReminders();

          const balance = useEconomyStore.getState().coins;

          // Coins, not confetti. The player watched a video on the promise of
          // a payout, so the animation that marks it should be the payout.
          overlay.coins(() => {
            overlay.closeModal();
            overlay.toast(claimToast(paid * EARNINGS.adMultiplier, balance));
          });
        });
      },
    });
  }, [currentIndex, waiting]);

  return (
    <ScrollPage title="Rewards">
      <Panel contentStyle={styles.streak}>
        <StreakFlame />
        <View style={styles.streakText}>
          {/*
            The run's length, and under it how far up the current rung it is.
            The bar measures the *tier*, not the reward week: the two are
            different lengths past tier one, and the bar belongs to the thing
            the number above it is counting.
          */}
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
                { width: percentWidth(standing.days, standing.target) },
              ]}
            />
          </View>
          <Text style={styles.streakDetail}>{streakDetail(standing, lapseIn)}</Text>
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

        The grand reward still reads as grand — day seven's tile names double
        its nearest neighbour, and the number is the part that says so. The
        amounts come from the constants, so a rebalance never stales this copy.
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
            // "Next reward" rather than "Next in". On its own line above the
            // clock the caption has room, and it can name the thing instead of
            // being a preposition the number has to finish.
            caption={waiting ? 'Next reward' : undefined}
            // What tomorrow pays, beside the caption. The countdown said when
            // and never what — the one line that could give a player a reason
            // to come back was the one that did not name the prize.
            //
            // Not `dayIndex`. The store's `nextDayIndex` means "the day the
            // claim available now pays", and while the clock is running that
            // claim has already been taken — so the card advertised the coins
            // it had just handed over. `currentIndex` is the tile the track
            // sits on; tomorrow is the one after it.
            captionAmount={
              waiting
                ? DAILY_REWARDS[nextRewardIndex(currentIndex, DAILY_REWARDS.length)]
                : undefined
            }
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
 * counts down with **no `onPress` at all** rather than a grayed one — a
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
        {available ? `up to +${BONUS_MAX}` : countdown(remaining)}
      </Text>
    </SettingRow>
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
 * `transformOrigin` pins the pivot at the base. Scaled about its center the
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
        <Icon name="flame" size={FLAME_SIZE} color={colors.mango} />
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
        <View style={styles.dayCoin}>
          <Coin size={COIN_SIZE} />
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
