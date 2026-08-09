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

import { DIFFICULTIES, DIFFICULTY_INFO, type Difficulty } from '@/game/difficulty';
import { overlay } from '@/state/overlayStore';
import { useGameStore } from '@/state/gameStore';
import { apothecary } from '@/theme/apothecary';
import { s } from '@/theme/scale';
import { CoinPill } from './chrome/CoinPill';
import { ChromeIconButton, ScreenHeader } from './chrome/ScreenHeader';
import { confirmDifficultyChange } from './confirmDifficulty';
import { useScreenPadding } from './hooks/useScreenPadding';
import { useTapHandler } from './hooks/useTapHandler';
import { Icon, Stars } from './Icon';
import { COLUMNS, styles } from './styles/StagesScreen.styles';

interface StagesScreenProps {
  onPick: () => void;
}

/**
 * Levels per page. Doc §5 generates on demand, so pages are windows.
 *
 * 30 rather than 50: at three columns a 50-level page is 17 rows of scrolling
 * to reach the frontier, and it divides into ten-level milestone blocks as
 * five, which nothing on screen reflects. 30 is ten rows and exactly three
 * blocks.
 *
 * Home reads this too — its "block" progress bar is one page — so the two
 * cannot disagree about where a block starts.
 */
export const PAGE_SIZE = 30;

interface Stage {
  level: number;
  locked: boolean;
  stars: number;
  current: boolean;
}

function pageOf(level: number): number {
  return Math.floor((level - 1) / PAGE_SIZE);
}

export const StagesScreen = memo(function StagesScreen({ onPick }: StagesScreenProps) {
  const padding = useScreenPadding();
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
    // Pad the last row out to a full one.
    //
    // The tiles are `flex: 1`, so a short final row divides the whole width
    // between however few tiles are in it — at four columns a 50-tile page put
    // levels 49 and 50 on their own row at double width, which has been the
    // case since this screen was written and only becomes obvious once the
    // column count moves. Spacers are the standard fix: FlatList has no notion
    // of an incomplete row.
    const orphans = list.length % COLUMNS;
    if (orphans > 0) {
      for (let n = 0; n < COLUMNS - orphans; n++) {
        list.push({ level: -1 - n, locked: true, stars: 0, current: false });
      }
    }

    return list;
  }, [page, furthest, progress.stars]);

  const select = useCallback(
    (stage: Stage) => {
      if (stage.locked) return;
      loadLevel(stage.level);
      onPick();
    },
    [loadLevel, onPick]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Stage; index: number }) =>
      // A row-filling spacer, not a level. It has to occupy a slot rather than
      // be skipped, or the real tiles beside it stretch to cover it.
      item.level < 1 ? (
        <View style={styles.tileSlot} />
      ) : (
        <StageTile stage={item} index={index} accent={accent} onSelect={select} />
      ),
    [select, accent]
  );

  const previous = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  /**
   * The frontier's page is the last one, full stop.
   *
   * It used to allow one page past it, on the theory that seeing the next block
   * gives the player something to aim at. What it actually shows is fifty
   * padlocks — no colour, no level names, nothing to want — and the page label
   * reads "51–100" as though that block were open. A shelf you can walk to and
   * not touch is worse than one that is not there.
   */
  const forward = useCallback(
    () => setPage((p) => Math.min(lastOpenPage, p + 1)),
    [lastOpenPage]
  );

  const from = page * PAGE_SIZE + 1;
  const to = from + PAGE_SIZE - 1;

  return (
    <View style={[styles.root, padding.top]}>
      {/* Stages is not a `ScrollPage` — its body is a `FlatList`, which cannot
          live inside a `ScrollView` — so the drawer handle every other page
          gets from that frame has to be spelled out here. Without it this was
          the one destination you could not open Settings from. */}
      <ScreenHeader
        title="Levels"
        leading={<CoinPill />}
        trailing={
          <ChromeIconButton icon="menu" onPress={overlay.drawer} label="Settings" />
        }
      />

      <View style={styles.tabs}>
        {DIFFICULTIES.map((id) => (
          <ModeTab key={id} id={id} active={id === difficulty} />
        ))}
      </View>

      <View style={styles.pager}>
        <ChromeIconButton
          icon="prev"
          onPress={previous}
          label="Previous page"
          dimmed={page === 0}
        />
        <Text style={styles.pageLabel}>
          {from}–{to}
        </Text>
        <ChromeIconButton
          icon="next"
          onPress={forward}
          label="Next page"
          dimmed={page >= lastOpenPage}
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
        contentContainerStyle={[styles.grid, padding.scrollTailWithNav]}
        showsVerticalScrollIndicator={false}
        /*
          A page is 30 tiles — ten rows — so the whole thing is rendered.

          `removeClippedSubviews` was here and is gone. On Android it detaches
          rows from the native view hierarchy by their computed offset, and
          inside an absolutely positioned parent (which is what
          `ScreenTransition` now is) those offsets are wrong: rows came back
          attached in the wrong place, so the top of the grid drew over itself.
          iOS ignores the prop almost entirely, which is why the screen was fine
          there and only there.

          It buys nothing at this size anyway. It exists for lists of hundreds
          of rows, and this one is ten.
        */
        initialNumToRender={12}
      />

      {/*
        No "finish the block before this one" notice any more: the next page
        cannot be reached, so nothing needs explaining away.
      */}
    </View>
  );
});

const keyExtractor = (stage: Stage) => String(stage.level);

const ModeTab = memo(function ModeTab({ id, active }: { id: Difficulty; active: boolean }) {
  const info = DIFFICULTY_INFO[id];
  const choose = useCallback(() => confirmDifficultyChange(id), [id]);
  const onPress = useTapHandler(choose);

  if (active) {
    return (
      <Pressable
        style={styles.tabPress}
        // The mode you are already in. Same rule as the nav bar and the
        // segmented control: nothing to change, nothing to feel.
        disabled
        accessibilityRole="tab"
        accessibilityState={{ selected: true }}
      >
        <View style={[styles.tab, styles.tabActive]}>
          <LinearGradient
            colors={[apothecary.goldLight, apothecary.gold]}
            style={styles.tabFace}
          >
            <Text style={styles.tabTextActive}>{info.title}</Text>
          </LinearGradient>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.tabPress} onPress={onPress} accessibilityRole="tab">
      <View style={styles.tab}>
        <LinearGradient
          colors={[apothecary.surfaceTop, apothecary.surface]}
          style={styles.tabFace}
        >
          <Text style={styles.tabText}>{info.title}</Text>
        </LinearGradient>
      </View>
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
  const select = useCallback(() => onSelect(stage), [onSelect, stage]);
  // `disabled` on the Pressable keeps a locked tile silent, so the tick can
  // live here rather than behind a check.
  const onPress = useTapHandler(select);

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
        <View style={[styles.tile, stage.locked && styles.tileLocked]}>
          <LinearGradient
            colors={[apothecary.surfaceTop, apothecary.surface]}
            style={styles.tileFace}
          >
            {stage.current && !stage.locked ? <CurrentRing accent={accent} /> : null}

            {stage.locked ? (
              <Icon name="lock" size={s(16)} color={apothecary.inkMuted} />
            ) : null}

            <Text style={[styles.tileNumber, stage.locked && styles.tileNumberLocked]}>
              {stage.level}
            </Text>

            {stage.locked ? null : <Stars filled={stage.stars} size={s(13)} />}
          </LinearGradient>
        </View>
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
