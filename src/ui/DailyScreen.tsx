import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { overlay } from '@/state/overlayStore';
import { apothecary } from '@/theme/apothecary';
import { colours, gradients, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { countdown, percentWidth, plural } from '@/utils';
import { ClaimButton } from './chrome/ClaimButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SettingGroup, SettingRow } from './chrome/SettingRow';
import { useClaimTimer } from './hooks/useClaimTimer';
import { Icon } from './Icon';
import { dayState } from './rewardTrack';
import { COIN_SIZE, FLAME_SIZE, styles } from './styles/DailyScreen.styles';

/**
 * Day seven, and the six that lead to it.
 *
 * Split at the source rather than sliced at the callsite, so the grid and the
 * grand row cannot disagree about which day belongs where.
 */
const WEEK = DAILY_REWARDS.slice(0, -1);
const FINALE = DAILY_REWARDS[DAILY_REWARDS.length - 1]!;
const FINALE_INDEX = DAILY_REWARDS.length - 1;

/**
 * What the rewarded ad pays, doc §8's highest-value slot.
 *
 * Named here because Home's chip prints the same figure, and two screens
 * quoting different numbers for one reward is worse than not advertising it.
 */
const AD_REWARD = 50;

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
  const claimed = DAILY_REWARDS.length - claimsLeft;

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

      <View style={styles.track}>
        {WEEK.map((amount, index) => (
          <DayTile
            key={index}
            day={index + 1}
            amount={amount}
            state={dayState(index, currentIndex, waiting)}
          />
        ))}
      </View>

      {/*
        Day seven, out of the grid.

        It is ten times day one and the reason the streak is worth keeping. As a
        seventh tile it was the same square as the 10-coin Monday, which is the
        layout telling the player the opposite of what the numbers do.
      */}
      <Panel contentStyle={styles.grand}>
        <View style={styles.grandCoin}>
          <CoinFace />
        </View>
        <View style={styles.grandText}>
          <Text style={styles.grandLabel}>DAY 7 · GRAND REWARD</Text>
          <Text style={styles.grandAmount}>{FINALE} coins</Text>
        </View>
        <Icon
          name={
            dayState(FINALE_INDEX, currentIndex, waiting) === 'claimed' ? 'check' : 'lock'
          }
          size={s(18)}
          color={apothecary.inkMuted}
        />
      </Panel>

      <View style={styles.claim}>
        <ClaimButton
          label={waiting ? countdown(remaining) : `Claim ${reward} coins`}
          caption={waiting ? 'Next in' : undefined}
          onPress={claim}
          waiting={waiting}
        />
      </View>

      {/*
        The rewarded slot, doc §8's highest-value one.

        A card rather than a pressable: the ad SDK is spec §8's phase 2, so
        there is nothing behind it to answer a tap. It says "soon" for the same
        reason `SoonBadge` exists — what is shown but cannot yet be delivered
        has to say which it is, or it reads as a broken button.
      */}
      <Panel contentStyle={styles.advert}>
        <View style={styles.advertIcon}>
          <LinearGradient colors={gradients.advert} style={StyleSheet.absoluteFill} />
          <Icon name="video" size={s(21)} color={colours.white} />
        </View>
        <View style={styles.advertText}>
          <Text style={styles.advertTitle}>Double today&apos;s reward</Text>
          <Text style={styles.advertNote}>Watch a short ad · +{AD_REWARD} soon</Text>
        </View>
        <Text style={styles.advertBadge}>2×</Text>
      </Panel>

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

/** The coin disc, lit from the upper left. Used at two sizes. */
const CoinFace = memo(function CoinFace() {
  return (
    <LinearGradient
      colors={gradients.coin}
      locations={[0, 0.62, 1]}
      start={{ x: 0.34, y: 0.3 }}
      style={StyleSheet.absoluteFill}
    />
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
          state === 'future' && styles.dayFuture,
          state === 'today' && styles.dayToday,
        ]}
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
    </View>
  );
});
