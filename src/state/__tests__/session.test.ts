import { solve } from '@/core/solver';
import { isSolved } from '@/core/waterCore';
import { UNDO_COST } from '@/game/undoCost';
import { generateLevel } from '@/game/waterGenerator';
import { useEconomyStore } from '../economyStore';
import { useGameStore } from '../gameStore';
import {
  clearSession,
  loadSession,
  packMoves,
  restoreSession,
  saveSession,
} from '../session';
import { storage } from '../storage';

const store = () => useGameStore.getState();

/**
 * Plays one legal pour and returns it, or null if the board is stuck.
 *
 * Taken from the solver rather than from `hint`, which leaves the source
 * selected — tapping it again would deselect instead of pouring.
 */
function playOne(): { from: number; to: number } | null {
  const [move] = solve(store().board).moves ?? [];
  if (!move) return null;
  store().tapTube(move.from);
  store().tapTube(move.to);
  return move;
}

beforeEach(() => {
  clearSession();
  store().loadLevel(1);
});

describe('session record', () => {
  it('writes nothing for a level nobody has touched', () => {
    expect(loadSession()).toBeNull();
  });

  it('saves the moves made, as flat pairs', () => {
    const move = playOne()!;

    const saved = loadSession();
    expect(saved).not.toBeNull();
    expect(saved!.level).toBe(1);
    expect(saved!.difficulty).toBe(store().difficulty);
    expect(saved!.moves).toEqual([move.from, move.to]);
  });

  it('does not store the board — moves and the level are the whole record', () => {
    playOne();
    const raw = JSON.parse(storage.getString('session.v1')!) as Record<string, unknown>;
    // Every key is a decision the generator cannot recompute: `extraTaken` and
    // `hintsUsed` are the one-per-level allowances, `moves` is the position.
    // Still no board.
    //
    // `paidUndos` is deliberately absent — `Session` declares it and
    // `loadSession` reads it, but `persistSession` does not write it yet, so a
    // relaunch hands back every paid undo for free. Listing it here would
    // assert a save that does not happen.
    expect(Object.keys(raw).sort()).toEqual([
      'difficulty',
      'extraTaken',
      'freeUndosUsed',
      // Which puzzles the moves belong to. Stamped by `saveSession` itself
      // rather than carried on `Session` — see `GENERATOR_VERSION`.
      'gen',
      'hintsUsed',
      'level',
      'moves',
      'paidHints',
      'paidUndos',
    ]);
  });

  it('shrinks back to nothing when the moves are undone', () => {
    playOne();
    // Undo is charged for now, and a store with no coins refuses it — which
    // would make this pass or fail on the balance rather than on the record.
    // The subject here is the session, so buy the undo outright.
    useEconomyStore.getState().add(UNDO_COST);
    store().undo();
    expect(loadSession()).toBeNull();
  });

  it('keeps the spare vial on a board with no moves on it', () => {
    store().addTube();

    const saved = loadSession();
    expect(saved?.extraTaken).toBe(true);
    expect(saved?.moves).toEqual([]);
  });

  /**
   * Restart used to be the exception here — it kept the vial, so a restarted
   * board still had a record. It does not any more: restart puts back the
   * board the level starts with, which leaves no moves and no vial, and
   * `saveSession` drops a record with neither rather than storing one.
   */
  it('leaves nothing behind after a restart', () => {
    store().addTube();
    playOne();
    store().restart();

    expect(loadSession()).toBeNull();
  });

  it('clears the moment the level is solved', () => {
    const solution = solve(store().board).moves!;
    for (const move of solution) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }

    expect(store().solved).toBe(true);
    expect(loadSession()).toBeNull();
  });

  it('clears when another level is opened', () => {
    playOne();
    store().loadLevel(2);
    expect(loadSession()).toBeNull();
  });

  it('refuses a record it cannot trust', () => {
    for (const bad of [
      { difficulty: 'nightmare', level: 1, moves: [0, 1], extraTaken: false },
      { difficulty: 'classic', level: 0, moves: [0, 1], extraTaken: false },
      // Odd length: a source with no destination.
      { difficulty: 'classic', level: 1, moves: [0, 1, 2], extraTaken: false },
      { difficulty: 'classic', level: 1, moves: [0, -1], extraTaken: false },
      { difficulty: 'classic', level: 1, moves: 'nope', extraTaken: false },
    ]) {
      storage.set('session.v1', JSON.stringify(bad));
      expect(loadSession()).toBeNull();
    }
  });

  it('retires a record written against boards that no longer exist', () => {
    // The replay-legality check catches most of a repointed generator; this
    // catches the moves that happen to be legal on the *new* board too, which
    // would otherwise replay into a position nobody was ever in.
    storage.set(
      'session.v1',
      JSON.stringify({
        difficulty: 'classic',
        level: 1,
        moves: [0, 1],
        extraTaken: false,
        hintsUsed: 0,
        gen: -1,
      })
    );
    expect(loadSession()).toBeNull();
  });

  it('accepts a record from before the stamp existed', () => {
    // Absent means the record predates stamping, which is read as current —
    // discarding a position over a bookkeeping addition is the key-bump
    // mistake this codebase keeps refusing to make.
    storage.set(
      'session.v1',
      JSON.stringify({
        difficulty: 'classic',
        level: 1,
        moves: [0, 1],
        extraTaken: false,
        hintsUsed: 0,
      })
    );
    expect(loadSession()).not.toBeNull();
  });
});

describe('restoreSession', () => {
  const generated = () => generateLevel(1, 'classic').state;

  it('replays to the position the moves left behind', () => {
    const level = generated();
    const played = playOutFrom(1, 3);

    const restored = restoreSession(
      {
        difficulty: 'classic',
        level: 1,
        moves: played.moves,
        extraTaken: false,
        hintsUsed: 0,
      },
      level
    );

    expect(restored).not.toBeNull();
    expect(restored!.board).toEqual(played.board);
    expect(restored!.history).toHaveLength(3);
  });

  it('adds the spare vial before replaying, so indices still line up', () => {
    const restored = restoreSession(
      { difficulty: 'classic', level: 1, moves: [], extraTaken: true, hintsUsed: 0 },
      generated()
    );

    expect(restored!.initial.tubes).toHaveLength(generated().tubes.length + 1);
    expect(restored!.initial.tubes.at(-1)).toEqual([]);
  });

  it('gives up rather than half-apply a run of moves that no longer fit', () => {
    // Every tube poured into itself: legal as data, impossible as a pour. The
    // shape that a repointed generator would produce.
    const restored = restoreSession(
      {
        difficulty: 'classic',
        level: 1,
        moves: [0, 0],
        extraTaken: false,
        hintsUsed: 0,
      },
      generated()
    );
    expect(restored).toBeNull();
  });

  it('gives up on a move naming a tube the board does not have', () => {
    const restored = restoreSession(
      {
        difficulty: 'classic',
        level: 1,
        moves: [0, 99],
        extraTaken: false,
        hintsUsed: 0,
      },
      generated()
    );
    expect(restored).toBeNull();
  });
});

describe('packMoves', () => {
  it('drops count, which the replay recomputes', () => {
    expect(
      packMoves([
        { from: 1, to: 2, count: 3 },
        { from: 0, to: 4, count: 1 },
      ])
    ).toEqual([1, 2, 0, 4]);
  });
});

describe('saveSession', () => {
  it('removes the record rather than storing an empty one', () => {
    saveSession({
      difficulty: 'classic',
      level: 1,
      moves: [0, 1],
      extraTaken: false,
      hintsUsed: 0,
    });
    saveSession({
      difficulty: 'classic',
      level: 1,
      moves: [],
      extraTaken: false,
      hintsUsed: 0,
    });
    expect(storage.getString('session.v1')).toBeUndefined();
  });
});

/** Plays `count` moves on level `level` and reports where it got to. */
function playOutFrom(level: number, count: number) {
  useGameStore.getState().loadLevel(level);
  const moves: number[] = [];
  for (let i = 0; i < count; i++) {
    const move = playOne();
    if (!move) break;
    moves.push(move.from, move.to);
  }
  const board = store().board;
  expect(isSolved(board)).toBe(false);
  return { moves, board };
}
