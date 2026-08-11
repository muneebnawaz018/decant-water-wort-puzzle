import { create } from 'zustand';

import type { Colour, PourMove, WaterState } from '@/core/types';
import { optimalLine } from '@/core/solver';
import { applyPour, canPour, isSolved } from '@/core/waterCore';
import { DIFFICULTIES, type Difficulty } from '@/game/difficulty';
import { dayIndex, generateBonus } from '@/game/dailyPuzzle';
import { EARNINGS, FREE_HINTS, PRICES } from '@/game/economy';
import { lineMap, positionKey, suggestPour, type HintSearch } from '@/game/hint';
import { coinsForImprovement, milestoneBonus, starsFor } from '@/game/stars';
import { forgetFrom, freeUndosFor, undoCharge, withUndoPaid } from '@/game/undoCost';
import { generateLevel } from '@/game/waterGenerator';
import { useBonusStore } from './bonusStore';
import { useEconomyStore } from './economyStore';
import { overlay } from './overlayStore';
import {
  firstUnsolved,
  loadProgress,
  progressFor,
  markBlockPaid,
  progressFor as _progressFor,
  recordCompletion,
  saveProgress,
  setCurrentLevel,
  starsInBlock,
  unpaidBlockFor,
  type Progress,
  type ProgressByDifficulty,
} from './progress';
import {
  clearSession,
  loadSession,
  packMoves,
  restoreSession,
  saveSession,
} from './session';
import { useSettingsStore } from './settingsStore';

/** What an undo did, so the UI can answer a refusal differently from a success. */
type UndoOutcome =
  /**
   * Taken back. `charged` is 0 when the move was already paid for or the
   * level's allowance covered it; `freeLeft` is what remains of that allowance.
   *
   * `spentAllowance` tells those two zeros apart, and the screen needs it: one
   * of them used something up and the other did not. Without it, "free undos
   * used" fired again on every re-undo of a move already paid for — a warning
   * about a budget, raised by the one action that does not touch the budget.
   */
  | { kind: 'undone'; charged: number; freeLeft: number; spentAllowance: boolean }
  /**
   * The spare vial put back, on an undo with no moves left to take back.
   *
   * Free, and deliberately so. Taking the vial is a one-per-level decision the
   * player often makes early and regrets — it makes a board easier to finish
   * and there was no way out of it short of restarting the whole level. Undo is
   * where "I did not mean that" lives, so it belongs there; charging for it
   * would be billing someone to *undo* the help they took, which is the one
   * thing in this economy that has never cost anything.
   */
  | { kind: 'vialRemoved' }
  /** Not enough coins. The board is untouched. */
  | { kind: 'blocked'; price: number }
  /** Nothing to undo, or a pour is animating. */
  | { kind: 'ignored' };

export interface GameState {
  level: number;
  difficulty: Difficulty;
  board: WaterState;
  /** Move count a three-star run has to match. From the generator, not hand-set. */
  par: number;
  /** Stars for the run just finished, 0 until the level is solved. */
  earned: number;
  /**
   * Coins the run just finished actually paid.
   *
   * Held rather than recomputed from `earned`, because the two can disagree: a
   * replay that matches a previous result earns three stars and no coins. The
   * Complete screen prints this, so what it announces is what landed in the
   * balance.
   */
  earnedCoins: number;
  /** Board as generated, for restart. */
  initial: WaterState;
  history: PourMove[];
  /** Undone moves, newest last. A fresh pour discards them. */
  future: PourMove[];
  selected: number | null;
  solved: boolean;
  /** True while a pour animates. Blocks input, doc §7. */
  locked: boolean;
  /** Whether the level's one spare vial has been taken. */
  extraTaken: boolean;
  /**
   * Whether the board on screen is the daily bonus puzzle rather than a level.
   *
   * A flag on the same store rather than a second engine: the bonus board is
   * played with the identical rules, controls, undo economy and renderer, and
   * the only things that differ are where the board came from and what
   * finishing it does. Duplicating `gameStore` to change two of those would
   * mean every future rule landing in one copy.
   *
   * What it switches off is the progress record. A bonus board unlocks
   * nothing, has no place in a star total and completes no milestone block —
   * it is not a level, and `level` holds the day index while it is set, which
   * would be a nonsense level number to write into progress.
   */
  bonus: boolean;
  /**
   * Depths in `history` whose undo has already been paid for.
   *
   * Undo costs coins; redo does not. Taking a move back, putting it forward and
   * taking it back again is one decision revisited, so only the first undo of a
   * given move is charged — this is what remembers which ones those were. A
   * fresh pour at a depth drops the mark there, because that is a new move
   * rather than the one that was paid for.
   */
  paidUndos: number[];
  /**
   * How many of this level's free undos have gone.
   *
   * Per level and reset by restart, so a board is never harsher for being long.
   * Counted rather than derived from `paidUndos`: a re-undo of a move already
   * paid for spends nothing, so the two numbers move independently.
   */
  freeUndosUsed: number;
  /**
   * Hints taken on this level, free and paid together.
   *
   * A count rather than the old boolean because hints no longer run out — the
   * first `FREE_HINTS` are free and the rest cost `PRICES.hint`, so what has
   * to be remembered is how far into that the player is.
   */
  hintsUsed: number;
  /**
   * The pour the last hint pointed at, until the board changes.
   *
   * Kept as a move rather than as two tube indices because the destination is
   * the half the old hint threw away — it set `selected` to the source and
   * discarded the `to` it had already worked out, leaving the player to guess
   * where the highlighted tube was meant to go.
   */
  hintMove: PourMove | null;
  /**
   * The hint already delivered for this exact position, paid or free.
   *
   * Separate from `hintMove` because the two clear on different events, and
   * conflating them was a double-billing bug: `hintMove` is the *display*, and
   * selecting any vial dismisses it — but selecting a vial does not change the
   * board, so the answer the player bought is still the answer. This field
   * clears only where the board actually changes (pour, undo, redo, restart,
   * spare vial, level load); until then, pressing Hint again re-shows it free.
   */
  heldHint: PourMove | null;
  /**
   * Positions a hint has already been delivered at, this level.
   *
   * The hint flow's `paidUndos`: `heldHint` covers "the pointer is on screen",
   * this covers "the answer was bought and the board came back". Undo the
   * hinted pour and the position returns — the player has already seen the
   * move for it, so asking again is free and spends nothing. Keyed by
   * position rather than by count because undo/redo can revisit any earlier
   * position in any order.
   */
  paidHints: string[];
  /**
   * The winning line the hints are following, as position → move.
   *
   * Consecutive hints have to agree, and independent searches do not: a search
   * from one position can answer with the move that undoes the last one, and
   * following that alternates forever — measured, on real generated boards.
   *
   * So one search plans the whole route and every position on it is answered
   * from that plan. Falling off it (the player pours something else) simply
   * misses, and the next press plans again from there. The plan is seeded off
   * the load path by `refinePar` — the same search that computes par returns
   * the optimal line, so the first press on an untouched board answers
   * instantly.
   *
   * Each entry keeps whether its line was the provably shortest one, because
   * billing reads it: continuing a fallback plan must stay as free as the
   * press that planned it — see `hint`.
   *
   * Not persisted: it is a cache, rebuildable by one search, and `paidHints`
   * is the part that has to survive a relaunch.
   */
  hintLine: Record<string, PlannedHint>;
  record: ProgressByDifficulty;

  loadLevel: (level: number) => void;
  /** Switches mode and jumps to wherever that mode was left. */
  setDifficulty: (difficulty: Difficulty) => void;
  /** Handles a tap on a tube. Returns what the UI should react to. */
  tapTube: (index: number) => TapOutcome;
  /**
   * Takes back the last move, for `UNDO_COST` coins the first time each is
   * taken back. Returns what the UI should say about it.
   */
  undo: () => UndoOutcome;
  /** Replays the most recently undone move. Same shape as `tapTube`'s
   * outcome, so the renderer can animate it exactly like a fresh pour. */
  redo: () => TapOutcome;
  restart: () => void;
  /**
   * Points at a pour on a winning line, for `PRICES.hint` coins once the
   * level's free one is gone. Returns what the UI should say about it.
   */
  hint: () => HintOutcome;
  /** Adds one empty tube. Spec §10's rewarded slot; one per level. */
  addTube: () => boolean;
  /**
   * Loads today's bonus puzzle. Returns false when it has already been played.
   *
   * The gate is here rather than only on the screen so the board cannot be
   * reached twice by any route.
   */
  loadBonus: (now: number) => boolean;
  nextLevel: () => void;
  /** Opens the level the record says is current. See the implementation. */
  resumeCurrent: () => void;
  setLocked: (locked: boolean) => void;
  /** Progress for the mode being played. */
  progress: () => Progress;
}

/** One entry of the plan the hints follow — see `hintLine` on the state. */
interface PlannedHint {
  move: PourMove;
  /** Whether the line this came from is the provably shortest. Decides billing. */
  optimal: boolean;
}

/**
 * What pressing Hint did, so the screen can answer each case differently.
 *
 * Five cases rather than a nullable move, because four of them are refusals
 * and they do not mean the same thing. "Not enough coins" is a price, "this
 * board cannot be won" is news the player needs and cannot get anywhere else,
 * "couldn't find one" is the search giving up without proving anything, and
 * "not now" is the pour animation still running. Collapsing any two would put
 * one toast on both.
 */
type HintOutcome =
  /**
   * A pour on a winning line. Source and destination are both highlighted.
   * `charged` is 0 for the level's free hint and for re-showing one already
   * bought and still on the board.
   */
  | { kind: 'shown'; move: PourMove; charged: number }
  /** Not enough coins. Nothing is revealed and nothing is spent. */
  | { kind: 'blocked'; price: number }
  /** No winning line exists from here — proved, not guessed. Free. */
  | { kind: 'stuck' }
  /**
   * The search hit its node budget before finishing either way. Free, and
   * worded differently from `stuck` on screen: "couldn't find one" is not
   * "there is none", and a paid feature must not dress the first up as the
   * second.
   */
  | { kind: 'unsure' }
  /** Mid-pour or already solved. Nothing to say. */
  | { kind: 'ignored' };

export type TapOutcome =
  | { kind: 'ignored' }
  | { kind: 'selected'; tube: number }
  | { kind: 'deselected'; tube: number }
  /**
   * A refused pour. `armed` is whether the tapped tube took the selection —
   * see `tapTube`. The renderer treats both the same; the haptics do not,
   * because an armed tube means something did happen.
   */
  | { kind: 'illegal'; tube: number; armed: boolean }
  | {
      kind: 'poured';
      move: PourMove;
      solved: boolean;
      /** Colour that moved, and how full the destination was — the renderer
       * needs both to animate the pour, and they are gone once it lands. */
      colour: Colour;
      destFilled: number;
    };

export const useGameStore = create<GameState>((set, get) => {
  const difficulty = useSettingsStore.getState().difficulty;
  const record = loadProgress();
  // The frontier, not the last level opened — someone who replayed level 3 and
  // closed the app should come back to where they actually are. A saved session
  // overrides this below; it carries its own level.
  const startLevel = firstUnsolved(progressFor(record, difficulty));
  const first = generateLevel(startLevel, difficulty);

  // A level left half-solved comes back as it was left. The stored session is
  // only honoured for the level and mode the player is actually returning to;
  // anything else is a leftover and the level starts clean.
  const saved = loadSession();
  const resumed =
    saved && saved.difficulty === difficulty && saved.level === startLevel
      ? restoreSession(saved, first.state)
      : null;
  // Unreadable or no longer replayable — see `replay`. Drop it rather than
  // leave a record that fails the same way on every launch.
  if (saved && !resumed) clearSession();

  /**
   * Writes the level in progress. Called after anything that changes it.
   *
   * MMKV is synchronous, so this lands before the frame does and a force-quit
   * cannot lose the move that caused it — the reason the save is here and not
   * behind an AppState listener, which never runs when the process is killed.
   */
  /**
   * Replaces `par` with the exact fewest pours that finish the level.
   *
   * Deferred rather than computed on load. `par` is only read when a level is
   * solved, which is many seconds of play away, and the search is the one
   * thing here that can take a visible moment on a phone — spending it while
   * the board is appearing would be paying at the only time it is felt.
   *
   * Until it lands, `par` holds `moveLowerBound`, so a rating is always
   * available. That value is what the stars were graded against before this
   * existed, and it is wrong in the same direction as before: a bound sits at
   * or below the optimum, so the bar is too strict, never too generous.
   *
   * The board it measures is the generated one, not the one on screen. A spare
   * vial makes the level easier to finish but is not a different puzzle, and
   * par has to mean the same thing whether or not one was taken.
   */
  const refinePar = (level: number, mode: Difficulty, board: WaterState): void => {
    setTimeout(() => {
      // The player may have moved on while this was queued.
      if (get().level !== level || get().difficulty !== mode) return;

      const exact = optimalLine(board);
      // Null means the node cap was hit. Keep the bound: a level nobody can
      // three-star is better than one where everybody does.
      if (exact.moves === null) return;
      if (get().level !== level || get().difficulty !== mode) return;

      // One search, two answers: the line's length is par, and the line itself
      // seeds the hint plan, so the first press on an untouched board costs no
      // search at all. Existing entries win the merge — a hint bought in the
      // tick before this landed answered from a plan of its own, and the
      // answer delivered must stay the answer.
      const plan: Record<string, PlannedHint> = {};
      for (const [key, move] of Object.entries(lineMap(board, exact.moves))) {
        plan[key] = { move, optimal: true };
      }
      set({ par: exact.moves.length, hintLine: { ...plan, ...get().hintLine } });
    }, 0);
  };

  /**
   * What the last settled completion handed over, for the state update that
   * follows it.
   */
  let lastPayout = 0;

  /**
   * Everything a finished level pays — the level's own coins and the block of
   * ten it may have completed — computed against the record. **No coins move
   * here.** The caller persists the returned record and then calls `settleUp`,
   * in that order, and the order is the point: the paid mark and the level's
   * own result land on disk in one write *before* the wallet is touched. A
   * crash in the gap forfeits a payout; the other way round, the mark is lost
   * after the coins moved, and replaying the level mints the bonus again —
   * and that gap a player can aim for by killing the app on the win frame.
   * `payBonus` makes the same trade for the same reason.
   *
   * Both halves still pay once. The milestone has `paidBlocks`; the level
   * itself is guarded by its own previous star count, since a replay that does
   * no better has earned nothing new. `previousStars` has to be read *before*
   * the completion is recorded, which is why it is passed in rather than
   * looked up here — by the time this runs, `record` already holds the run
   * that just finished.
   */
  const payFor = (
    record: ProgressByDifficulty,
    mode: Difficulty,
    level: number,
    stars: number,
    previousStars: number
  ): {
    record: ProgressByDifficulty;
    earned: number;
    bonus: number;
    block: number | null;
  } => {
    const earned = coinsForImprovement(stars, previousStars);

    const progress = _progressFor(record, mode);
    const block = unpaidBlockFor(progress, level);
    const bonus = block === null ? 0 : milestoneBonus(block, starsInBlock(progress, block));

    return {
      record: block !== null && bonus > 0 ? markBlockPaid(record, mode, block) : record,
      earned,
      bonus,
      block,
    };
  };

  /**
   * The coins `payFor` computed, paid once the marked record is on disk.
   *
   * Landing them the moment the board is solved rather than on the Complete
   * screen, so a player who backs out during the win animation keeps them.
   */
  const settleUp = (paid: {
    earned: number;
    bonus: number;
    block: number | null;
  }): void => {
    lastPayout = paid.earned;
    if (paid.earned > 0) useEconomyStore.getState().add(paid.earned);
    if (paid.block !== null && paid.bonus > 0) {
      useEconomyStore.getState().add(paid.bonus);
      overlay.toast(`Block ${paid.block} complete · +${paid.bonus} coins`);
    }
  };

  /**
   * What finishing the daily bonus puzzle pays.
   *
   * **On stars, at `bonusPuzzlePerStar` each**, so 40, 80 or 120. It used to be
   * a flat 120 on the reasoning that the brew was always the hardest board the
   * generator makes, where a rating would mostly measure patience. The brew
   * follows the player now, so a flat payout would hand the same coins to a
   * six-colour board and a twelve-colour one.
   *
   * Stars are already how this game says how well a board was played, and they
   * need no separate difficulty dial bolted on: there is no fail state, so a
   * finished brew always pays at least one star's worth.
   *
   * Nothing is written to `progress` — the board is not a level, so it unlocks
   * nothing and belongs in no star total. `bonusStore` holds the only record of
   * it, which is also the cooldown.
   *
   * Ordered so the mark lands first: `complete` is idempotent within a day, so
   * a second call cannot pay twice however the win path is re-entered — and a
   * redo of the winning pour does re-enter it.
   */
  const payBonus = (stars: number): number => {
    const store = useBonusStore.getState();
    const now = Date.now();
    if (!store.available(now) && store.solvedDay === dayIndex(now)) return 0;

    const paid = Math.max(1, Math.floor(stars)) * EARNINGS.bonusPuzzlePerStar;
    store.complete(now);
    useEconomyStore.getState().add(paid);
    return paid;
  };

  const persistSession = (): void => {
    // The bonus board is never saved. `session.v1` is keyed by difficulty and
    // level, and a bonus board has neither — restoring one would replay its
    // moves onto that level's board. See `loadBonus`.
    if (get().bonus) return;

    const {
      difficulty: mode,
      level,
      history,
      extraTaken,
      hintsUsed,
      paidHints,
      paidUndos,
      freeUndosUsed,
    } = get();
    saveSession({
      difficulty: mode,
      level,
      moves: packMoves(history),
      extraTaken,
      hintsUsed,
      paidHints,
      paidUndos,
      freeUndosUsed,
    });
  };

  // The level restored at launch gets the same treatment as one loaded by hand.
  // Safe to schedule before the store exists: everything inside reads through
  // `get()`, and none of it runs until the timer fires.
  refinePar(startLevel, difficulty, first.state);

  return {
    level: startLevel,
    difficulty,
    board: resumed?.board ?? first.state,
    initial: resumed?.initial ?? first.state,
    par: first.report.lowerBound,
    earned: 0,
    earnedCoins: 0,
    history: resumed?.history ?? [],
    future: [],
    selected: null,
    solved: false,
    locked: false,
    extraTaken: saved?.extraTaken === true && resumed !== null,
    // Never restored. A bonus board in progress is not saved — see `loadBonus`.
    bonus: false,
    // Only meaningful alongside the moves it refers to, so it is dropped with
    // them when a session fails to restore.
    paidUndos: resumed !== null ? (saved?.paidUndos ?? []) : [],
    freeUndosUsed: resumed !== null ? (saved?.freeUndosUsed ?? 0) : 0,
    hintsUsed: resumed !== null ? (saved?.hintsUsed ?? 0) : 0,
    hintMove: null,
    heldHint: null,
    paidHints: resumed !== null ? (saved?.paidHints ?? []) : [],
    hintLine: {},
    record,

    progress: () => progressFor(get().record, get().difficulty),

    loadLevel: (level) => {
      const mode = get().difficulty;
      const generated = generateLevel(level, mode);
      const next = setCurrentLevel(get().record, mode, level);
      saveProgress(next);
      // A new level has nothing in progress yet, and the old record must not
      // outlive the level it belongs to.
      clearSession();

      set({
        level,
        board: generated.state,
        initial: generated.state,
        par: generated.report.lowerBound,
        earned: 0,
        earnedCoins: 0,
        history: [],
        future: [],
        paidUndos: [],
        freeUndosUsed: 0,
        selected: null,
        solved: false,
        locked: false,
        extraTaken: false,
        bonus: false,
        hintsUsed: 0,
        hintMove: null,
        heldHint: null,
        paidHints: [],
        hintLine: {},
        record: next,
      });
      refinePar(level, mode, generated.state);
    },

    setDifficulty: (difficulty) => {
      if (get().difficulty === difficulty) return;

      // Each mode remembers where it was left, so switching is not a reset.
      // Each mode keeps its own place, and that place is its frontier.
      const level = firstUnsolved(progressFor(get().record, difficulty));
      const generated = generateLevel(level, difficulty);
      // Switching modes drops whatever was in progress. Keeping one session
      // per mode would need a record per mode; the level is remembered either
      // way, and the moves within it are cheap to redo.
      clearSession();

      set({
        difficulty,
        level,
        board: generated.state,
        initial: generated.state,
        par: generated.report.lowerBound,
        earned: 0,
        earnedCoins: 0,
        history: [],
        future: [],
        paidUndos: [],
        freeUndosUsed: 0,
        selected: null,
        solved: false,
        locked: false,
        extraTaken: false,
        bonus: false,
        hintsUsed: 0,
        hintMove: null,
        heldHint: null,
        paidHints: [],
        hintLine: {},
      });
      refinePar(level, difficulty, generated.state);
    },

    tapTube: (index) => {
      const { board, selected, locked, solved } = get();
      if (locked || solved) return { kind: 'ignored' };

      const tube = board.tubes[index];
      if (!tube) return { kind: 'ignored' };

      if (selected === null) {
        // Nothing to lift out of an empty tube.
        if (tube.length === 0) return { kind: 'ignored' };
        set({ selected: index, hintMove: null });
        return { kind: 'selected', tube: index };
      }

      if (selected === index) {
        set({ selected: null, hintMove: null });
        return { kind: 'deselected', tube: index };
      }

      if (!canPour(board, selected, index)) {
        // Move the selection to the tube just tapped rather than keeping the
        // old one armed. A refused pour is nearly always a mis-tap on the
        // source, not on the target, so treating the second tap as the new
        // source is what the player meant — otherwise they have to tap the
        // wrong tube again to clear it before they can start over.
        //
        // The target always has liquid in it: a pour into an empty tube is
        // legal whenever the source has anything, so reaching here means the
        // target is full or holds a different colour. Guarded anyway.
        const takeable = board.tubes[index]!.length > 0;
        set({ selected: takeable ? index : null, hintMove: null });
        return { kind: 'illegal', tube: index, armed: takeable };
      }

      // Captured before the pour lands — afterwards the source has lost the
      // segments and the destination has already grown.
      const source = board.tubes[selected]!;
      const colour = source[source.length - 1]!;
      const destFilled = tube.length;

      const applied = applyPour(board, selected, index)!;
      const nowSolved = isSolved(applied.state);
      const moves = get().history.length + 1;

      const stars = nowSolved ? starsFor(moves, get().par) : 0;

      set((current) => {
        // Read before the completion is recorded — afterwards this level's
        // entry is the run that just finished, and the comparison is lost.
        const before = _progressFor(current.record, current.difficulty).stars[
          current.level
        ];
        let next =
          nowSolved && !current.bonus
            ? recordCompletion(
                current.record,
                current.difficulty,
                current.level,
                moves,
                stars
              )
            : current.record;
        if (nowSolved) {
          // The bonus board pays flat and writes nothing to progress. `payFor`
          // would file it as a completion of whatever `level` happens to hold,
          // which on a bonus board is the day index.
          if (current.bonus) lastPayout = payBonus(stars);
          else {
            const paid = payFor(
              next,
              current.difficulty,
              current.level,
              stars,
              before ?? 0
            );
            next = paid.record;
            // Mark first, coins second — see `payFor` for why this order.
            saveProgress(next);
            settleUp(paid);
          }
        }

        return {
          board: applied.state,
          history: [...current.history, applied.move],
          // A new branch: whatever was undone is no longer reachable.
          future: [],
          // And the marks that went with it. This move sits at a depth that may
          // already be paid for, but it is not the move that was paid for —
          // without this, undo once, redo, play something else, and the new
          // move comes back for free.
          paidUndos: forgetFrom(current.paidUndos, current.history.length),
          selected: null,
          hintMove: null,
          heldHint: null,
          solved: nowSolved,
          earned: stars,
          earnedCoins: nowSolved ? lastPayout : 0,
          record: next,
        };
      });

      // Solved levels have nothing left to resume, and the record would
      // otherwise sit there until the next level was opened.
      if (nowSolved) clearSession();
      else persistSession();

      return {
        kind: 'poured',
        move: applied.move,
        solved: nowSolved,
        colour,
        destFilled,
      };
    },

    undo: () => {
      const {
        history,
        future,
        initial,
        locked,
        paidUndos,
        freeUndosUsed,
        difficulty,
        extraTaken,
      } = get();
      if (locked) return { kind: 'ignored' };

      /**
       * With nothing left to take back, undo takes the spare vial back.
       *
       * The last step of unwinding a level, and it costs nothing — see
       * `vialRemoved`. Only reachable at zero moves, which is what makes the
       * trim safe: the vial is always the last tube, so with no history no move
       * can name it and every other index is unchanged. That is the same
       * argument `restart` makes.
       */
      if (history.length === 0) {
        if (!extraTaken) return { kind: 'ignored' };

        const board = { ...initial, tubes: initial.tubes.slice(0, -1) };
        set({ board, initial: board, extraTaken: false, selected: null, hintMove: null });
        persistSession();
        return { kind: 'vialRemoved' };
      }

      /**
       * The charge, before the board moves.
       *
       * Undo costs coins and redo does not, so the pair is not symmetrical —
       * and the asymmetry is the design: a move you have already paid to take
       * back stays taken back, however many times you change your mind about
       * it. Only the *first* undo of a given move is billed.
       *
       * A player who cannot afford it is refused rather than taken into debt.
       * That does leave a board they cannot rewind, which is why restart stays
       * free: there is no fail state here, and being unable to undo must not
       * become one.
       */
      const depth = history.length - 1;
      const charge = undoCharge(paidUndos, depth, freeUndosUsed, difficulty);
      // Affordability is checked here; the coins move only after the paid mark
      // is on disk, below. Deduct-first had a crash window in the hostile
      // direction — coins gone, mark lost, and the same undo billed again on
      // relaunch. This way round the window hands out a free undo instead.
      if (charge.coins > 0 && useEconomyStore.getState().coins < charge.coins) {
        return { kind: 'blocked', price: charge.coins };
      }

      // Replaying from the start is cheaper to reason about than inverting a
      // pour, and a board is at most a few dozen moves deep.
      const remaining = history.slice(0, -1);
      let board = initial;
      for (const move of remaining) {
        board = applyPour(board, move.from, move.to)!.state;
      }
      set({
        board,
        history: remaining,
        future: [...future, history[history.length - 1]!],
        paidUndos: withUndoPaid(paidUndos, depth),
        freeUndosUsed: freeUndosUsed + (charge.usesAllowance ? 1 : 0),
        selected: null,
        hintMove: null,
        heldHint: null,
        solved: false,
      });
      persistSession();
      // The mark is saved; now the wallet. Cannot refuse — the balance was
      // checked above and nothing here runs concurrently.
      if (charge.coins > 0) useEconomyStore.getState().spend(charge.coins);
      return {
        kind: 'undone',
        charged: charge.coins,
        freeLeft: freeUndosFor(difficulty) - freeUndosUsed - (charge.usesAllowance ? 1 : 0),
        spentAllowance: charge.usesAllowance,
      };
    },

    redo: () => {
      const { board, future, locked, solved } = get();
      if (locked || solved || future.length === 0) return { kind: 'ignored' };

      const move = future[future.length - 1]!;
      // The move was legal when it was made and the board has been rewound to
      // exactly that position, so this cannot fail. Guarded anyway rather than
      // asserted: a redo that silently corrupts the board is worse than a no-op.
      const applied = applyPour(board, move.from, move.to);
      if (!applied) return { kind: 'ignored' };

      const source = board.tubes[move.from]!;
      const colour = source[source.length - 1]!;
      const destFilled = board.tubes[move.to]!.length;

      const nowSolved = isSolved(applied.state);
      const moves = get().history.length + 1;

      const stars = nowSolved ? starsFor(moves, get().par) : 0;

      set((current) => {
        // Read before the completion is recorded — afterwards this level's
        // entry is the run that just finished, and the comparison is lost.
        const before = _progressFor(current.record, current.difficulty).stars[
          current.level
        ];
        let next =
          nowSolved && !current.bonus
            ? recordCompletion(
                current.record,
                current.difficulty,
                current.level,
                moves,
                stars
              )
            : current.record;
        if (nowSolved) {
          // The bonus board pays flat and writes nothing to progress. `payFor`
          // would file it as a completion of whatever `level` happens to hold,
          // which on a bonus board is the day index.
          if (current.bonus) lastPayout = payBonus(stars);
          else {
            const paid = payFor(
              next,
              current.difficulty,
              current.level,
              stars,
              before ?? 0
            );
            next = paid.record;
            // Mark first, coins second — see `payFor` for why this order.
            saveProgress(next);
            settleUp(paid);
          }
        }

        return {
          board: applied.state,
          history: [...current.history, applied.move],
          future: current.future.slice(0, -1),
          selected: null,
          hintMove: null,
          heldHint: null,
          solved: nowSolved,
          earned: stars,
          earnedCoins: nowSolved ? lastPayout : 0,
          record: next,
        };
      });

      if (nowSolved) clearSession();
      else persistSession();

      return {
        kind: 'poured',
        move: applied.move,
        solved: nowSolved,
        colour,
        destFilled,
      };
    },

    restart: () => {
      const { initial, locked, extraTaken } = get();
      if (locked) return;

      /**
       * The spare vial goes back too.
       *
       * Restart used to keep it, on the reasoning that it was the one thing
       * left worth remembering about a board with no moves on it. On a screen
       * that is the opposite: restart puts back the board the level *starts*
       * with, and a player who restarts to try again from scratch is handed a
       * thirteenth vial they did not ask for and cannot put away. It also reads
       * as a bug, because there is no way to tell it apart from one.
       *
       * `initial` grows when the vial is taken — undo replays from it, so it
       * has to — which is why this trims rather than reloads. The spare is
       * always appended last and the history is being cleared in the same
       * update, so no move can be left naming it and every other tube keeps its
       * index. Regenerating the level would work too and costs a few
       * milliseconds of solver time for a board this store already holds.
       */
      const board = extraTaken
        ? { ...initial, tubes: initial.tubes.slice(0, -1) }
        : initial;

      set({
        initial: board,
        extraTaken: false,
        board,
        history: [],
        future: [],
        // Restart is free, and it clears the debt with the moves: nothing is
        // left to take back, so nothing can have been paid to take back. The
        // allowance comes back with them, for the same reason — this is the
        // level starting again, not continuing.
        paidUndos: [],
        freeUndosUsed: 0,
        selected: null,
        hintMove: null,
        heldHint: null,
        solved: false,
        earned: 0,
        earnedCoins: 0,
      });
      // A restarted level has no moves and no spare vial, so there is nothing
      // left to resume — `saveSession` drops a record with neither rather than
      // storing one, which is what makes this a clear in practice.
      persistSession();
    },

    /**
     * A hint per press, each one on a winning line, metered after the first.
     *
     * The first on each level is free (`FREE_HINTS`) and the rest cost
     * `PRICES.hint`, so a player who wants the whole board walked for them can
     * have that — at a rate that runs a real deficit against what the level
     * pays. An escape valve with a meter: doc §8's `rewarded_hint` slot, with
     * coins standing in for the ad until phase 2.
     *
     * Order matters and is deliberate:
     *
     * 1. **Re-show before anything.** A hint still on the board is re-shown
     *    free — double-tapping the button must not bill twice for one answer.
     *    `hintMove` clears on every pour, undo and vial, so a stale one can
     *    never be re-shown against a changed board.
     * 2. **Search before charging.** The refusals are free by construction:
     *    coins move only once a move is in hand, so `stuck` and `unsure`
     *    cannot cost anything and no refund path needs to exist.
     * 3. **Charge before revealing.** A player who cannot pay learns the
     *    price, not the move.
     */
    hint: () => {
      const { board, locked, solved, hintsUsed, heldHint, paidHints } = get();
      if (locked || solved) return { kind: 'ignored' };

      // Re-arm, not merely re-return: the player has usually pressed Hint
      // again because the pointer is gone — they selected something else and
      // the display cleared. The answer is still bought; put it back on the
      // board.
      if (heldHint) {
        set({ selected: heldHint.from, hintMove: heldHint });
        return { kind: 'shown', move: heldHint, charged: 0 };
      }

      /**
       * The plan first, a fresh search only when it has nothing to say.
       *
       * A position already on the line is answered from it, which is what
       * keeps consecutive hints consistent — and costs no search at all.
       */
      const key = positionKey(board);
      const planned = get().hintLine[key];
      const search: HintSearch = planned
        ? { kind: 'move', move: planned.move, line: {}, optimal: planned.optimal }
        : suggestPour(board);
      if (search.kind !== 'move') return { kind: search.kind };

      /**
       * Paid before free, free before priced — and perfect before any of it.
       *
       * A fallback line (`optimal: false`) is never billed and consumes
       * nothing, not even the free hint: a paid hint promises the provably
       * shortest continuation, and an answer the search could not perfect is
       * not sold — or counted — as one.
       *
       * A position already delivered at is free outright and consumes no
       * allowance — undo brought the board back, the answer came back with
       * it. Only a genuinely new position can spend the free hint or coins.
       * The solver is deterministic, so recomputing at a recorded position
       * always re-produces the move that was originally delivered.
       */
      const alreadyDelivered = paidHints.includes(key);
      const counted = search.optimal && !alreadyDelivered;
      const price = !counted || hintsUsed < FREE_HINTS ? 0 : PRICES.hint;
      // Checked here, deducted after `persistSession` below — the same order
      // as undo, and for the same reason: a crash between the wallet and the
      // record must err toward a free hint, never a double bill.
      if (price > 0 && useEconomyStore.getState().coins < price) {
        return { kind: 'blocked', price };
      }

      const plan: Record<string, PlannedHint> = {};
      for (const [position, move] of Object.entries(search.line)) {
        plan[position] = { move, optimal: search.optimal };
      }

      // The source is *armed*, not just highlighted: the hint points, and the
      // player still makes the pour. Tapping the marked destination finishes
      // it, which keeps the move theirs.
      set({
        selected: search.move.from,
        hintMove: search.move,
        heldHint: search.move,
        // A re-delivery is not a new hint: the count and the record only move
        // when a position is answered for the first time.
        hintsUsed: counted ? hintsUsed + 1 : hintsUsed,
        paidHints: counted ? [...paidHints, key] : paidHints,
        // Merged, not replaced: a re-plan after the player wandered off the
        // old route still leaves the old route's answers valid, and undo can
        // walk them back onto it.
        hintLine: { ...get().hintLine, ...plan },
      });
      persistSession();
      if (price > 0) useEconomyStore.getState().spend(price);
      return { kind: 'shown', move: search.move, charged: price };
    },

    addTube: () => {
      const { board, locked, solved, extraTaken } = get();
      if (locked || solved || extraTaken) return false;

      const board2: WaterState = { ...board, tubes: [...board.tubes, []] };
      // History is kept: the extra tube changes the board, not the moves made
      // so far, and undo replays from `initial` which grows with it.
      set({
        board: board2,
        initial: { ...get().initial, tubes: [...get().initial.tubes, []] },
        extraTaken: true,
        selected: null,
        // A new tube changes what the winning line is, so any hint still on
        // screen — or held as already-bought — was computed against a board
        // that no longer exists.
        hintMove: null,
        heldHint: null,
      });
      persistSession();
      return true;
    },

    /**
     * Today's bonus puzzle — its own board, not the level in progress.
     *
     * The session is **cleared, not saved**, in both directions. Leaving a
     * level to play the bonus drops that level's moves, and a bonus board in
     * progress is not written anywhere: `session.v1` is keyed by difficulty and
     * level, and a bonus board has neither. Restoring one under a level number
     * would replay bonus moves onto that level's board, which the session's own
     * legality check would then reject on every launch.
     *
     * **`level` holds the day index while this is set, and every reader has to
     * know that.** The comment here used to claim nothing read it as a level,
     * which was wrong four times over: the HUD printed "Level 20676", the
     * Complete screen offered "Level 20677", the leave dialog asked "Leave
     * level 20676?" and the mode-switch dialog warned about it by number.
     * 20676 is not a seed or a bug — it is today's date, counted in days since
     * 1970, which is exactly what makes it look like a plausible level number
     * and stay wrong all day.
     *
     * Reusing the field is still right: it is what makes the HUD, the seed and
     * `refinePar` agree about which board is on screen. But `bonus` is the
     * only thing that says how to read it, so **anything that renders `level`
     * or does arithmetic on it must check `bonus` first**. The tests in
     * `gameStore.test.ts` pin the arithmetic case.
     */
    loadBonus: (now) => {
      if (!useBonusStore.getState().available(now)) return false;

      const day = dayIndex(now);
      /**
       * The furthest level reached in **any** mode, which is what the brew's
       * shape is built against.
       *
       * Across all three rather than the mode being played, so a player who
       * has pushed Hard cannot draw an easy brew by switching to Easy first.
       * Read live: the brew is not saved, so re-opening one left unsolved
       * always meant a board from move zero, and letting the shape move up
       * with the player costs nothing to allow.
       */
      const record = get().record;
      const furthest = DIFFICULTIES.reduce(
        (best, mode) => Math.max(best, progressFor(record, mode).furthestLevel),
        1
      );
      const generated = generateBonus(day, furthest);
      clearSession();

      set({
        level: day,
        bonus: true,
        board: generated.state,
        initial: generated.state,
        par: generated.report.lowerBound,
        earned: 0,
        earnedCoins: 0,
        history: [],
        future: [],
        paidUndos: [],
        freeUndosUsed: 0,
        selected: null,
        solved: false,
        locked: false,
        extraTaken: false,
        hintsUsed: 0,
        hintMove: null,
        heldHint: null,
        paidHints: [],
        hintLine: {},
      });
      // Par matters here more than anywhere: the board is the hardest shape the
      // generator makes, so the bound it starts with is furthest from the truth.
      refinePar(day, get().difficulty, generated.state);
      return true;
    },

    /**
     * The next level up — and never `day + 1` off the bonus board.
     *
     * `level` holds the day index while `bonus` is set, so this read 20677 on
     * a solved brew, and `loadLevel` does not merely open a board: it writes
     * the number through `setCurrentLevel` and saves it. One press would have
     * filed the mode as being on level 20,677, which `firstUnsolved` and the
     * Stages grid then have to make sense of.
     *
     * `CompleteScreen` already routes the bonus board's button to Home rather
     * than here, so nothing reaches this today. It is guarded anyway because
     * the cost of the next caller forgetting is a corrupted progress record,
     * and the guard is one line.
     */
    nextLevel: () => {
      if (get().bonus) return;
      get().loadLevel(get().level + 1);
    },

    /**
     * Opens what Continue should open: an unfinished board, or the frontier.
     *
     * Two cases, in that order.
     *
     * **A board with moves on it and no win yet is what "continue" means**, so
     * it is handed straight back — regenerating it would throw away a position
     * the player is in the middle of, including one restored from a session at
     * launch.
     *
     * **Otherwise the first level this mode has not finished.** Not the last
     * level opened: replaying an old level from the grid would otherwise leave
     * Home offering to continue it forever. Not the loaded board either, which
     * after a win is the level that was just solved and is still mounted behind
     * the Complete screen.
     */
    resumeCurrent: () => {
      const { level, solved, history, record, difficulty, bonus } = get();
      // A part-played board is resumed as it stands — unless it is the daily
      // bonus, which is not on the ladder. Home offers to continue the *mode*,
      // and the bonus puzzle has its own row on the Rewards screen; resuming it
      // from here would hand back a board the card never named.
      if (!bonus && history.length > 0 && !solved) return;

      const target = firstUnsolved(_progressFor(record, difficulty));
      // `bonus` forces the load even when the numbers agree. A bonus level is
      // seed-derived and can land on the target by coincidence, and skipping
      // the load would leave that board on screen under the right title.
      if (bonus || level !== target || solved) get().loadLevel(target);
    },

    setLocked: (locked) => set({ locked }),
  };
});

/** Keeps the board in step when difficulty changes in settings. */
useSettingsStore.subscribe((state, previous) => {
  if (state.difficulty !== previous.difficulty) {
    useGameStore.getState().setDifficulty(state.difficulty);
  }
});
