import { fillAfterPour, rateForFill } from '../pitch';

/**
 * Doc §7: "pour sound pitched by how full the destination is. Higher as it
 * fills."
 *
 * The direction is the part worth pinning. A shorter air column resonates
 * higher, which is why filling a bottle rises in pitch and why getting this
 * backwards would sound wrong to a player who could not say why.
 */
describe('pour pitch', () => {
  it('rises with the destination fill', () => {
    expect(rateForFill(1)).toBeGreaterThan(rateForFill(0.5));
    expect(rateForFill(0.5)).toBeGreaterThan(rateForFill(0));
  });

  /**
   * Rate moves pitch *and* speed together — varispeed on iOS, `SoundPool`
   * resampling on Android. So the range is bounded by the animation, not by
   * taste: the pour sample has to still be playing while the liquid is visibly
   * moving, and a rate far from 1 finishes early or drags past the landing.
   */
  it('stays close enough to 1 that the sample still fits the animation', () => {
    for (const fill of [0, 0.25, 0.5, 0.75, 1]) {
      expect(rateForFill(fill)).toBeGreaterThan(0.85);
      expect(rateForFill(fill)).toBeLessThan(1.25);
    }
  });

  /**
   * `SoundPool` clamps rate to 0.5–2.0 and other backends throw outside
   * their floors rather than saturating, so a stray ratio must not reach one. `fill` is computed from
   * tube contents and a division, which is exactly where a NaN comes from.
   */
  it('survives nonsense input', () => {
    for (const bad of [NaN, Infinity, -Infinity, -5, 99]) {
      const rate = rateForFill(bad);
      expect(Number.isFinite(rate)).toBe(true);
      expect(rate).toBeGreaterThan(0.1);
      expect(rate).toBeLessThan(2);
    }
  });
});

describe('the fill a pour lands at', () => {
  /**
   * After, not before. The pitch a player hears is the one the vessel settles
   * at, and measuring before the pour would fall flat on every move — most
   * audibly on the pour that fills a vial, which is the one worth hearing.
   */
  it('counts the segments that just arrived', () => {
    expect(fillAfterPour(2, 2, 4)).toBe(1);
    expect(fillAfterPour(0, 1, 4)).toBe(0.25);
  });

  it('is a ratio, whatever the capacity', () => {
    expect(fillAfterPour(2, 1, 4)).toBe(fillAfterPour(3, 1.5, 6));
  });

  it('never leaves 0..1, and never divides by zero', () => {
    expect(fillAfterPour(9, 9, 4)).toBe(1);
    expect(fillAfterPour(-3, 0, 4)).toBe(0);
    expect(fillAfterPour(1, 1, 0)).toBe(0);
  });
});
