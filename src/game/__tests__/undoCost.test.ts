import { PRICES } from '../economy';
import {
  forgetFrom,
  freeUndosFor,
  isPaidSet,
  isUndoPaid,
  undoCharge,
  withUndoPaid,
} from '../undoCost';

describe('the paid set', () => {
  it('reports an unpaid depth as unpaid', () => {
    expect(isUndoPaid([], 0)).toBe(false);
    expect(isUndoPaid([1, 2], 3)).toBe(false);
  });

  it('remembers a depth once it is marked', () => {
    expect(isUndoPaid(withUndoPaid([], 4), 4)).toBe(true);
  });

  it('marks a depth once, however many times it is paid', () => {
    const once = withUndoPaid([], 2);
    expect(withUndoPaid(once, 2)).toEqual([2]);
  });

  it('keeps the set sorted, so a stored record reads the same every time', () => {
    expect(withUndoPaid(withUndoPaid(withUndoPaid([], 5), 1), 3)).toEqual([1, 3, 5]);
  });

  it('does not mutate what it is given', () => {
    const paid = [1];
    withUndoPaid(paid, 2);
    expect(paid).toEqual([1]);
  });
});

describe('forgetting a branch', () => {
  it('drops marks at and above the new move', () => {
    expect(forgetFrom([0, 1, 2, 3], 2)).toEqual([0, 1]);
  });

  it('keeps marks below it — those moves are untouched', () => {
    expect(forgetFrom([0, 1], 5)).toEqual([0, 1]);
  });
});

/**
 * The rule as a player meets it, in one place.
 *
 * `depth` is the index of the move being taken back, so a five-move board
 * charges for depth 4, then 3, and so on down.
 */
describe('the charge across an undo/redo run', () => {
  it('charges the first undo of a move and never the same one again', () => {
    let paid: number[] = [];

    // Four moves played. Undo the last: depth 3, unpaid, so it is charged.
    expect(isUndoPaid(paid, 3)).toBe(false);
    paid = withUndoPaid(paid, 3);

    // Redo puts it back. Undo it again — same move, already bought.
    expect(isUndoPaid(paid, 3)).toBe(true);

    // Keep going down. Depth 2 has not been paid for.
    expect(isUndoPaid(paid, 2)).toBe(false);
    paid = withUndoPaid(paid, 2);
    expect(isUndoPaid(paid, 2)).toBe(true);
  });

  it('charges again once a different move is played at that depth', () => {
    // Undo depth 3, then redo, then play something else instead.
    let paid = withUndoPaid([], 3);
    expect(isUndoPaid(paid, 3)).toBe(true);

    // A fresh pour lands at depth 3 and discards the redo stack with it.
    paid = forgetFrom(paid, 3);

    // Undoing it is a new decision about a new move, so it is charged.
    expect(isUndoPaid(paid, 3)).toBe(false);
  });

  it('leaves deeper moves paid when a branch is taken above them', () => {
    // Undone to depth 1, then redone up to four moves, then a new fifth move.
    let paid = withUndoPaid(withUndoPaid(withUndoPaid([], 3), 2), 1);
    paid = forgetFrom(paid, 4);

    expect(isUndoPaid(paid, 4)).toBe(false);
    expect(isUndoPaid(paid, 3)).toBe(true);
    expect(isUndoPaid(paid, 1)).toBe(true);
  });
});

describe('reading a stored set', () => {
  it('accepts a set of non-negative integers', () => {
    expect(isPaidSet([])).toBe(true);
    expect(isPaidSet([0, 3, 7])).toBe(true);
  });

  it('rejects anything else — the record outlives the version that wrote it', () => {
    expect(isPaidSet(undefined)).toBe(false);
    expect(isPaidSet('3')).toBe(false);
    expect(isPaidSet([1.5])).toBe(false);
    expect(isPaidSet([-1])).toBe(false);
    expect(isPaidSet([1, null])).toBe(false);
  });
});

describe('the free allowance', () => {
  it('gives the gentlest mode the most, and the hardest the fewest', () => {
    // A fiendish board has one spare tube and does not forgive a bad pour, so
    // the undo is worth more there — and a thing worth more is not also handed
    // out more often.
    expect(freeUndosFor('gentle')).toBeGreaterThan(freeUndosFor('classic'));
    expect(freeUndosFor('classic')).toBeGreaterThan(freeUndosFor('fiendish'));
    expect(freeUndosFor('fiendish')).toBeGreaterThanOrEqual(1);
  });
});

describe('what an undo is charged', () => {
  it('is free while the level still owes free undos', () => {
    expect(undoCharge([], 0, 0, 'classic')).toEqual({ coins: 0, usesAllowance: true });
  });

  it('costs once the allowance is gone', () => {
    const spent = freeUndosFor('classic');
    expect(undoCharge([], 5, spent, 'classic')).toEqual({
      coins: PRICES.undo,
      usesAllowance: false,
    });
  });

  it('is free for a move already paid for, without spending the allowance', () => {
    const spent = freeUndosFor('fiendish');
    expect(undoCharge([3], 3, spent, 'fiendish')).toEqual({
      coins: 0,
      usesAllowance: false,
    });
  });

  it('spends the allowance before it spends coins', () => {
    // Fiendish allows one. The first undo is free and the second is not.
    expect(undoCharge([], 1, 0, 'fiendish').coins).toBe(0);
    expect(undoCharge([], 0, 1, 'fiendish').coins).toBe(PRICES.undo);
  });
});
