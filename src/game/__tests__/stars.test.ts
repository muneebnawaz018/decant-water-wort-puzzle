import { coinsFor, starsFor } from '../stars';

describe('starsFor', () => {
  it('pays three stars for par or better', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(7, 10)).toBe(3);
  });

  it('pays two up to half again over par', () => {
    expect(starsFor(11, 10)).toBe(2);
    expect(starsFor(15, 10)).toBe(2);
  });

  it('pays one beyond that', () => {
    expect(starsFor(16, 10)).toBe(1);
    expect(starsFor(500, 10)).toBe(1);
  });

  it('never pays zero — there is no fail state', () => {
    for (let moves = 1; moves <= 200; moves++) {
      expect(starsFor(moves, 6)).toBeGreaterThanOrEqual(1);
    }
  });

  it('rounds the two-star boundary up, so an odd par is not harsher', () => {
    // par 7 → 1.5x is 10.5; a 10-move run should still be two stars.
    expect(starsFor(10, 7)).toBe(2);
    expect(starsFor(11, 7)).toBe(2);
    expect(starsFor(12, 7)).toBe(1);
  });
});

describe('coinsFor', () => {
  it('scales with stars', () => {
    expect(coinsFor(1)).toBe(20);
    expect(coinsFor(3)).toBe(60);
  });
});
