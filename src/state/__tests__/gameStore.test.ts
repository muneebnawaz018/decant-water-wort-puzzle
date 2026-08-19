import { isSolved } from '@/core/waterCore';
import { solve } from '@/core/solver';
import { DIFFICULTIES } from '@/game/difficulty';
import { firstUnsolved } from '../progress';
import { FREE_HINTS, PRICES } from '@/game/economy';
import { freeUndosFor } from '@/game/undoCost';
import { EARNINGS } from '@/game/economy';
import { useBonusStore } from '../bonusStore';
import { useEconomyStore } from '../economyStore';
import { useGameStore } from '../gameStore';

const store = () => useGameStore.getState();

/** First tube holding something, so tests do not depend on generated colors. */
function firstNonEmpty(): number {
  return store().board.tubes.findIndex((tube) => tube.length > 0);
}

beforeEach(() => {
  store().loadLevel(1);
  // Undo costs coins. Topped up explicitly so these tests do not depend on a
  // balance left behind by whichever test solved a board before them.
  useEconomyStore.setState({ coins: 1000 });
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
      armed: true,
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

describe('what an undo costs', () => {
  /** Uses up the level's free undos, so the next one is charged. */
  const exhaustAllowance = () => {
    const free = freeUndosFor(store().difficulty);
    play(free + 1);
    for (let i = 0; i < free; i++) store().undo();
  };

  /** Plays the first `count` moves of the solution. */
  const play = (count: number) => {
    for (const move of solve(store().board).moves!.slice(0, count)) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
  };

  const coins = () => useEconomyStore.getState().coins;

  it('is free while the level still has free undos', () => {
    play(1);
    const before = coins();

    const outcome = store().undo();
    expect(outcome).toMatchObject({ kind: 'undone', charged: 0 });
    expect(coins()).toBe(before);
  });

  it('charges once the free ones are gone', () => {
    exhaustAllowance();
    const before = coins();

    expect(store().undo()).toMatchObject({ kind: 'undone', charged: PRICES.undo });
    expect(coins()).toBe(before - PRICES.undo);
  });

  it('gives a harder mode fewer free undos', () => {
    expect(freeUndosFor('gentle')).toBeGreaterThan(freeUndosFor('fiendish'));
  });

  it('is free to put the move back', () => {
    exhaustAllowance();
    store().undo();
    const before = coins();

    store().redo();
    expect(coins()).toBe(before);
  });

  it('does not charge twice for the same move', () => {
    exhaustAllowance();
    store().undo();
    store().redo();
    const before = coins();

    // The same move, taken back a second time. One decision, revisited.
    expect(store().undo()).toMatchObject({ kind: 'undone', charged: 0 });
    expect(coins()).toBe(before);
  });

  /**
   * The rewarded ad as the other way to pay.
   *
   * The thing worth pinning is not that it skips the charge — it is that it
   * skips *only* the charge. An ad-paid undo has to leave the same marks a
   * coin-paid one does, or the player watches a video and then gets billed
   * for the same move the moment they change their mind about it twice.
   */
  it('takes an ad instead of coins, and still marks the move paid', () => {
    exhaustAllowance();
    const before = coins();

    expect(store().undo('ad')).toMatchObject({ kind: 'undone', charged: 0 });
    expect(coins()).toBe(before);

    // Back down the same move: already paid for, so free either way.
    store().redo();
    expect(store().undo()).toMatchObject({ kind: 'undone', charged: 0 });
    expect(coins()).toBe(before);
  });

  it('does not let an ad spend a free undo', () => {
    exhaustAllowance();
    const used = store().freeUndosUsed;

    store().undo('ad');
    expect(store().freeUndosUsed).toBe(used);
  });

  it('never refuses an ad-paid undo for want of coins', () => {
    exhaustAllowance();
    useEconomyStore.setState({ coins: 0 });

    expect(store().undo('ad')).toMatchObject({ kind: 'undone', charged: 0 });
  });

  it('does not spend the allowance on a move already paid for', () => {
    exhaustAllowance();
    store().undo();
    const used = store().freeUndosUsed;

    store().redo();
    store().undo();
    expect(store().freeUndosUsed).toBe(used);
  });

  it('charges for each move on the way down', () => {
    exhaustAllowance();
    play(2);
    const before = coins();

    store().undo();
    store().undo();
    expect(coins()).toBe(before - PRICES.undo * 2);
  });

  it('charges again once a different move is played at that depth', () => {
    exhaustAllowance();
    store().undo();
    store().redo();

    // A new branch at the depth that was paid for.
    store().undo();
    const [next] = solve(store().board).moves!;
    store().tapTube(next!.from);
    store().tapTube(next!.to);

    const before = coins();
    expect(store().undo()).toMatchObject({ kind: 'undone', charged: PRICES.undo });
    expect(coins()).toBe(before - PRICES.undo);
  });

  it('refuses rather than going into debt, and leaves the board alone', () => {
    exhaustAllowance();
    useEconomyStore.setState({ coins: PRICES.undo - 1 });
    const board = store().board.tubes.map((tube) => [...tube]);
    const moves = store().history.length;

    expect(store().undo()).toEqual({ kind: 'blocked', price: PRICES.undo });
    expect(store().board.tubes).toEqual(board);
    expect(store().history).toHaveLength(moves);
    expect(coins()).toBe(PRICES.undo - 1);
  });

  it('still allows a free undo of a move already paid for when broke', () => {
    exhaustAllowance();
    store().undo();
    const depth = store().history.length;
    store().redo();
    useEconomyStore.setState({ coins: 0 });

    expect(store().undo()).toMatchObject({ kind: 'undone', charged: 0 });
    expect(store().history).toHaveLength(depth);
  });

  it('clears the debt and the allowance on restart', () => {
    play(2);
    store().undo();
    store().restart();
    expect(store().paidUndos).toEqual([]);
    expect(store().freeUndosUsed).toBe(0);
  });
});

describe('the hint, through the store', () => {
  it('arms the source rather than playing the move', () => {
    const outcome = store().hint();
    expect(outcome.kind).toBe('shown');
    if (outcome.kind !== 'shown') throw new Error('unreachable');

    // Pointed at, not poured: the board is untouched and the move is the
    // player's to finish.
    expect(store().selected).toBe(outcome.move.from);
    expect(store().hintMove).toEqual(outcome.move);
    expect(store().history).toHaveLength(0);
  });

  it('names a move that is legal from here', () => {
    const outcome = store().hint();
    if (outcome.kind !== 'shown') throw new Error('unreachable');

    // Tapping the ringed destination finishes it, because the source is armed.
    const played = store().tapTube(outcome.move.to);
    expect(played.kind).toBe('poured');
    expect(store().history).toHaveLength(1);
  });

  it('gives the first away and charges for the next', () => {
    const first = store().hint();
    expect(first.kind).toBe('shown');
    if (first.kind !== 'shown') throw new Error('unreachable');
    expect(first.charged).toBe(0);
    expect(store().hintsUsed).toBe(FREE_HINTS);

    // Play the move, so the marked hint clears and the next press is a new
    // question rather than the same answer restated.
    store().tapTube(first.move.to);

    useEconomyStore.getState().add(PRICES.hint);
    const second = store().hint();
    if (second.kind !== 'shown') throw new Error('unreachable');
    expect(second.charged).toBe(PRICES.hint);
  });

  /**
   * The ad pays the coins and nothing else — `hintsUsed` and `paidHints` move
   * exactly as they would on a purchase, so re-showing this answer after the
   * player selects another vial stays free rather than asking for a second ad.
   */
  it('takes an ad instead of coins, and still records the hint', () => {
    const first = store().hint();
    if (first.kind !== 'shown') throw new Error('unreachable');
    store().tapTube(first.move.to);

    useEconomyStore.setState({ coins: 0 });
    const used = store().hintsUsed;

    const second = store().hint('ad');
    if (second.kind !== 'shown') throw new Error('unreachable');
    expect(second.charged).toBe(0);
    expect(useEconomyStore.getState().coins).toBe(0);
    expect(store().hintsUsed).toBe(used + 1);

    // Selecting elsewhere drops the display but not the purchase. The answer
    // was earned, so pressing again re-shows it for nothing.
    store().tapTube(second.move.from);
    expect(store().hint()).toMatchObject({ kind: 'shown', charged: 0 });
  });

  it('refuses rather than reveals when the coins are not there', () => {
    store().hint();
    store().tapTube(store().hintMove!.to);
    useEconomyStore.setState({ coins: 0 });

    expect(store().hint()).toEqual({ kind: 'blocked', price: PRICES.hint });
    // Nothing revealed and nothing spent: a player who cannot pay learns the
    // price, not the move.
    expect(store().hintMove).toBeNull();
  });

  it('re-shows for free after a selection dismissed it', () => {
    // The reported bug, exactly: hint shown, tap some other vial (which
    // clears the display but pours nothing), press Hint again. The board has
    // not changed, so the answer has not either — recomputing it is fine,
    // billing for it is not.
    const first = store().hint();
    if (first.kind !== 'shown') throw new Error('unreachable');
    store().tapTube(first.move.to);

    useEconomyStore.setState({ coins: 1000 });
    const second = store().hint();
    if (second.kind !== 'shown') throw new Error('unreachable');
    expect(second.charged).toBe(PRICES.hint);

    // Select a different tube: display gone, board untouched.
    const other = store().board.tubes.findIndex(
      (tube, i) => tube.length > 0 && i !== second.move.from
    );
    store().tapTube(other);
    expect(store().hintMove).toBeNull();

    // Same position, same answer, no second bill — and the pointer is back.
    const third = store().hint();
    expect(third).toEqual({ kind: 'shown', move: second.move, charged: 0 });
    expect(store().hintMove).toEqual(second.move);
    expect(useEconomyStore.getState().coins).toBe(1000 - PRICES.hint);
  });

  it('re-states a hint already on the board for free', () => {
    const first = store().hint();
    if (first.kind !== 'shown') throw new Error('unreachable');

    // Same board, same answer. Charging twice for one question is a bug even
    // when the player has the coins.
    useEconomyStore.setState({ coins: 0 });
    expect(store().hint()).toEqual({ kind: 'shown', move: first.move, charged: 0 });
  });

  it('comes back with a fresh level', () => {
    store().hint();
    store().loadLevel(2);
    expect(store().hintsUsed).toBe(0);

    const outcome = store().hint();
    if (outcome.kind !== 'shown') throw new Error('unreachable');
    expect(outcome.charged).toBe(0);
  });

  it('survives restart: same position free, new positions still metered', () => {
    const first = store().hint();
    if (first.kind !== 'shown') throw new Error('unreachable');
    store().restart();

    // Restart returns to the initial position, and the initial position's
    // answer was already delivered — so it is free, and it is the *same*
    // answer. No refill: `hintsUsed` stands, so hint → restart → hint hands
    // out one answer repeatedly, never a second one for nothing.
    expect(store().hintsUsed).toBe(FREE_HINTS);
    useEconomyStore.setState({ coins: 0 });
    const again = store().hint();
    expect(again).toEqual({ kind: 'shown', move: first.move, charged: 0 });

    // Play the free answer; the next position is new and the coins are gone.
    store().tapTube(again.kind === 'shown' ? again.move.to : -1);
    expect(store().hint()).toEqual({ kind: 'blocked', price: PRICES.hint });
  });

  it('re-delivers free at a position brought back by undo', () => {
    // The round trip that used to double-bill: buy the answer, pour it, undo
    // back to the position it was bought for, ask again.
    useEconomyStore.setState({ coins: 1000 });
    const first = store().hint();
    if (first.kind !== 'shown') throw new Error('unreachable');
    store().tapTube(first.move.to);

    store().undo();
    const balance = useEconomyStore.getState().coins;

    const again = store().hint();
    expect(again).toEqual({ kind: 'shown', move: first.move, charged: 0 });
    // Free outright, and no allowance spent either: `hintsUsed` still counts
    // one delivery, not two.
    expect(store().hintsUsed).toBe(FREE_HINTS);
    expect(useEconomyStore.getState().coins).toBe(balance);
  });

  it('re-delivers a *paid* answer free after the same round trip', () => {
    useEconomyStore.setState({ coins: 1000 });
    // Spend the free hint and buy the second.
    const free = store().hint();
    if (free.kind !== 'shown') throw new Error('unreachable');
    store().tapTube(free.move.to);
    const paid = store().hint();
    if (paid.kind !== 'shown') throw new Error('unreachable');
    expect(paid.charged).toBe(PRICES.hint);
    store().tapTube(paid.move.to);

    // Undo back to the position the paid answer was bought for.
    store().undo();
    const balance = useEconomyStore.getState().coins;

    const again = store().hint();
    expect(again).toEqual({ kind: 'shown', move: paid.move, charged: 0 });
    expect(useEconomyStore.getState().coins).toBe(balance);
  });

  it('clears the marked move once any pour is played', () => {
    const outcome = store().hint();
    if (outcome.kind !== 'shown') throw new Error('unreachable');

    store().tapTube(outcome.move.to);
    // The hint was computed against a board that no longer exists.
    expect(store().hintMove).toBeNull();
  });

  it('says nothing while a pour animates', () => {
    store().setLocked(true);
    expect(store().hint()).toEqual({ kind: 'ignored' });
    store().setLocked(false);
  });

  it('says nothing once the level is solved', () => {
    for (const move of solve(store().board).moves!) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
    expect(store().solved).toBe(true);
    expect(store().hint()).toEqual({ kind: 'ignored' });
  });
});

describe('what finishing a level pays', () => {
  const coins = () => useEconomyStore.getState().coins;

  /**
   * A level no other test has cleared.
   *
   * The progress record outlives each test — it is the same store and the same
   * storage — and a cleared level pays nothing the second time, which is the
   * rule under test. Multiples of ten are avoided: those complete a block and
   * pay a milestone bonus on top, which would land in the same balance.
   */
  let fresh = 21;
  beforeEach(() => {
    fresh += 1;
    store().loadLevel(fresh);
  });

  /** Plays the level out to solved. */
  const finish = () => {
    for (const move of solve(store().board).moves!) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
  };

  it('pays for the first clear', () => {
    const before = coins();
    finish();

    expect(store().solved).toBe(true);
    expect(store().earnedCoins).toBeGreaterThan(0);
    expect(coins()).toBe(before + store().earnedCoins);
  });

  it('pays nothing to replay a level already cleared as well', () => {
    finish();
    const after = coins();

    // Same level, same solver, same result.
    store().restart();
    finish();

    expect(store().earnedCoins).toBe(0);
    expect(coins()).toBe(after);
  });

  it('cannot be farmed by replaying an early level', () => {
    finish();
    const after = coins();

    for (let i = 0; i < 5; i++) {
      store().restart();
      finish();
    }

    expect(coins()).toBe(after);
  });

  it('pays the difference when a replay does better', () => {
    // A deliberately wasteful first run: pour and take it straight back, so
    // the move count is inflated and the rating suffers for it.
    const [first] = solve(store().board).moves!;
    store().tapTube(first!.from);
    store().tapTube(first!.to);
    useEconomyStore.setState({ coins: 1000 });
    store().undo();
    finish();

    const scrappy = store().earned;
    const paid = coins();
    store().restart();
    finish();

    // The clean run is at least as good, and pays only what it added.
    expect(store().earned).toBeGreaterThanOrEqual(scrappy);
    expect(coins() - paid).toBe(store().earnedCoins);
  });
});

describe('the spare vial', () => {
  it('is offered on every level, once', () => {
    // One per level, in every mode, at every level number — the escape hatch
    // (spec §10) is the answer to a board poured into a dead end, and a board
    // can be poured into one at any size.
    for (const level of [1, 7, 40]) {
      store().loadLevel(level);
      expect(store().extraTaken).toBe(false);
      expect(store().addTube()).toBe(true);
      expect(store().addTube()).toBe(false);
    }
  });

  /**
   * A replay starts clean.
   *
   * The vial is a decision made *within* a level, not a property of it: taking
   * it once must not mean the board is permanently one tube wider. Nothing
   * stores it, which is the reason this holds — level N is rebuilt from its
   * seed and `loadLevel` clears the session, so there is nowhere for a taken
   * vial to survive. Pinned anyway, because "nothing stores it" is exactly the
   * kind of thing a later feature quietly changes.
   */
  it('is gone again when a finished level is replayed', () => {
    store().loadLevel(1);
    const tubes = store().board.tubes.length;

    store().addTube();
    expect(store().board.tubes.length).toBe(tubes + 1);
    for (const move of solve(store().board).moves!) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
    expect(store().solved).toBe(true);

    store().loadLevel(1);
    expect(store().extraTaken).toBe(false);
    expect(store().board.tubes.length).toBe(tubes);
    expect(store().addTube()).toBe(true);
  });
});

describe('the free-undo warning', () => {
  const play = (count: number) => {
    for (const move of solve(store().board).moves!.slice(0, count)) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
  };

  it('marks the undo that spends the last of the allowance', () => {
    const allowance = freeUndosFor(store().difficulty);
    play(allowance + 2);

    for (let i = 0; i < allowance - 1; i++) {
      expect(store().undo()).toMatchObject({ spentAllowance: true });
    }
    expect(store().undo()).toMatchObject({ spentAllowance: true, freeLeft: 0 });
  });

  /**
   * The screen shows "free undos used" on `spentAllowance && freeLeft === 0`,
   * and this is why both halves are needed: re-undoing a move already paid for
   * is also `charged: 0` with no allowance left, so on `freeLeft` alone the
   * warning fired every time the player rewound the same move.
   */
  it('does not mark a re-undo of a move already paid for', () => {
    const allowance = freeUndosFor(store().difficulty);
    play(allowance + 2);
    for (let i = 0; i < allowance; i++) store().undo();

    // The first charged undo, then the same move again.
    const charged = store().undo();
    expect(charged).toMatchObject({ spentAllowance: false });
    if (charged.kind !== 'undone') throw new Error('unreachable');
    expect(charged.charged).toBeGreaterThan(0);

    store().redo();
    expect(store().undo()).toMatchObject({ charged: 0, spentAllowance: false });
  });
});

describe('solving a whole level on hints', () => {
  /**
   * The guarantee the meter is sold on, at every size the game reaches.
   *
   * Hints used to be able to alternate forever: each press ran its own search,
   * and `solve` returns *a* winning line rather than the shortest, so a search
   * from one position could answer with the move undoing the last one. Level
   * 1,000,000 cycled inside four moves in two of three modes — a paid button
   * charging for a loop.
   *
   * Difficulty caps out (12 colors, capacity 5, one spare), so a level in the
   * millions is the same *size* board as level 501 — which is exactly why the
   * bug was about consistency between searches and not about scale.
   */
  it('never loops, at any level number', () => {
    for (const mode of DIFFICULTIES) {
      for (const level of [1_000_000, 1_000_001, 12_345_678]) {
        useEconomyStore.setState({ coins: 100_000 });
        useGameStore.setState({ difficulty: mode });
        store().loadLevel(level);

        // Comfortably above the longest solution the generator produces.
        for (let step = 0; step < 400 && !store().solved; step++) {
          const outcome = store().hint();
          if (outcome.kind !== 'shown') break;
          store().tapTube(outcome.move.to);
        }

        expect(store().solved).toBe(true);
      }
    }
  });

  /**
   * The promise the meter is sold on: a player who pays for every hint gets a
   * real path all the way to solved, never a fake pointer. Each hint is asked
   * against the *current* board, so this also proves the chain re-plans after
   * every pour rather than replaying a stale line.
   */
  it('reaches solved by following hints and nothing else', () => {
    useEconomyStore.setState({ coins: 10_000 });

    // Generous ceiling: the longest solution over levels 1-1000 is 51 moves.
    for (let step = 0; step < 80 && !store().solved; step++) {
      const outcome = store().hint();
      expect(outcome.kind).toBe('shown');
      if (outcome.kind !== 'shown') break;

      // The hint armed the source; tapping the destination plays it.
      expect(store().tapTube(outcome.move.to).kind).toBe('poured');
    }

    expect(store().solved).toBe(true);
  });

  it('charges for every hint after the free one, and for nothing else', () => {
    useEconomyStore.setState({ coins: 10_000 });

    let shown = 0;
    let paid = 0;
    for (let step = 0; step < 80 && !store().solved; step++) {
      const outcome = store().hint();
      if (outcome.kind !== 'shown') break;
      shown += 1;
      if (outcome.charged > 0) paid += outcome.charged;
      store().tapTube(outcome.move.to);
    }

    expect(store().solved).toBe(true);
    expect(paid).toBe((shown - FREE_HINTS) * PRICES.hint);
    expect(useEconomyStore.getState().coins).toBe(10_000 - paid);
  });
});

describe('the daily bonus puzzle', () => {
  const NOW = new Date('2026-08-08T12:00:00').getTime();

  beforeEach(() => {
    useBonusStore.setState({ solvedAt: null, solvedDay: null, total: 0 });
  });

  const solveBoard = () => {
    for (const move of solve(store().board).moves!) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
  };

  it('loads a board that is not the level in progress', () => {
    store().loadLevel(3);
    const level = store().board.tubes.map((tube) => [...tube]);

    expect(store().loadBonus(NOW)).toBe(true);
    expect(store().bonus).toBe(true);
    expect(store().board.tubes).not.toEqual(level);
  });

  it('refuses once the day has been played', () => {
    store().loadBonus(NOW);
    solveBoard();
    expect(store().loadBonus(NOW)).toBe(false);
  });

  /**
   * On stars, not flat. The brew's shape follows the player now, so one figure
   * for every brew would pay a six-color board and a twelve-color one the
   * same — and there is no fail state, so a finished brew always pays at least
   * one star's worth.
   */
  it('pays on stars, and pays once', () => {
    useEconomyStore.setState({ coins: 0 });
    store().loadBonus(NOW);
    solveBoard();

    const stars = store().earned;
    expect(stars).toBeGreaterThanOrEqual(1);

    const due = stars * EARNINGS.bonusPuzzlePerStar;
    expect(useEconomyStore.getState().coins).toBe(due);
    expect(store().earnedCoins).toBe(due);

    // Redo re-enters the win path. It must not pay a second time.
    store().undo();
    store().redo();
    expect(useEconomyStore.getState().coins).toBe(due);
  });

  /**
   * The reason `bonus` exists as a flag at all. `level` holds the day index
   * while a bonus board is loaded, so without the guard the win path files a
   * completion of "level 20675" — unlocking a level nobody has reached, adding
   * stars to a total that is meant to count levels, and possibly paying a
   * milestone block.
   */
  it('writes nothing to progress', () => {
    store().loadLevel(1);
    const before = JSON.stringify(store().record);

    store().loadBonus(NOW);
    solveBoard();

    expect(JSON.stringify(store().record)).toBe(before);
  });

  it('goes back to being a level once one is loaded', () => {
    store().loadBonus(NOW);
    store().loadLevel(2);
    expect(store().bonus).toBe(false);
    expect(store().level).toBe(2);
  });

  /**
   * `level` holds the day index here, so `level + 1` is tomorrow's date, not a
   * level. `loadLevel` does not merely open a board — it writes the number
   * through `setCurrentLevel` and saves it, so one press would file the mode
   * as being on level 20,677 and leave `firstUnsolved` and the Stages grid to
   * make sense of it.
   */
  it('refuses to advance off the end of a bonus board', () => {
    store().loadLevel(3);
    store().loadBonus(NOW);
    const day = store().level;
    const before = JSON.stringify(store().record);

    store().nextLevel();

    expect(store().bonus).toBe(true);
    expect(store().level).toBe(day);
    expect(JSON.stringify(store().record)).toBe(before);
  });

  /**
   * The day index is a plausible-looking level number, which is what made the
   * leak survive: "Leave level 20676?" reads like a bug in level generation
   * rather than a date. Anything rendering `level` has to consult `bonus`
   * first — this pins that the two are genuinely different scales, so a
   * reader that forgets cannot accidentally look right.
   */
  it('keeps the day index well clear of any real level number', () => {
    store().loadBonus(NOW);
    expect(store().bonus).toBe(true);
    expect(store().level).toBeGreaterThan(10_000);
  });
});

describe('restart and the spare vial', () => {
  /**
   * Restart puts back the board the level *starts* with.
   *
   * It used to keep the extra vial, which meant a player restarting to try
   * again from scratch got a thirteenth tube they had not asked for and could
   * not put away — indistinguishable, from the screen, from a bug.
   */
  it('takes the spare vial back', () => {
    store().loadLevel(1);
    const tubes = store().board.tubes.length;

    store().addTube();
    expect(store().board.tubes.length).toBe(tubes + 1);

    store().restart();
    expect(store().board.tubes.length).toBe(tubes);
    expect(store().extraTaken).toBe(false);
  });

  it('offers it again afterwards', () => {
    store().loadLevel(1);
    store().addTube();
    store().restart();
    expect(store().addTube()).toBe(true);
  });

  it('restores the generated board exactly, not a trimmed copy of a played one', () => {
    store().loadLevel(1);
    const generated = store().board.tubes.map((tube) => [...tube]);

    store().addTube();
    for (const move of solve(store().board).moves!.slice(0, 4)) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
    store().restart();

    expect(store().board.tubes).toEqual(generated);
    expect(store().history).toHaveLength(0);
  });

  it('leaves a board that never took one alone', () => {
    store().loadLevel(1);
    const generated = store().board.tubes.map((tube) => [...tube]);

    for (const move of solve(store().board).moves!.slice(0, 2)) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
    store().restart();

    expect(store().board.tubes).toEqual(generated);
  });
});

describe('undoing the spare vial', () => {
  it('puts it back once there are no moves left', () => {
    store().loadLevel(1);
    const tubes = store().board.tubes.length;
    store().addTube();

    expect(store().undo()).toEqual({ kind: 'vialRemoved' });
    expect(store().board.tubes.length).toBe(tubes);
    expect(store().extraTaken).toBe(false);
  });

  it('costs nothing', () => {
    store().loadLevel(1);
    useEconomyStore.setState({ coins: 500 });
    store().addTube();

    store().undo();
    expect(useEconomyStore.getState().coins).toBe(500);
  });

  /**
   * The vial is the *last* step of unwinding, not a shortcut past the moves.
   * Taking it back while pours reference it would renumber every tube those
   * moves name.
   */
  it('waits until the moves are gone', () => {
    store().loadLevel(1);
    useEconomyStore.setState({ coins: 1000 });
    store().addTube();
    const [move] = solve(store().board).moves!;
    store().tapTube(move!.from);
    store().tapTube(move!.to);

    expect(store().undo()).toMatchObject({ kind: 'undone' });
    expect(store().extraTaken).toBe(true);

    expect(store().undo()).toEqual({ kind: 'vialRemoved' });
    expect(store().extraTaken).toBe(false);
  });

  it('is offered again after being put back', () => {
    store().loadLevel(1);
    store().addTube();
    store().undo();
    expect(store().addTube()).toBe(true);
  });

  it('still does nothing on a fresh board', () => {
    store().loadLevel(1);
    expect(store().undo()).toEqual({ kind: 'ignored' });
  });
});

describe('where the player is after finishing a level', () => {
  /**
   * A record whose frontier is `level`: everything below it finished.
   *
   * Seeded rather than played, because `firstUnsolved` answers with the
   * *earliest gap* — and a test that jumps to level 41 without finishing 1-40
   * leaves forty of them. Real players cannot skip, so the gap is a case only
   * a test (or a corrupt record) can produce, and it is handled by the scan
   * rather than papered over here.
   */
  const seedFrontier = (level: number) => {
    const stars: Record<number, number> = {};
    for (let i = 1; i < level; i++) stars[i] = 3;
    useGameStore.setState((state) => ({
      record: {
        ...state.record,
        [state.difficulty]: {
          furthestLevel: level,
          currentLevel: level,
          best: {},
          stars,
          paidBlocks: [],
        },
      },
    }));
  };

  const finish = () => {
    for (const move of solve(store().board).moves!) {
      store().tapTube(move.from);
      store().tapTube(move.to);
    }
  };

  it('moves on from a level the moment it is solved', () => {
    seedFrontier(41);
    store().loadLevel(41);
    finish();

    // Not when `Next` is pressed — where the player is must not depend on
    // which exit they took off the win screen.
    expect(firstUnsolved(store().progress())).toBe(42);
  });

  it('does not follow the player into a replay of an old level', () => {
    seedFrontier(60);
    store().loadLevel(44);

    // Merely opening an old level moves nothing. This is the case that made
    // reading `currentLevel` wrong: Home would have offered to continue 44.
    expect(firstUnsolved(store().progress())).toBe(60);

    finish();
    expect(firstUnsolved(store().progress())).toBe(60);
  });

  it('picks the earliest gap, not the high-water mark', () => {
    seedFrontier(51);
    store().loadLevel(51);
    finish();
    store().loadLevel(53);
    finish();

    // 52 was never finished, so that is where the player is — even though the
    // record has reached 54.
    expect(firstUnsolved(store().progress())).toBe(52);
    store().resumeCurrent();
    expect(store().level).toBe(52);
  });

  it('resumes the next level rather than the board just solved', () => {
    seedFrontier(46);
    store().loadLevel(46);
    finish();
    expect(store().solved).toBe(true);

    // What Home's Continue does. The solved board is still loaded behind the
    // win screen; continuing has to open what comes next.
    store().resumeCurrent();
    expect(store().level).toBe(47);
    expect(store().solved).toBe(false);
  });

  it('resumes an unfinished replay rather than jumping to the frontier', () => {
    seedFrontier(56);
    // Replay a level already finished, and leave it part-solved.
    store().loadLevel(55);
    const [first] = solve(store().board).moves!;
    store().tapTube(first!.from);
    store().tapTube(first!.to);

    // A board with moves on it is what "continue" means, wherever it sits.
    store().resumeCurrent();
    expect(store().level).toBe(55);
    expect(store().history).toHaveLength(1);
  });

  it('does not resume the daily bonus board', () => {
    seedFrontier(50);
    expect(store().loadBonus(new Date('2026-08-08T12:00:00').getTime())).toBe(true);

    // Part-play it, which is what makes this the case worth pinning: by every
    // other measure — moves on the board, not solved — this is a level to
    // continue.
    const [first] = solve(store().board).moves!;
    store().tapTube(first!.from);
    store().tapTube(first!.to);

    // Home offers to continue the *mode*. The bonus puzzle is off the ladder,
    // pays its own coins and unlocks nothing, and its level number is a
    // seed-derived five-digit thing that lands in a badge sized for two.
    store().resumeCurrent();

    expect(store().bonus).toBe(false);
    expect(store().level).toBe(firstUnsolved(store().progress()));
    expect(store().history).toHaveLength(0);
  });

  it('leaves a level in progress alone', () => {
    seedFrontier(48);
    store().loadLevel(48);
    const [first] = solve(store().board).moves!;
    store().tapTube(first!.from);
    store().tapTube(first!.to);

    // Same level, moves intact: continuing an unfinished board must not
    // regenerate it and throw the position away.
    store().resumeCurrent();
    expect(store().level).toBe(48);
    expect(store().history).toHaveLength(1);
  });
});
