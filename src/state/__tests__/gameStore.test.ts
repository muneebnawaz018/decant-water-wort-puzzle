import { isSolved } from '@/core/waterCore';
import { solve } from '@/core/solver';
import { useGameStore } from '../gameStore';

const store = () => useGameStore.getState();

/** First tube holding something, so tests do not depend on generated colours. */
function firstNonEmpty(): number {
  return store().board.tubes.findIndex((tube) => tube.length > 0);
}

beforeEach(() => {
  store().loadLevel(1);
});

describe('selection', () => {
  it('selects a tube that has liquid in it', () => {
    const tube = firstNonEmpty();
    expect(store().tapTube(tube)).toEqual({ kind: 'selected', tube });
    expect(store().selected).toBe(tube);
  });

  it('ignores a tap on an empty tube when nothing is selected', () => {
    const empty = store().board.tubes.findIndex((tube) => tube.length === 0);
    expect(store().tapTube(empty)).toEqual({ kind: 'ignored' });
    expect(store().selected).toBeNull();
  });

  it('deselects when the same tube is tapped twice', () => {
    const tube = firstNonEmpty();
    store().tapTube(tube);
    expect(store().tapTube(tube)).toEqual({ kind: 'deselected', tube });
    expect(store().selected).toBeNull();
  });

  it('arms the tube just tapped when the pour is refused', () => {
    const { board } = store();
    const from = firstNonEmpty();
    const blocked = board.tubes.findIndex(
      (tube, index) =>
        index !== from &&
        tube.length > 0 &&
        tube[tube.length - 1] !== board.tubes[from]![board.tubes[from]!.length - 1]
    );
    if (blocked === -1) return; // nothing to test on this board

    store().tapTube(from);
    expect(store().tapTube(blocked)).toEqual({
      kind: 'illegal',
      tube: blocked,
    });
    // A refused pour is usually a mis-tap on the source. Carrying the old
    // selection meant tapping the wrong tube a second time just to clear it.
    expect(store().selected).toBe(blocked);
  });
});

describe('pouring', () => {
  it('applies a legal pour and records it', () => {
    const solution = solve(store().board).moves!;
    const [first] = solution;

    store().tapTube(first!.from);
    const outcome = store().tapTube(first!.to);

    expect(outcome.kind).toBe('poured');
    expect(store().history).toHaveLength(1);
    expect(store().selected).toBeNull();
  });

  it('reports the level solved once the last pour lands', () => {
    for (const move of solve(store().board).moves!) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }

    expect(store().solved).toBe(true);
    expect(isSolved(store().board)).toBe(true);
  });

  it('ignores taps once the level is solved', () => {
    for (const move of solve(store().board).moves!) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
    expect(store().tapTube(0)).toEqual({ kind: 'ignored' });
  });

  it('ignores taps while a pour is animating, doc §7', () => {
    store().setLocked(true);
    expect(store().tapTube(firstNonEmpty())).toEqual({ kind: 'ignored' });
  });
});

describe('undo and restart', () => {
  it('undo restores the previous board exactly', () => {
    const before = store().board.tubes.map((tube) => [...tube]);
    const [move] = solve(store().board).moves!;

    store().tapTube(move!.from);
    store().tapTube(move!.to);
    store().undo();

    expect(store().board.tubes).toEqual(before);
    expect(store().history).toHaveLength(0);
  });

  it('undo does nothing on a fresh board', () => {
    store().undo();
    expect(store().history).toHaveLength(0);
  });

  it('restart returns to the generated board', () => {
    const before = store().board.tubes.map((tube) => [...tube]);
    for (const move of solve(store().board).moves!.slice(0, 3)) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }

    store().restart();
    expect(store().board.tubes).toEqual(before);
    expect(store().history).toHaveLength(0);
  });
});

describe('level flow', () => {
  it('advances and clears the previous board', () => {
    store().nextLevel();
    expect(store().level).toBe(2);
    expect(store().history).toHaveLength(0);
    expect(store().solved).toBe(false);
  });

  it('gives the same board for the same level number', () => {
    const first = store().board.tubes;
    store().loadLevel(9);
    store().loadLevel(1);
    expect(store().board.tubes).toEqual(first);
  });
});

describe('redo', () => {
  /** Plays the first `count` moves of the solution. */
  const play = (count: number) => {
    for (const move of solve(store().board).moves!.slice(0, count)) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
  };

  it('puts an undone move back exactly as it was', () => {
    play(2);
    const after = store().board.tubes.map((tube) => [...tube]);

    store().undo();
    expect(store().board.tubes).not.toEqual(after);

    store().redo();
    expect(store().board.tubes).toEqual(after);
    expect(store().history).toHaveLength(2);
    expect(store().future).toHaveLength(0);
  });

  it('unwinds and rewinds a whole run of moves', () => {
    play(4);
    const after = store().board.tubes.map((tube) => [...tube]);

    for (let i = 0; i < 4; i++) store().undo();
    expect(store().history).toHaveLength(0);
    expect(store().future).toHaveLength(4);

    for (let i = 0; i < 4; i++) store().redo();
    expect(store().board.tubes).toEqual(after);
  });

  it('reports the pour so the renderer can animate it like a tap', () => {
    play(1);
    const move = store().history[0]!;
    store().undo();

    const outcome = store().redo();
    expect(outcome.kind).toBe('poured');
    if (outcome.kind !== 'poured') throw new Error('unreachable');
    expect(outcome.move).toEqual(move);
  });

  it('discards the redo stack once a different move is played', () => {
    play(2);
    store().undo();
    expect(store().future).toHaveLength(1);

    // Any legal pour that is not the undone one starts a new branch.
    const [next] = solve(store().board).moves!;
    store().tapTube(next!.from);
    store().tapTube(next!.to);

    expect(store().future).toHaveLength(0);
    expect(store().redo()).toEqual({ kind: 'ignored' });
  });

  it('does nothing with an empty stack, or while a pour animates', () => {
    expect(store().redo()).toEqual({ kind: 'ignored' });

    play(1);
    store().undo();
    store().setLocked(true);
    expect(store().redo()).toEqual({ kind: 'ignored' });
    expect(store().future).toHaveLength(1);
  });

  it('is cleared by restart and by a new level', () => {
    play(2);
    store().undo();
    store().restart();
    expect(store().future).toHaveLength(0);

    play(2);
    store().undo();
    store().loadLevel(3);
    expect(store().future).toHaveLength(0);
  });
});

describe('hint', () => {
  it('selects the source of a legal pour', () => {
    const move = store().hint();
    expect(move).not.toBeNull();
    expect(store().selected).toBe(move!.from);
  });

  it('never suggests lifting out of a finished tube', () => {
    const move = store().hint()!;
    const source = store().board.tubes[move.from]!;
    const full = source.length === store().board.capacity;
    const uniform = source.every((c) => c === source[0]);
    expect(full && uniform).toBe(false);
  });

  it('does nothing while a pour animates', () => {
    store().setLocked(true);
    expect(store().hint()).toBeNull();
    store().setLocked(false);
  });
});

describe('add vial', () => {
  it('adds one empty tube and refuses a second', () => {
    const before = store().board.tubes.length;

    expect(store().addTube()).toBe(true);
    expect(store().board.tubes).toHaveLength(before + 1);
    expect(store().board.tubes[before]).toEqual([]);

    expect(store().addTube()).toBe(false);
    expect(store().board.tubes).toHaveLength(before + 1);
  });

  it('grows the restart board too, so undo does not lose the vial', () => {
    store().addTube();
    const withExtra = store().board.tubes.length;

    // A pour, then undo — undo replays from `initial`, which must have grown.
    const [move] = solve(store().board).moves!;
    store().tapTube(move!.from);
    store().tapTube(move!.to);
    store().undo();

    expect(store().board.tubes).toHaveLength(withExtra);
  });

  it('is available again on the next level', () => {
    store().addTube();
    store().loadLevel(5);
    expect(store().addTube()).toBe(true);
  });
});
