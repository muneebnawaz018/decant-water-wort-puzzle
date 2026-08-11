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
import { showRewarded } from '@/ads/rewarded';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useGameStore, type PaidOutside, type TapOutcome } from '@/state/gameStore';
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

/**
 * Whether a control actually did its job, and what to say if it did not.
 *
 * The reason travels back rather than being toasted on the spot, because an
 * ad-paid press has one more thing to add to it — and two toasts for one press
 * means the second wipes the first before it can be read.
 */
type RunResult = { ok: true } | { ok: false; reason: string };

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
  /**
   * A refusal, worded once.
   *
   * It toasts on an ordinary press and stays quiet on an ad-paid one, because
   * there the caller has something more to say — see `askToPay`. Returning the
   * words rather than printing them is what keeps the player from getting two
   * toasts for one press, the second wiping the first.
   */
  const refuse = useCallback((reason: string, paid?: PaidOutside): RunResult => {
    feedbackWarn();
    if (!paid) overlay.toast(reason);
    return { ok: false, reason };
  }, []);

  const runUndo = useCallback(
    (paid?: PaidOutside): RunResult => {
      const outcome = useGameStore.getState().undo(paid);
      if (outcome.kind === 'blocked') {
        return refuse(`Undo costs ${outcome.price} coins — not enough`, paid);
      }
      // Nothing to take back, or the board is mid-pour. Silent on an ordinary
      // press — a dead control that says nothing is the right amount of noise
      // — but it is exactly the case an ad must not disappear into.
      if (outcome.kind === 'ignored') {
        return refuse('That move could not be taken back', paid);
      }
      // Undo's last step on a level with a spare vial out: the vial goes back,
      // free. Announced because the board changing shape is a bigger thing than
      // a pour and the player may not have meant to go that far — and because
      // nothing else in the app tells them the vial can be put back at all.
      if (outcome.kind === 'vialRemoved') {
        overlay.toast('Spare vial put back');
        return { ok: true };
      }
      if (outcome.charged > 0) {
        // What it cost and what is left, in that order. A deduction with no
        // balance beside it makes the player check the pill at the top of the
        // screen to find out where they are — and the board is where they are
        // looking. Read after the charge, so it is the balance they now have.
        const left = compactCoins(useEconomyStore.getState().coins);
        overlay.toast(`Undo · −${outcome.charged} coins · ${left} left`);
        return { ok: true };
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
      return { ok: true };
    },
    [refuse]
  );

  /**
   * A paid press asks first, and offers a second way to pay.
   *
   * The coins used to come out on the press itself. That is fine for a free
   * one and wrong the moment it costs: undo and hint sit under a thumb during
   * a board, they are the two easiest controls in the game to hit by accident,
   * and a silent deduction is the one outcome a player cannot undo — the coins
   * are gone and the toast telling them so has already faded.
   *
   * So the dialog does two jobs. It is a confirmation, which is what a mis-tap
   * needs, and it is where the ad lives — the player picks whether this one
   * costs coins or a video, which is a choice they never had.
   *
   * The ad takes the right slot and the lit face, the same arrangement the
   * daily reward's doubling offer uses: both answers deliver the thing, and the
   * one being steered towards is the one that costs the player nothing.
   */
  const askToPay = useCallback(
    (spec: {
      slot: 'undo' | 'hint';
      title: string;
      price: number;
      run: (paid?: PaidOutside) => RunResult;
    }) => {
      overlay.modal({
        title: spec.title,
        body: `${spec.price} coins, or watch a short video instead.`,
        confirmLabel: `Pay ${spec.price}`,
        confirmIcon: 'coin',
        secondaryLabel: 'Watch ad',
        secondaryIcon: 'video',
        // No cancel button. The scrim dismisses, and a third button on a
        // question with two answers is the shape `Overlays` already refuses.
        cancelLabel: null,
        onConfirm: () => spec.run(),
        onSecondary: () => {
          void showRewarded(spec.slot).then((outcome) => {
            if (outcome === 'earned') {
              const result = spec.run('ad');
              if (result.ok) return;

              /*
                A watched ad always pays.

                The action can still refuse after the video — the hint's search
                does not run until then, so `stuck` is reachable, and either
                control can come back `ignored` if the board moved underneath
                the offer. Both would otherwise spend the ad on nothing, and the
                undo case would do it in silence.

                Paying the price in coins is the honest settlement rather than a
                consolation: the player agreed to a video *as the price of this
                thing*, and if the thing cannot be delivered they should be left
                holding what the video was worth. It also cannot be farmed — the
                offer only opens from a control that is genuinely priced.
              */
              useEconomyStore.getState().add(spec.price);
              feedbackWarn();
              overlay.toast(`${result.reason} — ${spec.price} coins added instead`);
              return;
            }
            feedbackWarn();
            // Two failures, two sentences. A closed ad is the player's own
            // choice and needs no apology; an empty auction is the app failing
            // to deliver what it offered, so that one names the way through
            // that still works.
            overlay.toast(
              outcome === 'dismissed'
                ? 'Ad closed early — nothing spent'
                : 'No ad available — coins still work'
            );
          });
        },
      });
    },
    []
  );

  /**
   * Free presses go straight through; priced ones raise the dialog.
   *
   * The condition is the badge's own, so the button and the dialog cannot
   * disagree about what a press costs. It is an estimate in two rare cases the
   * store decides differently on — a fallback hint, or a position already
   * answered — and both resolve in the player's favour: `Pay` charges nothing,
   * because the store re-checks and waives it.
   */
  const undo = useCallback(() => {
    if (undoPrice === 0) {
      runUndo();
      return;
    }
    askToPay({
      slot: 'undo',
      title: 'Take that move back?',
      price: undoPrice,
      run: runUndo,
    });
  }, [undoPrice, runUndo, askToPay]);

  const redo = useCallback(() => playPour(useGameStore.getState().redo()), [playPour]);
  const restart = useCallback(() => useGameStore.getState().restart(), []);
  const runHint = useCallback(
    (paid?: PaidOutside): RunResult => {
      // It points rather than plays: the source is armed and the destination
      // ringed, and the player still makes the pour.
      const outcome = useGameStore.getState().hint(paid);
      // Mid-pour, or the board is already solved. Silent on an ordinary press;
      // named when an ad paid for it, so the watch is accounted for.
      if (outcome.kind === 'ignored') {
        return refuse('The board moved — no hint given', paid);
      }

      if (outcome.kind === 'shown') {
        // Silent when it was free, and when it was already on the board. A
        // charge the player did not incur must not be announced.
        if (outcome.charged > 0) {
          // The same shape as a charged undo, balance and all — two meters that
          // read differently would make one of them look broken. Read after the
          // charge, so it is the balance the player now has.
          const left = compactCoins(useEconomyStore.getState().coins);
          overlay.toast(`Hint · −${outcome.charged} coins · ${left} left`);
        }
        return { ok: true };
      }

      // The button ticked on the way in. Answer a refusal differently, or being
      // turned down feels the same as being helped.
      //
      // `stuck` is the one that matters here: the search runs *after* the ad,
      // so a player can watch a video and be told the board cannot be won. The
      // ad is still paid for — see `askToPay`.
      return refuse(HINT_REFUSAL[outcome.kind], paid);
    },
    [refuse]
  );

  const hint = useCallback(() => {
    if (hintPrice === 0) {
      runHint();
      return;
    }
    askToPay({
      slot: 'hint',
      title: 'Show the next move?',
      price: hintPrice,
      run: runHint,
    });
  }, [hintPrice, runHint, askToPay]);
  const addVial = useCallback(() => {
    /*
      Doc §10's rewarded slot, and the highest-value one in the game: it is
      asked for at the moment a player is stuck.

      Through `showRewarded` rather than straight to the store, so the ad, when
      it lands, needs no change here. It resolves `earned` today because there
      is nothing to watch, and `paysWithoutAd` keeps it resolving `earned`
      whenever no ad fills — a board with no way out is not something an empty
      auction is allowed to create.

      `void` and not `await`: the handler answers the press, and the store call
      is already guarded against a board that moved underneath it.
    */
    void showRewarded('spare_vial').then((outcome) => {
      if (outcome === 'dismissed') {
        feedbackWarn();
        overlay.toast('No vial — the ad was closed early');
        return;
      }

      // The refusal branch stays, even though the button is disabled once the
      // vial is taken: `addTube` also declines mid-pour and on a solved board,
      // which no disabled state covers.
      const added = useGameStore.getState().addTube();
      if (!added) feedbackWarn();
      overlay.toast(
        added ? 'An empty vial, on the house' : 'Only one spare vial per level'
      );
    });
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
