import { memo, useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

import { Board, type PourAnimation } from '@/render/Board';
import { computeLayout, hitTest } from '@/render/layout';
import { POUR_MS } from '@/render/pour';
import { FREE_HINTS, PRICES } from '@/game/economy';
import { undoCharge } from '@/game/undoCost';
import { useEconomyStore } from '@/state/economyStore';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useGameStore, type TapOutcome } from '@/state/gameStore';
import { s } from '@/theme/scale';
import { compactCoins, plural } from '@/utils';
import { ChromeIconButton } from './chrome/ScreenHeader';
import { useScreenPadding } from './hooks/useScreenPadding';
import { feedbackFor, feedbackWarn } from './feedback';
import { ControlButton } from './chrome/ControlButton';
import {
  CONTROLS_HEIGHT,
  HUD_HEIGHT,
  SIDE_PADDING,
  styles,
} from './styles/GameScreen.styles';

/**
 * What each hint refusal says, and why they are three messages and not one.
 *
 * `stuck` is the useful half of the whole feature: a water sort board can be
 * poured into a position with no winning line, there is no fail state to
 * announce it, and nothing else in the game can tell the player. `unsure` looks
 * the same from the outside and is not the same news — the search gave up
 * without proving anything, and dressing that up as "there is none" would be
 * the app lying about a board that may well be winnable. `blocked` is a price,
 * and prices get their own wording.
 */
const HINT_REFUSAL = {
  stuck: 'No way to win from here — undo, or add a vial',
  unsure: "Couldn't find a hint for this board",
  blocked: `A hint costs ${PRICES.hint} coins — not enough`,
} as const;

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
  const bonus = useGameStore((state) => state.bonus);
  const board = useGameStore((state) => state.board);
  const selected = useGameStore((state) => state.selected);
  const moves = useGameStore((state) => state.history.length);
  /**
   * What the next undo costs, or 0 if that move has already been paid for.
   *
   * Derived here rather than read as a flag, because it changes with every
   * move: the badge has to disappear the moment a redo puts the player back on
   * a move they have already bought their way past.
   */
  const undoPrice = useGameStore((state) =>
    state.history.length === 0
      ? 0
      : undoCharge(
          state.paidUndos,
          state.history.length - 1,
          state.freeUndosUsed,
          state.difficulty
        ).coins
  );
  const undone = useGameStore((state) => state.future.length);
  const vialTaken = useGameStore((state) => state.extraTaken);
  /**
   * What the next hint costs, or 0 while the free one is unspent.
   *
   * Zero too while a hint is already on the board — pressing again re-states
   * what is showing, and charging twice for one answer is the shape of a bug
   * even when the player has the coins.
   */
  const hintPrice = useGameStore((state) =>
    // `heldHint`, not `hintMove`: selecting a vial dismisses the display but
    // not the purchase, and the badge must price the press, which re-shows the
    // held answer free.
    state.heldHint !== null || state.hintsUsed < FREE_HINTS ? 0 : PRICES.hint
  );
  // The destination only; the source arrives through `selected`.
  const hintTo = useGameStore((state) => state.hintMove?.to ?? null);
  const marks = useSettingsStore((state) => state.colourblind);
  const skin = useSettingsStore((state) => state.skin);

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
      // Slop scales with the chrome. `layout.ts` stays pure and React-free, so
      // it cannot ask the device how big it is — its default 12 is a phone
      // number, and on a tablet a fixed 12dp halo around a tube twice the size
      // is a noticeably tighter target than the one phone players get.
      const index = hitTest(layout, x, y, s(12));
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

  /**
   * Undo, which costs coins the first time each move is taken back.
   *
   * A refusal answers differently from a success — the same rule the hint
   * button follows. Being unable to afford it has to feel like the control
   * declining, not like an undo that did nothing.
   */
  const undo = useCallback(() => {
    const outcome = useGameStore.getState().undo();
    if (outcome.kind === 'blocked') {
      feedbackWarn();
      overlay.toast(`Undo costs ${outcome.price} coins — not enough`);
      return;
    }
    // Undo's last step on a level with a spare vial out: the vial goes back,
    // free. Announced because the board changing shape is a bigger thing than a
    // pour and the player may not have meant to go that far — and because
    // nothing else in the app tells them the vial can be put back at all.
    if (outcome.kind === 'vialRemoved') {
      overlay.toast('Spare vial put back');
      return;
    }
    // Silent when the move was already paid for: a charge the player did not
    // incur should not be announced, and the board moving is the feedback.
    if (outcome.kind !== 'undone') return;
    if (outcome.charged > 0) {
      // What it cost and what is left, in that order. A deduction with no
      // balance beside it makes the player check the pill at the top of the
      // screen to find out where they are — and the board is where they are
      // looking. Read after the charge, so it is the balance they now have.
      const left = compactCoins(useEconomyStore.getState().coins);
      overlay.toast(`Undo · −${outcome.charged} coins · ${left} left`);
      return;
    }
    // The last free one is worth announcing; the ones before it are not. A
    // player told "2 left" after every undo is being nagged about a budget
    // they have not reached — but arriving at the board's first *charged* undo
    // with no warning is worse.
    //
    // `spentAllowance` is what keeps it to that one moment. Both a free undo
    // and a re-undo of a move already paid for report `charged: 0`, so on the
    // flag alone this fired again every time the player rewound the same move
    // — a warning about a budget, raised by the action that does not touch it.
    if (outcome.spentAllowance && outcome.freeLeft === 0) {
      // The balance goes with the price. This is the one moment the player is
      // told undo has started costing, and the price only means something
      // against what they have — 10 each is nothing at 4,000 and is the last
      // two undos at 25. Compact, because a balance is the tail of a sentence
      // here and `12,480` pushes the line into a second row on a narrow phone.
      const balance = compactCoins(useEconomyStore.getState().coins);
      overlay.toast(`Free undos used — ${PRICES.undo} coins each · ${balance} left`);
    }
  }, []);
  const redo = useCallback(() => playPour(useGameStore.getState().redo()), [playPour]);
  const restart = useCallback(() => useGameStore.getState().restart(), []);
  const hint = useCallback(() => {
    // It points rather than plays: the source is armed and the destination
    // ringed, and the player still makes the pour.
    const outcome = useGameStore.getState().hint();
    if (outcome.kind === 'ignored') return;

    if (outcome.kind === 'shown') {
      // Silent when it was free, and when it was already on the board. A charge
      // the player did not incur must not be announced.
      if (outcome.charged > 0) {
        // The same shape as a charged undo, balance and all — two meters that
        // read differently would make one of them look broken. Read after the
        // charge, so it is the balance the player now has.
        const left = compactCoins(useEconomyStore.getState().coins);
        overlay.toast(`Hint · −${outcome.charged} coins · ${left} left`);
      }
      return;
    }

    // The button ticked on the way in. Answer a refusal differently, or being
    // turned down feels the same as being helped.
    feedbackWarn();
    overlay.toast(HINT_REFUSAL[outcome.kind]);
  }, []);
  const addVial = useCallback(() => {
    // Spec §10 makes this the rewarded-ad slot. The ad is phase 2; the vial
    // is free for now so the escape hatch exists at all.
    //
    // The refusal branch stays, even though the button is disabled once the
    // vial is taken: `addTube` also declines mid-pour and on a solved board,
    // which no disabled state covers.
    const added = useGameStore.getState().addTube();
    if (!added) feedbackWarn();
    overlay.toast(added ? 'An empty vial, on the house' : 'Only one spare vial per level');
  }, []);

  return (
    <View style={[styles.root, padding.frame]}>
      <View style={styles.hud}>
        <ChromeIconButton icon="back" onPress={onExit} label="Back" />
        <View style={styles.hudMiddle}>
          {/* The bonus board has no level number — `level` holds the day index
              while it is loaded, which would print as "Level 20675". */}
          <Text style={styles.hudLevel}>{bonus ? "Today's brew" : `Level ${level}`}</Text>
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
            hintTo={hintTo}
            animation={pour}
            progress={progress}
            marks={marks}
            skin={skin}
          />
        </View>
      </GestureDetector>

      <View style={styles.controls}>
        <ControlButton
          icon="undo"
          label="Undo"
          onPress={undo}
          // Live at zero moves when a spare vial is out — that press is what
          // puts it back. Without this the only way out of a vial taken by
          // mistake was restarting the whole level.
          disabled={moves === 0 && !vialTaken}
          price={undoPrice}
        />
        <ControlButton icon="redo" label="Redo" onPress={redo} disabled={undone === 0} />
        <ControlButton icon="hint" label="Hint" onPress={hint} price={hintPrice} />
        {/* Spent, not merely unhelpful: one vial per level, so the control has
            nothing left to give. Genuinely disabled rather than greyed, which
            is what keeps a dead press silent — a disabled `Pressable` never
            fires `onPress`, so no tick and no toast. */}
        <ControlButton
          icon="addVial"
          label="Add vial"
          onPress={addVial}
          disabled={vialTaken}
        />
      </View>
    </View>
  );
});
