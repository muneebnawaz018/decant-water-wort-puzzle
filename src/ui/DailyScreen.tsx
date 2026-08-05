import { memo, useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';

import { DAILY_REWARDS, isNextDay, today, useEconomyStore } from '@/state/economyStore';
import { overlay } from '@/state/overlayStore';
import { colours } from '@/theme/colors';
import { s } from '@/theme/scale';
import { GlossButton } from './chrome/GlossButton';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { SettingRow } from './chrome/SettingRow';
import { Icon } from './Icon';
import { styles } from './styles/DailyScreen.styles';

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
  const lastClaim = useEconomyStore((state) => state.lastClaim);

  const date = useMemo(() => today(new Date()), []);
  // Read through `getState`, but only after subscribing to `lastClaim` and
  // `streak` above — the selector form would pin the function identity and
  // never re-render when a claim lands.
  const reward = useEconomyStore.getState().claimable(date);
  const claimed = reward === null;

  // Which day of the week's track today is. A broken streak restarts at day
  // one, so this is not simply `streak`.
  const todayIndex = claimed
    ? (streak - 1 + DAILY_REWARDS.length) % DAILY_REWARDS.length
    : isNextDay(lastClaim ?? '', date)
      ? streak % DAILY_REWARDS.length
      : 0;

  const claim = useCallback(() => {
    const paid = useEconomyStore.getState().claimDaily(date);
    if (paid > 0) overlay.toast(`+${paid} coins claimed`);
  }, [date]);

  return (
    <ScrollPage title="Daily rewards" onBack={onBack}>
      <Panel contentStyle={styles.streak}>
        <Icon name="flame" size={s(24)} color={colours.mango} filled />
        <View style={styles.streakText}>
          <Text style={styles.streakTitle}>
            {streak === 1 ? '1-day streak' : `${streak}-day streak`}
          </Text>
          <Text style={styles.streakDetail}>Come back daily for bigger rewards</Text>
        </View>
      </Panel>

      <View style={styles.track}>
        {DAILY_REWARDS.map((amount, index) => (
          <DayTile
            key={index}
            day={index + 1}
            amount={amount}
            state={
              index < todayIndex || (claimed && index === todayIndex)
                ? 'claimed'
                : index === todayIndex
                  ? 'today'
                  : 'future'
            }
          />
        ))}
      </View>

      <GlossButton
        label={claimed ? 'Claimed today' : `Claim ${reward} coins`}
        variant="primary"
        onPress={claim}
        disabled={claimed}
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
