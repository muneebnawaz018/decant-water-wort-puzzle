import { create } from 'zustand';

import type { Colour, PourMove, WaterState } from '@/core/types';
import { applyPour, canPour, isSolved } from '@/core/waterCore';
import type { Difficulty } from '@/game/difficulty';
import { coinsFor, starsFor } from '@/game/stars';
import { generateLevel } from '@/game/waterGenerator';
import { useEconomyStore } from './economyStore';
import {
  loadProgress,
  progressFor,
  recordCompletion,
  saveProgress,
  setCurrentLevel,
  type Progress,
  type ProgressByDifficulty,
} from './progress';
import { useSettingsStore } from './settingsStore';

export interface GameState {
  level: number;
  difficulty: Difficulty;
  board: WaterState;
  /** Move count a three-star run has to match. From the generator, not hand-set. */
  par: number;
  /** Stars for the run just finished, 0 until the level is solved. */
  earned: number;
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
  record: ProgressByDifficulty;

  loadLevel: (level: number) => void;
  /** Switches mode and jumps to wherever that mode was left. */
  setDifficulty: (difficulty: Difficulty) => void;
  /** Handles a tap on a tube. Returns what the UI should react to. */
  tapTube: (index: number) => TapOutcome;
  undo: () => void;
  /** Replays the most recently undone move. Same shape as `tapTube`'s
   * outcome, so the renderer can animate it exactly like a fresh pour. */
  redo: () => TapOutcome;
  restart: () => void;
  /** Selects the source of a legal pour. Null when the board is stuck. */
  hint: () => PourMove | null;
  /** Adds one empty tube. Spec §10's rewarded slot; one per level. */
  addTube: () => boolean;
  nextLevel: () => void;
  setLocked: (locked: boolean) => void;
  /** Progress for the mode being played. */
  progress: () => Progress;
}

export type TapOutcome =
  | { kind: 'ignored' }
  | { kind: 'selected'; tube: number }
  | { kind: 'deselected'; tube: number }
  | { kind: 'illegal'; tube: number }
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
  const startLevel = progressFor(record, difficulty).currentLevel;
  const first = generateLevel(startLevel, difficulty);

  return {
    level: startLevel,
    difficulty,
    board: first.state,
    initial: first.state,
    par: first.report.lowerBound,
    earned: 0,
    history: [],
    future: [],
    selected: null,
    solved: false,
    locked: false,
    extraTaken: false,
    record,

    progress: () => progressFor(get().record, get().difficulty),

    loadLevel: (level) => {
      const mode = get().difficulty;
      const generated = generateLevel(level, mode);
      const next = setCurrentLevel(get().record, mode, level);
      saveProgress(next);

      set({
        level,
        board: generated.state,
        initial: generated.state,
        par: generated.report.lowerBound,
        earned: 0,
        history: [],
        future: [],
        selected: null,
        solved: false,
        locked: false,
        extraTaken: false,
        record: next,
      });
    },

    setDifficulty: (difficulty) => {
      if (get().difficulty === difficulty) return;

      // Each mode remembers where it was left, so switching is not a reset.
      const level = progressFor(get().record, difficulty).currentLevel;
      const generated = generateLevel(level, difficulty);

      set({
        difficulty,
        level,
        board: generated.state,
        initial: generated.state,
        par: generated.report.lowerBound,
        earned: 0,
        history: [],
        future: [],
        selected: null,
        solved: false,
        locked: false,
        extraTaken: false,
      });
    },

    tapTube: (index) => {
      const { board, selected, locked, solved } = get();
      if (locked || solved) return { kind: 'ignored' };

      const tube = board.tubes[index];
      if (!tube) return { kind: 'ignored' };

      if (selected === null) {
        // Nothing to lift out of an empty tube.
        if (tube.length === 0) return { kind: 'ignored' };
        set({ selected: index });
        return { kind: 'selected', tube: index };
      }

      if (selected === index) {
        set({ selected: null });
        return { kind: 'deselected', tube: index };
      }

      if (!canPour(board, selected, index)) {
        // Keep the selection: the player is aiming, not starting over.
        return { kind: 'illegal', tube: index };
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
        const next = nowSolved
          ? recordCompletion(
              current.record,
              current.difficulty,
              current.level,
              moves,
              stars
            )
          : current.record;
        if (nowSolved) {
          saveProgress(next);
          // Paid here rather than on the Complete screen, so a player who
          // backs out before the animation finishes still keeps the coins.
          useEconomyStore.getState().add(coinsFor(stars));
        }

        return {
          board: applied.state,
          history: [...current.history, applied.move],
          // A new branch: whatever was undone is no longer reachable.
          future: [],
          selected: null,
          solved: nowSolved,
          earned: stars,
          record: next,
        };
      });

      return {
        kind: 'poured',
        move: applied.move,
        solved: nowSolved,
        colour,
        destFilled,
      };
    },

    undo: () => {
      const { history, future, initial, locked } = get();
      if (locked || history.length === 0) return;

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
        selected: null,
        solved: false,
      });
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
        const next = nowSolved
          ? recordCompletion(
              current.record,
              current.difficulty,
              current.level,
              moves,
              stars
            )
          : current.record;
        if (nowSolved) {
          saveProgress(next);
          useEconomyStore.getState().add(coinsFor(stars));
        }

        return {
          board: applied.state,
          history: [...current.history, applied.move],
          future: current.future.slice(0, -1),
          selected: null,
          solved: nowSolved,
          earned: stars,
          record: next,
        };
      });

      return {
        kind: 'poured',
        move: applied.move,
        solved: nowSolved,
        colour,
        destFilled,
      };
    },

    restart: () => {
      const { initial, locked } = get();
      if (locked) return;
      set({
        board: initial,
        history: [],
        future: [],
        selected: null,
        solved: false,
        earned: 0,
      });
    },

    hint: () => {
      const { board, locked, solved } = get();
      if (locked || solved) return null;

      for (let from = 0; from < board.tubes.length; from++) {
        const source = board.tubes[from]!;
        // A finished tube is a legal source and a terrible suggestion.
        if (source.length === 0) continue;
        if (source.length === board.capacity && source.every((c) => c === source[0]))
          continue;

        for (let to = 0; to < board.tubes.length; to++) {
          if (from === to) continue;
          if (!canPour(board, from, to)) continue;
          set({ selected: from });
          return { from, to, count: 1 };
        }
      }
      return null;
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
      });
      return true;
    },

    nextLevel: () => get().loadLevel(get().level + 1),

    setLocked: (locked) => set({ locked }),
  };
});

/** Keeps the board in step when difficulty changes in settings. */
useSettingsStore.subscribe((state, previous) => {
  if (state.difficulty !== previous.difficulty) {
    useGameStore.getState().setDifficulty(state.difficulty);
  }
});
