import { memo, useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DAILY_REWARDS, useEconomyStore } from '@/state/economyStore';
import { syncReminders } from '@/notifications/dailyReminder';
import { overlay } from '@/state/overlayStore';
import { ClaimButton } from './chrome/ClaimButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SettingGroup, SettingRow } from './chrome/SettingRow';
import { countdown, plural } from '@/utils';
import { useClaimTimer } from './hooks/useClaimTimer';
import { colours } from '@/theme/colors';
import { Icon } from './Icon';
import {
  DAY_COLUMNS,
  FLAME_SIZE,
  RIBBON_ICON,
  STREAK_SPAN,
  styles,
} from './styles/DailyScreen.styles';

/**
 * Empty slots needed to fill the reward track's last row.
 *
 * The days and the streak card share the grid, and the card is worth
 * `STREAK_SPAN` of them — at seven days across three columns that comes to
 * nine, so the rows divide evenly and there is nothing to pad. It is computed
 * rather than assumed because changing either constant would otherwise leave a
 * row spread across a gap with no warning.
 *
 * Computed once at module scope: the reward count and the column count are
 * both constants, so this cannot change while the app is running.
 */
const FILLED = DAILY_REWARDS.length + STREAK_SPAN;
/**
 * What the rewarded ad pays, doc §8's highest-value slot.
 *
 * Named here because Home's chip prints the same figure, and two screens
 * quoting different numbers for one reward is worse than not advertising it.
 */
const AD_REWARD = 50;

const ORPHAN_SLOTS = Array.from(
  { length: (DAY_COLUMNS - (FILLED % DAY_COLUMNS)) % DAY_COLUMNS },
  (_, index) => index
);

/** The week's biggest reward, and the one the streak is worth keeping for. */
const FINALE = DAILY_REWARDS[DAILY_REWARDS.length - 1]!;

/**
 * The streak card's second line.
 *
 * Deliberately not the countdown. The card used to print "Next reward in
 * 19:44:04" and the disabled claim button below it printed the same clock, 90dp
 * apart — the button is the one that has to explain itself, so the card says
 * the thing the button cannot: what the streak is being kept for.
 */
function streakDetail(claimsLeft: number): string {
  if (claimsLeft <= 0) return 'Week complete — the track restarts';
  return `${plural(claimsLeft, 'day')} to ${FINALE} coins`;
}

interface DailyScreenProps {
  onBack: () => void;
  onPlayBonus: () => void;
}

/** The seven-day reward track, spec §4.6. */
export const DailyScreen = memo(function DailyScreen({
  onBack,
  onPlayBonus,
}: DailyScreenProps) {
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

  const claim = useCallback(() => {
    // `claimDaily` already refuses early and pays 0, so the guard is the toast
    // rather than the claim — the button stays pressable while it counts down
    // so the press still answers, and a press that pays nothing must not say
    // it paid something.
    const paid = useEconomyStore.getState().claimDaily(Date.now());
    if (paid > 0) overlay.toast(`+${paid} coins claimed`);
    // The reminder is anchored to the claim, so a new claim moves it. Fire and
    // forget: nothing on screen waits for the OS to accept a schedule.
    void syncReminders();
  }, []);

  return (
    <ScrollPage title="Rewards" onBack={onBack}>
      <View style={styles.track}>
        {DAILY_REWARDS.map((amount, index) => (
          <DayTile
            key={index}
            day={index + 1}
            amount={amount}
            state={
              index < currentIndex || (waiting && index === currentIndex)
                ? 'claimed'
                : index === currentIndex
                  ? 'today'
                  : 'future'
            }
          />
        ))}

        {/*
          The streak sits in the track's last row, beside the final day, rather
          than in a panel above it. Seven days across three columns leave two
          slots empty there and the card is two slots wide, so it fills the row
          the week would otherwise trail off in — and it reads after the track
          it is counting rather than before it.
        */}
        <View style={styles.daySlotWide}>
          <Panel contentStyle={styles.streak}>
            <StreakFlame />
            <View style={styles.streakText}>
              <Text style={styles.streakTitle}>
                {streak === 1 ? '1-day streak' : `${streak}-day streak`}
              </Text>
              <Text style={styles.streakDetail}>{streakDetail(claimsLeft)}</Text>
            </View>
          </Panel>
        </View>

        {/*
          Whatever the day count and the streak card together leave short of a
          full row. An empty slot rather than nothing: `flexWrap` would spread
          the real tiles across the gap otherwise, and the columns would stop
          lining up with the rows above.
        */}
        {ORPHAN_SLOTS.map((slot) => (
          <View key={`pad-${slot}`} style={styles.daySlot} />
        ))}
      </View>

      {/*
        The claim, full width, with the rewarded slot hanging off its top edge.

        The ad was tried twice as a thing of its own — a row under a heading,
        then a tile beside a two-thirds-width claim — and both spend real estate
        on an offer that cannot be taken yet while shrinking the one control
        that can. As a tab it is attached to the answer it belongs to: the
        player reads "not for another sixteen hours", and the other way to get
        coins is on the same object.

        Rendered before the button so the button covers its tuck — see
        `styles.ribbon`.
      */}
      <View style={styles.claim}>
        <AdRibbon />
        <ClaimButton
          label={waiting ? countdown(remaining) : `Claim ${reward} coins`}
          caption={waiting ? 'Next in' : undefined}
          onPress={claim}
          waiting={waiting}
        />
      </View>

      <View style={styles.spacer} />

      <SettingGroup title="Bonus">
        <SettingRow
          icon="book"
          label="Today's brew — bonus puzzle"
          divider={false}
          onPress={onPlayBonus}
        />
      </SettingGroup>
    </ScrollPage>
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

/**
 * The rewarded-ad slot, doc §8's highest-value one, as a tab on the claim.
 *
 * `pointerEvents="none"` is not decoration. The tab's bottom third sits over
 * the button's top edge, so without it the ribbon would eat presses aimed at a
 * control it is advertising alongside — and it has nothing of its own to
 * answer with, since the ad SDK is spec §8's phase 2. The "soon" on it is the
 * same promise `SoonBadge` makes everywhere else: what is shown but cannot yet
 * be delivered says so.
 */
const AdRibbon = memo(function AdRibbon() {
  return (
    <View style={styles.ribbon} pointerEvents="none">
      <Icon name="play" size={RIBBON_ICON} color={colours.goldLight} />
      <Text style={styles.ribbonAmount}>+{AD_REWARD}</Text>
      <Text style={styles.ribbonNote}>soon</Text>
    </View>
  );
});

const DayTile = memo(function DayTile({
  day,
  amount,
  state,
}: {
  day: number;
  amount: number;
  state: 'claimed' | 'today' | 'future';
}) {
  return (
    <View style={styles.daySlot}>
      <Panel
        contentStyle={[
          styles.day,
          state === 'claimed' && styles.dayClaimed,
          state === 'today' && styles.dayToday,
        ]}
        // No `radius` override. Every other tile in the app is a default-radius
        // panel; this one was 14 against their 20 and read as a chip.
      >
        <Text style={styles.dayNumber}>DAY {day}</Text>
        <Text style={styles.dayAmount}>
          {amount}
          <Text style={styles.dayUnit}> coins</Text>
        </Text>
      </Panel>
    </View>
  );
});
