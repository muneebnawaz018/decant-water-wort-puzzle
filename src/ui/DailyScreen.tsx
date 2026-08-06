import { memo, useCallback } from 'react';
import { Text, View } from 'react-native';

import { DAILY_REWARDS, useEconomyStore } from '@/state/economyStore';
import { syncReminders } from '@/notifications/dailyReminder';
import { overlay } from '@/state/overlayStore';
import { colours } from '@/theme/colors';
import { s } from '@/theme/scale';
import { GlossButton } from './chrome/GlossButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SettingRow } from './chrome/SettingRow';
import { countdown } from '@/utils';
import { useClaimTimer } from './hooks/useClaimTimer';
import { Icon } from './Icon';
import { DAY_COLUMNS, styles } from './styles/DailyScreen.styles';

/**
 * Empty slots needed to fill the reward track's last row.
 *
 * Computed once at module scope: the reward count and the column count are
 * both constants, so this cannot change while the app is running.
 */
const ORPHAN_SLOTS = Array.from(
  { length: (DAY_COLUMNS - (DAILY_REWARDS.length % DAY_COLUMNS)) % DAY_COLUMNS },
  (_, index) => index
);

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

  const claim = useCallback(() => {
    const paid = useEconomyStore.getState().claimDaily(Date.now());
    if (paid > 0) overlay.toast(`+${paid} coins claimed`);
    // The reminder is anchored to the claim, so a new claim moves it. Fire and
    // forget: nothing on screen waits for the OS to accept a schedule.
    void syncReminders();
  }, []);

  return (
    <ScrollPage title="Daily rewards" onBack={onBack}>
      <Panel contentStyle={styles.streak}>
        <Icon name="flame" size={s(24)} color={colours.mango} filled />
        <View style={styles.streakText}>
          <Text style={styles.streakTitle}>
            {streak === 1 ? '1-day streak' : `${streak}-day streak`}
          </Text>
          <Text style={styles.streakDetail}>
            {waiting
              ? `Next reward in ${countdown(remaining)}`
              : 'Come back daily for bigger rewards'}
          </Text>
        </View>
      </Panel>

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
          Seven days across four columns leaves the last row one short. The
          slot has to be occupied rather than left empty: `space-between` would
          push the three real tiles apart, and stretching them was the bug this
          replaces. An empty view keeps day 7 under day 3, where the week reads
          as a grid rather than as two unrelated rows.
        */}
        {ORPHAN_SLOTS.map((slot) => (
          <View key={`pad-${slot}`} style={styles.daySlot} />
        ))}
      </View>

      <GlossButton
        label={waiting ? countdown(remaining) : `Claim ${reward} coins`}
        variant="primary"
        onPress={claim}
        disabled={waiting}
      />

      <View style={styles.spacer} />

      <Panel>
        <SettingRow
          icon="book"
          label="Today's brew — bonus puzzle"
          divider={false}
          onPress={onPlayBonus}
        />
      </Panel>
    </ScrollPage>
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
        radius={14}
      >
        <Text style={styles.dayNumber}>DAY {day}</Text>
        <Text style={styles.dayAmount}>
          {amount}
          <Text style={styles.dayUnit}> c</Text>
        </Text>
      </Panel>
    </View>
  );
});
