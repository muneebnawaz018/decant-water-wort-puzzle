import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';

import { DIFFICULTIES, DIFFICULTY_INFO, type Difficulty } from '@/game/difficulty';
import { useEconomyStore } from '@/state/economyStore';
import { useGameStore } from '@/state/gameStore';
import type { Progress } from '@/state/progress';
import { percentWidth } from '@/utils';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { styles } from './styles/StatsScreen.styles';

/**
 * Read-only dashboard (spec §4.8).
 *
 * Every number is derived from the progress record rather than tracked
 * separately — a second counter is a second thing to get out of step.
 */
export const StatsScreen = memo(function StatsScreen({ onBack }: { onBack: () => void }) {
  const record = useGameStore((state) => state.record);
  const streak = useEconomyStore((state) => state.streak);
  const coins = useEconomyStore((state) => state.coins);

  const totals = useMemo(() => {
    let solved = 0;
    let stars = 0;
    for (const difficulty of DIFFICULTIES) {
      const progress = record[difficulty]!;
      solved += Object.keys(progress.best).length;
      for (const value of Object.values(progress.stars)) stars += value;
    }
    return { solved, stars };
  }, [record]);

  return (
    <ScrollPage title="Your progress" onBack={onBack}>
      <View style={styles.grid}>
        <StatTile value={String(totals.solved)} label="Levels solved" />
        <StatTile value={String(totals.stars)} label="Stars earned" />
        <StatTile value={String(streak)} label="Day streak" />
        <StatTile value={String(coins)} label="Coins" />
      </View>

      <Panel contentStyle={styles.progressCard}>
        {DIFFICULTIES.map((difficulty, index) => (
          <ModeProgress
            key={difficulty}
            difficulty={difficulty}
            progress={record[difficulty]!}
            first={index === 0}
          />
        ))}
      </Panel>
    </ScrollPage>
  );
});

const ModeProgress = memo(function ModeProgress({
  difficulty,
  progress,
  first,
}: {
  difficulty: Difficulty;
  progress: Progress;
  first: boolean;
}) {
  const solved = Object.keys(progress.best).length;
  const reached = progress.furthestLevel;

  return (
    <View style={first ? undefined : styles.progressSpacing}>
      <View style={styles.progressRow}>
        <Text style={styles.progressName}>{DIFFICULTY_INFO[difficulty].title}</Text>
        <Text style={styles.progressValue}>
          {solved} / {reached}
        </Text>
      </View>
      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            {
              // `percentWidth` guards the zero total that would render `NaN%`.
              width: percentWidth(solved, reached),
              backgroundColor: DIFFICULTY_INFO[difficulty].accent,
            },
          ]}
        />
      </View>
    </View>
  );
});

const StatTile = memo(function StatTile({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.tileSlot}>
      <Panel contentStyle={styles.tile}>
        <Text style={styles.tileValue}>{value}</Text>
        <Text style={styles.tileLabel}>{label}</Text>
      </Panel>
    </View>
  );
});
