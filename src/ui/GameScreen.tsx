import { memo, useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

import { Board, type PourAnimation } from '@/render/Board';
import { computeLayout, hitTest } from '@/render/layout';
import { POUR_MS } from '@/render/pour';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useGameStore, type TapOutcome } from '@/state/gameStore';
import { plural } from '@/utils';
import { ChromeIconButton } from './chrome/ScreenHeader';
import { useScreenPadding } from './hooks/useScreenPadding';
import { feedbackFor } from './feedback';
import { ControlButton } from './chrome/ControlButton';
import {
  CONTROLS_HEIGHT,
  HUD_HEIGHT,
  SIDE_PADDING,
  styles,
} from './styles/GameScreen.styles';

interface GameScreenProps {
  width: number;
  height: number;
  onExit: () => void;
  /** Raised the moment the board is solved, so Root can show Complete. */
  onSolved: () => void;
}

export const GameScreen = memo(function GameScreen({
  width,
  height,
  onExit,
  onSolved,
}: GameScreenProps) {
  const padding = useScreenPadding();
  const level = useGameStore((state) => state.level);
  const board = useGameStore((state) => state.board);
  const selected = useGameStore((state) => state.selected);
  const moves = useGameStore((state) => state.history.length);
  const undone = useGameStore((state) => state.future.length);
  const marks = useSettingsStore((state) => state.colourblind);

  const boardWidth = width - SIDE_PADDING * 2;
  const boardHeight =
    height -
    padding.frame.paddingTop -
    padding.frame.paddingBottom -
    HUD_HEIGHT -
    CONTROLS_HEIGHT;

  const layout = useMemo(
    () =>
      computeLayout({
        tubeCount: board.tubes.length,
        capacity: board.capacity,
        width: boardWidth,
        height: boardHeight,
      }),
    [board.tubes.length, board.capacity, boardWidth, boardHeight]
  );

  // The pour playing right now, if any. Cleared when the timeline finishes.
  const [pour, setPour] = useState<PourAnimation | null>(null);
  const progress = useSharedValue(0);

  const endPour = useCallback(() => {
    setPour(null);
    useGameStore.getState().setLocked(false);
    // Handing off only now means the winning pour is watched to the end
    // rather than cut off by the Complete screen appearing over it.
    if (useGameStore.getState().solved) onSolved();
  }, [onSolved]);

  /** Runs the pour animation for an outcome, whether it came from a tap or
   * from redo. Both produce the same move, so both should look the same. */
  const playPour = useCallback(
    (outcome: TapOutcome) => {
      feedbackFor(outcome);
      if (outcome.kind !== 'poured') return;

      // Doc §7: lock input for the animation, or queued taps double-pour.
      useGameStore.getState().setLocked(true);
      setPour({
        from: outcome.move.from,
        to: outcome.move.to,
        count: outcome.move.count,
        colour: outcome.colour,
        destFilled: outcome.destFilled,
      });

      progress.value = 0;
      progress.value = withTiming(
        1,
        { duration: POUR_MS, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) runOnJS(endPour)();
        }
      );
    },
    [progress, endPour]
  );

  // Actions are read straight off the store rather than subscribed to, so this
  // callback keeps a stable identity and the gesture is never rebuilt.
  const handleTap = useCallback(
    (x: number, y: number) => {
      const index = hitTest(layout, x, y);
      if (index === -1) return;
      playPour(useGameStore.getState().tapTube(index));
    },
    [layout, playPour]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap().onEnd((event) => {
        'worklet';
        runOnJS(handleTap)(event.x, event.y);
      }),
    [handleTap]
  );

  const undo = useCallback(() => useGameStore.getState().undo(), []);
  const redo = useCallback(() => playPour(useGameStore.getState().redo()), [playPour]);
  const restart = useCallback(() => useGameStore.getState().restart(), []);
  const hint = useCallback(() => {
    // Selecting the source is the hint: the player still chooses where it
    // goes, so it points rather than plays.
    if (!useGameStore.getState().hint()) {
      overlay.toast('No pour available — try undo');
    }
  }, []);
  const addVial = useCallback(() => {
    // Spec §10 makes this the rewarded-ad slot. The ad is phase 2; the vial
    // is free for now so the escape hatch exists at all.
    const added = useGameStore.getState().addTube();
    overlay.toast(added ? 'An empty vial, on the house' : 'Only one spare vial per level');
  }, []);

  return (
    <View style={[styles.root, padding.frame]}>
      <View style={styles.hud}>
        <ChromeIconButton icon="back" onPress={onExit} label="Back" />
        <View style={styles.hudMiddle}>
          <Text style={styles.hudLevel}>Level {level}</Text>
          <Text style={styles.hudMoves}>{plural(moves, 'move')}</Text>
        </View>
        <ChromeIconButton icon="restart" onPress={restart} label="Restart" />
      </View>

      <GestureDetector gesture={tap}>
        <View style={[styles.boardSlot, { width: boardWidth, height: boardHeight }]}>
          <Board
            state={board}
            layout={layout}
            width={boardWidth}
            height={boardHeight}
            selected={selected}
            animation={pour}
            progress={progress}
            marks={marks}
          />
        </View>
      </GestureDetector>

      <View style={styles.controls}>
        <ControlButton icon="undo" label="Undo" onPress={undo} disabled={moves === 0} />
        <ControlButton icon="redo" label="Redo" onPress={redo} disabled={undone === 0} />
        <ControlButton icon="hint" label="Hint" onPress={hint} />
        <ControlButton icon="addVial" label="Add vial" onPress={addVial} />
      </View>
    </View>
  );
});
