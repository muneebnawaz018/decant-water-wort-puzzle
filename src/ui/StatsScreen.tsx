import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';

import { DIFFICULTIES, DIFFICULTY_INFO, type Difficulty } from '@/game/difficulty';
import { useEconomyStore } from '@/state/economyStore';
import { useGameStore } from '@/state/gameStore';
import type { Progress, ProgressByDifficulty } from '@/state/progress';
import { percentWidth } from '@/utils';
import { Panel } from './chrome/Panel';
import { ScrollPage } from './chrome/ScrollPage';
import { section } from './chrome/styles/section.styles';
import { styles } from './styles/StatsScreen.styles';

/** What one mode's record adds up to. */
interface ModeTotals {
  /** Levels finished at least once. */
  solved: number;
  /** Highest level unlocked — the frontier, whether or not it is beaten. */
  reached: number;
  stars: number;
  /** Levels beaten at three stars. */
  perfect: number;
  /** Pours across every best run, so replaying badly cannot inflate it. */
  pours: number;
  blocks: number;
}

function totalsFor(progress: Progress): ModeTotals {
  let stars = 0;
  let perfect = 0;
  for (const value of Object.values(progress.stars)) {
    stars += value;
    if (value === 3) perfect += 1;
  }

  let pours = 0;
  for (const moves of Object.values(progress.best)) pours += moves;

  return {
    solved: Object.keys(progress.best).length,
    reached: progress.furthestLevel,
    stars,
    perfect,
    pours,
    blocks: progress.paidBlocks.length,
  };
}

function sumTotals(record: ProgressByDifficulty): ModeTotals {
  const total: ModeTotals = {
    solved: 0,
    reached: 0,
    stars: 0,
    perfect: 0,
    pours: 0,
    blocks: 0,
  };
  for (const difficulty of DIFFICULTIES) {
    const mode = totalsFor(record[difficulty]!);
    total.solved += mode.solved;
    total.reached += mode.reached;
    total.stars += mode.stars;
    total.perfect += mode.perfect;
    total.pours += mode.pours;
    total.blocks += mode.blocks;
  }
  return total;
}

/**
 * Read-only dashboard (spec §4.8).
 *
 * Every number is derived from the progress record rather than tracked
 * separately — a second counter is a second thing to get out of step. That is
 * also the ceiling on what this screen can say: there is no play-time, no
 * session count and no move log, because none of them are stored, and adding a
 * counter to feed a stat is exactly the trade the rule above refuses.
 *
 * Levels and stars are shown per mode rather than as one figure. Modes keep
 * their own unlocks and their own place, so a combined total answers a question
 * nobody asked — "how far am I on Hard" is the question, and a single
 * number cannot answer it.
 */
export const StatsScreen = memo(function StatsScreen({ onBack }: { onBack: () => void }) {
  const record = useGameStore((state) => state.record);
  const streak = useEconomyStore((state) => state.streak);
  const coins = useEconomyStore((state) => state.coins);

  const totals = useMemo(() => sumTotals(record), [record]);

  // Guarded rather than left to divide by zero: a fresh install has solved
  // nothing, and `NaN` is what the screen would print.
  const perLevel = totals.solved === 0 ? 0 : totals.stars / totals.solved;

  return (
    <ScrollPage title="Your progress" onBack={onBack}>
      <View style={styles.grid}>
        <StatTile value={String(streak)} label="Day streak" />
        <StatTile value={String(coins)} label="Coins" />
        <StatTile value={String(totals.perfect)} label="3 star levels" />
        {/*
          "Bonuses earned", not "Milestones cleared". The number is
          `paidBlocks.length` — every ten levels pays a coin bonus on the stars
          earned in that block — and "milestone" is a word for the thing that
          pays rather than for the payment, so it left the tile naming an
          achievement the player has no other name for. What they saw was coins
          arriving every ten levels, so that is what it says.
        */}
        <StatTile value={String(totals.blocks)} label="Bonuses earned" />
      </View>

      <Text style={section.title}>By difficulty</Text>
      {DIFFICULTIES.map((difficulty, index) => (
        <ModeCard
          key={difficulty}
          difficulty={difficulty}
          progress={record[difficulty]!}
          last={index === DIFFICULTIES.length - 1}
        />
      ))}

      <Text style={section.title}>Lifetime</Text>
      <Panel contentStyle={styles.lifetime}>
        <StatRow label="Levels solved" value={String(totals.solved)} />
        <StatRow label="Stars earned" value={`${totals.stars} / ${totals.solved * 3}`} />
        <StatRow label="Stars per level" value={perLevel.toFixed(1)} />
        {/*
          "Pours in best runs" was read as a lifetime total and it is not one:
          it sums `progress.best`, which holds one number per level — the
          fewest pours that level has ever been finished in. Beat a level forty
          times and only the best of them is in here.

          A real lifetime figure would have to be counted and stored, which is
          the one thing this screen refuses to do: every number on it is
          derived from the progress record, and a counter kept alongside is a
          second thing that can fall out of step with it.
        */}
        <StatRow label="Pours at your best" value={String(totals.pours)} divider={false} />
      </Panel>
    </ScrollPage>
  );
});

const ModeCard = memo(function ModeCard({
  difficulty,
  progress,
  last,
}: {
  difficulty: Difficulty;
  progress: Progress;
  /** The card that closes the group, and so carries the section gap. */
  last: boolean;
}) {
  const info = DIFFICULTY_INFO[difficulty];
  const totals = totalsFor(progress);

  return (
    <Panel
      style={last ? styles.modeCardLast : styles.modeCardBox}
      contentStyle={styles.modeCard}
    >
      <View style={styles.modeHead}>
        <View style={[styles.modeDot, { backgroundColor: info.accent }]} />
        <Text style={styles.modeName}>{info.title}</Text>
        <Text style={styles.modeCount}>
          {totals.solved} / {totals.reached}
        </Text>
      </View>

      <View style={styles.bar}>
        <View
          style={[
            styles.barFill,
            {
              // `percentWidth` guards the zero total that would render `NaN%`.
              width: percentWidth(totals.solved, totals.reached),
              backgroundColor: info.accent,
            },
          ]}
        />
      </View>

      <View style={styles.modeStats}>
        <ModeStat value={totals.stars} label="Stars" align="first" />
        <ModeStat value={totals.perfect} label="3 star" />
        <ModeStat value={totals.pours} label="Pours" align="last" />
      </View>
    </Panel>
  );
});

const ModeStat = memo(function ModeStat({
  value,
  label,
  align,
}: {
  value: number;
  label: string;
  /** Edge stats hug the card's sides; the middle one is left to centre. */
  align?: 'first' | 'last';
}) {
  return (
    <View
      style={[
        styles.modeStat,
        align === 'first' && styles.modeStatFirst,
        align === 'last' && styles.modeStatLast,
      ]}
    >
      <Text style={styles.modeStatValue}>{value}</Text>
      <Text style={styles.modeStatLabel}>{label}</Text>
    </View>
  );
});

const StatRow = memo(function StatRow({
  label,
  value,
  divider = true,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
