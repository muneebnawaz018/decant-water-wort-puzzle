import { EARNINGS } from '../economy';
import { coinsFor, coinsForImprovement, starsFor } from '../stars';

/** `par / moves`, the ratio the bands are defined on. */
const efficiency = (moves: number, par: number) => par / moves;

describe('starsFor', () => {
  it('pays three stars for par or better', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(7, 10)).toBe(3);
  });

  it('pays three at 85% efficiency or above', () => {
    // Par 20: 23 moves is 87%, 24 is 83%.
    expect(efficiency(23, 20)).toBeGreaterThanOrEqual(0.85);
    expect(starsFor(23, 20)).toBe(3);

    expect(efficiency(24, 20)).toBeLessThan(0.85);
    expect(starsFor(24, 20)).toBe(2);
  });

  it('scales the allowance with the board, which is the point of a ratio', () => {
    // A 40-move puzzle has more places to lose a move than a 10-move one.
    expect(starsFor(11, 10)).toBe(3);
    expect(starsFor(12, 10)).toBe(2);
    expect(starsFor(47, 40)).toBe(3);
    expect(starsFor(48, 40)).toBe(2);
  });

  it('overrides the ratio within one move of par', () => {
    // Five moves on a four-move board is 80% — under the bar on exactly the
    // levels people are learning with.
    expect(efficiency(5, 4)).toBeLessThan(0.85);
    expect(starsFor(5, 4)).toBe(3);
  });

  it('pays two down to 50% efficiency, which is double par', () => {
    expect(starsFor(19, 10)).toBe(2);
    expect(starsFor(20, 10)).toBe(2);
    expect(starsFor(21, 10)).toBe(1);
  });

  it('never pays zero — there is no fail state', () => {
    for (let moves = 1; moves <= 500; moves++) {
      expect(starsFor(moves, 6)).toBeGreaterThanOrEqual(1);
    }
  });

  it('pays one for finishing, however long it took', () => {
    expect(starsFor(500, 15)).toBe(1);
    expect(starsFor(10_000, 15)).toBe(1);
  });

  it('keeps the three bands reachable and in order at every par', () => {
    for (let par = 1; par <= 60; par++) {
      const ceiling = par * 4 + 10;
      const bands = new Set<number>();
      for (let moves = par; moves <= ceiling; moves++) bands.add(starsFor(moves, par));
      expect(bands).toEqual(new Set([1, 2, 3]));

      // And the rating only ever falls as the move count rises.
      let previous = 3;
      for (let moves = par; moves <= ceiling; moves++) {
        const stars = starsFor(moves, par);
        expect(stars).toBeLessThanOrEqual(previous);
        previous = stars;
      }
    }
  });
});

describe('coinsFor', () => {
  it('scales with stars', () => {
    expect(coinsFor(1)).toBe(EARNINGS.coinsPerStar);
    expect(coinsFor(3)).toBe(EARNINGS.coinsPerStar * 3);
  });
});

describe('coinsForImprovement', () => {
  it('pays the full rate for a level never finished', () => {
    expect(coinsForImprovement(3, 0)).toBe(coinsFor(3));
  });

  it('pays nothing for a replay that does no better', () => {
    // The faucet this closes: gentle's early boards are seven moves long and
    // three-star in seconds, so a flat payout per solve mints coins on a loop.
    expect(coinsForImprovement(3, 3)).toBe(0);
    expect(coinsForImprovement(1, 2)).toBe(0);
  });

  it('pays the difference when a run beats the last one', () => {
    expect(coinsForImprovement(3, 1)).toBe(coinsFor(2));
    expect(coinsForImprovement(2, 1)).toBe(coinsFor(1));
  });

  it('never pays for going backwards', () => {
    expect(coinsForImprovement(1, 3)).toBe(0);
  });

  it('adds up to one full payout however many runs it takes', () => {
    // One star, then two, then three: the same 60 as three-starring it first
    // time, and not a coin more.
    const total =
      coinsForImprovement(1, 0) + coinsForImprovement(2, 1) + coinsForImprovement(3, 2);
    expect(total).toBe(coinsFor(3));
  });
});

/**
 * Hints no longer touch the rating.
 *
 * A per-hint ceiling existed while hints followed a merely-good line; it came
 * out when they became the provably shortest one. Perfect advice that lowers
 * the score of the player taking it teaches them not to take it, and the
 * economy already prices the help: a fully-hinted board costs more in hints
 * than its stars pay back. The rating judges the line played, whoever supplied
 * it.
 */
describe('hints and the rating', () => {
  it('rates a hinted optimal run as what it is — optimal', () => {
    // Follow every hint from move one and you finish at par.
    expect(starsFor(10, 10)).toBe(3);
  });

  it('takes only two arguments now — the ceiling is gone', () => {
    // Pinned so the ceiling cannot quietly return: the signature itself is
    // the contract. A third parameter reappearing here is an API change, not
    // a default.
    expect(starsFor.length).toBe(2);
  });
});
