import { coinsFor, starsFor } from '../stars';

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
    expect(coinsFor(1)).toBe(20);
    expect(coinsFor(3)).toBe(60);
  });
});
