import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DIFFICULTIES, DIFFICULTY_INFO, type Difficulty } from '@/game/difficulty';
import { useGameStore } from '@/state/gameStore';
import { useSettingsStore } from '@/state/settingsStore';
import { apothecary } from '@/theme/apothecary';
import { ChromeIconButton, ScreenHeader } from './chrome/ScreenHeader';
import { feedbackTap } from './feedback';
import { Icon } from './Icon';
import { COLUMNS, styles } from './styles/StagesScreen.styles';

interface StagesScreenProps {
  onBack: () => void;
  onPick: () => void;
}

/** Levels per page. Doc §5 generates on demand, so pages are windows. */
export const PAGE_SIZE = 50;

interface Stage {
  level: number;
  locked: boolean;
  stars: number;
  current: boolean;
}

export function pageOf(level: number): number {
  return Math.floor((level - 1) / PAGE_SIZE);
}

export const StagesScreen = memo(function StagesScreen({
  onBack,
  onPick,
}: StagesScreenProps) {
  const insets = useSafeAreaInsets();
  const record = useGameStore((state) => state.record);
  const difficulty = useGameStore((state) => state.difficulty);
  const level = useGameStore((state) => state.level);
  const loadLevel = useGameStore((state) => state.loadLevel);

  const progress = record[difficulty]!;
  const furthest = progress.furthestLevel;
  const accent = DIFFICULTY_INFO[difficulty].accent;

  // The page the player is on is the last one they can open.
  const lastOpenPage = pageOf(furthest);
  const [page, setPage] = useState(() => pageOf(level));

  // Switching mode jumps to wherever that mode was left, not to page one of
  // the mode you came from.
  useEffect(() => setPage(pageOf(level)), [difficulty, level]);

  const stages = useMemo<Stage[]>(() => {
    const start = page * PAGE_SIZE + 1;
    const list: Stage[] = [];
    for (let n = start; n < start + PAGE_SIZE; n++) {
      list.push({
        level: n,
        locked: n > furthest,
        stars: progress.stars[n] ?? 0,
        current: n === furthest,
      });
    }
    return list;
  }, [page, furthest, progress.stars]);

  const pageLocked = page > lastOpenPage;

  const select = useCallback(
    (stage: Stage) => {
      if (stage.locked) return;
      feedbackTap();
      loadLevel(stage.level);
      onPick();
    },
    [loadLevel, onPick]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Stage; index: number }) => (
      <StageTile stage={item} index={index} accent={accent} onSelect={select} />
    ),
    [select, accent]
  );

  const previous = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  // One page past the frontier stays reachable so the next block is visible.
  const forward = useCallback(
    () => setPage((p) => Math.min(lastOpenPage + 1, p + 1)),
    [lastOpenPage]
  );

  const from = page * PAGE_SIZE + 1;
  const to = from + PAGE_SIZE - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Choose a shelf" onBack={onBack} />

      <View style={styles.tabs}>
        {DIFFICULTIES.map((id) => (
          <ModeTab key={id} id={id} active={id === difficulty} />
        ))}
      </View>

      <View style={styles.pager}>
        <ChromeIconButton icon="back" onPress={previous} label="Previous page" />
        <Text style={styles.pageLabel}>
          {from}–{to}
        </Text>
        <ChromeIconButton
          icon="next"
          onPress={forward}
          label="Next page"
          dimmed={page > lastOpenPage}
        />
      </View>

      <FlatList
        // Remounting on page change replays the pop-in for the new block.
        key={`${difficulty}-${page}`}
        data={stages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        // A page is 50 tiles; only the visible window is ever mounted.
        initialNumToRender={20}
        windowSize={5}
        removeClippedSubviews
      />

      {pageLocked ? (
        <Animated.View style={styles.lockNotice} entering={FadeIn.duration(260)}>
          <Icon name="lock" size={16} color={apothecary.inkMuted} />
          <Text style={styles.lockText}>Finish the block before this one</Text>
        </Animated.View>
      ) : null}
    </View>
  );
});

const keyExtractor = (stage: Stage) => String(stage.level);

const ModeTab = memo(function ModeTab({ id, active }: { id: Difficulty; active: boolean }) {
  const info = DIFFICULTY_INFO[id];
  const onPress = useCallback(() => {
    feedbackTap();
    useSettingsStore.getState().setDifficulty(id);
  }, [id]);

  if (active) {
    return (
      <Pressable
        style={styles.tabPress}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
      >
        <LinearGradient
          colors={[apothecary.goldLight, apothecary.gold]}
          style={[styles.tab, styles.tabActive]}
        >
          <Text style={styles.tabTextActive}>{info.title}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.tabPress} onPress={onPress} accessibilityRole="tab">
      <LinearGradient
        colors={[apothecary.surfaceTop, apothecary.surface]}
        style={styles.tab}
      >
        <Text style={styles.tabText}>{info.title}</Text>
      </LinearGradient>
    </Pressable>
  );
});

const StageTile = memo(function StageTile({
  stage,
  index,
  accent,
  onSelect,
}: {
  stage: Stage;
  index: number;
  accent: string;
  onSelect: (stage: Stage) => void;
}) {
  const onPress = useCallback(() => onSelect(stage), [onSelect, stage]);

  return (
    <Animated.View
      style={styles.tileSlot}
      // Spec §4.3: tiles pop in, staggered across the grid.
      entering={FadeIn.duration(320).delay(Math.min(index, 20) * 30)}
    >
      <Pressable
        onPress={onPress}
        disabled={stage.locked}
        accessibilityRole="button"
        accessibilityLabel={`Level ${stage.level}${stage.locked ? ', locked' : ''}`}
      >
        <LinearGradient
          colors={[apothecary.surfaceTop, apothecary.surface]}
          style={[styles.tile, stage.locked && styles.tileLocked]}
        >
          {stage.current && !stage.locked ? <CurrentRing accent={accent} /> : null}

          {stage.locked ? <Icon name="lock" size={16} color={apothecary.inkMuted} /> : null}

          <Text style={[styles.tileNumber, stage.locked && styles.tileNumberLocked]}>
            {stage.level}
          </Text>

          {stage.locked ? null : (
            <View style={styles.stars}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.star, i < stage.stars && styles.starFilled]} />
              ))}
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

/**
 * The pulsing ring on the level the player is up to (spec §4.3).
 *
 * Only one tile ever has it, so this is a single looping animation on screen,
 * and it is cancelled the moment the tile unmounts — which the virtualised
 * list does as soon as it scrolls away.
 */
const CurrentRing = memo(function CurrentRing({ accent }: { accent: string }) {
  const beat = useSharedValue(0);

  useEffect(() => {
    beat.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(beat);
  }, [beat]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + beat.value * 0.45,
    transform: [{ scale: 1 + beat.value * 0.04 }],
  }));

  return (
    <Animated.View
      style={[styles.ring, { borderColor: accent }, style]}
      pointerEvents="none"
    />
  );
});
