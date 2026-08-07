import { bandsFor, isKnownLevel, isSameReading, LOW_LEVEL, percentOf } from '../battery';
import { colours } from '@/theme/colors';

/**
 * The gauge's arithmetic.
 *
 * The native side is two dozen lines of Kotlin and Swift that can only be
 * checked on a device. What can be checked here is everything that decides what
 * gets drawn — and the sentinel handling in particular, because `-1` is a valid
 * `number` that would otherwise draw a vial filled past its own bottom.
 */

describe('isKnownLevel', () => {
  it('accepts the full range', () => {
    expect(isKnownLevel(0)).toBe(true);
    expect(isKnownLevel(0.5)).toBe(true);
    expect(isKnownLevel(1)).toBe(true);
  });

  it("rejects the platform's -1 sentinel", () => {
    // Both platforms report this: an iOS simulator always, and any device
    // before battery monitoring is switched on.
    expect(isKnownLevel(-1)).toBe(false);
  });

  it('rejects anything out of range', () => {
    expect(isKnownLevel(1.5)).toBe(false);
    expect(isKnownLevel(-0.01)).toBe(false);
  });
});

describe('bandsFor', () => {
  it('falls back to the two-band brand mark with no reading', () => {
    expect(bandsFor(null, 'unknown')).toHaveLength(2);
    expect(bandsFor(-1, 'unknown')).toHaveLength(2);
  });

  it('draws one band for a real reading', () => {
    // Two bands would be read as part of the level.
    expect(bandsFor(0.5, 'battery')).toHaveLength(1);
  });

  it('fills from the bottom, so a full battery starts at the top', () => {
    expect(bandsFor(1, 'battery')[0]!.top).toBe(0);
    expect(bandsFor(0.25, 'battery')[0]!.top).toBe(0.75);
    expect(bandsFor(0, 'battery')[0]!.top).toBe(1);
  });

  it('warns in coral when the charge is low', () => {
    expect(bandsFor(LOW_LEVEL - 0.01, 'battery')[0]!.colour).toBe(colours.coral);
  });

  it('uses the accent while plugged in', () => {
    expect(bandsFor(0.8, 'plugged')[0]!.colour).toBe(colours.accent);
  });

  /**
   * Charging beats low, and that ordering is the point. A phone on 5% and
   * climbing is not the situation a warning colour is for — the warning would
   * be telling the player about a problem they have already solved.
   */
  it('prefers the charging colour over the warning colour', () => {
    expect(bandsFor(0.05, 'plugged')[0]!.colour).toBe(colours.accent);
  });

  it('uses the app colour in between', () => {
    expect(bandsFor(0.8, 'battery')[0]!.colour).toBe(colours.aqua);
  });
});

describe('percentOf', () => {
  it('rounds to what the mark can show', () => {
    expect(percentOf(0.759999)).toBe(76);
    expect(percentOf(1)).toBe(100);
    expect(percentOf(0)).toBe(0);
  });
});

describe('isSameReading', () => {
  /**
   * The dedupe that keeps this free.
   *
   * Android's broadcast carries temperature and voltage as well as charge, so
   * it fires while the percentage sits still. Without this, each of those is a
   * React render for pixels that do not move.
   */
  it('ignores a change below a whole percent', () => {
    const a = { level: 0.7601, source: 'battery' as const };
    const b = { level: 0.7604, source: 'battery' as const };
    expect(isSameReading(a, b)).toBe(true);
  });

  it('notices a whole percent', () => {
    const a = { level: 0.76, source: 'battery' as const };
    const b = { level: 0.77, source: 'battery' as const };
    expect(isSameReading(a, b)).toBe(false);
  });

  /**
   * A cable going in changes the colour without changing the height, so a
   * comparison on level alone would leave the mark aqua while charging.
   */
  it('notices the power source alone changing', () => {
    const a = { level: 0.76, source: 'battery' as const };
    const b = { level: 0.76, source: 'plugged' as const };
    expect(isSameReading(a, b)).toBe(false);
  });

  it('treats two unknowns as the same', () => {
    const a = { level: null, source: 'unknown' as const };
    const b = { level: null, source: 'unknown' as const };
    expect(isSameReading(a, b)).toBe(true);
  });

  it('notices a reading arriving after none', () => {
    const a = { level: null, source: 'unknown' as const };
    const b = { level: null, source: 'battery' as const };
    expect(isSameReading(a, b)).toBe(false);
  });
});
