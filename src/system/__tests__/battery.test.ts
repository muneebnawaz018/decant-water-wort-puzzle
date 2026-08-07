import {
  CELLS,
  chargeFor,
  isKnownLevel,
  isSameReading,
  LOW_LEVEL,
  percentOf,
} from '../battery';
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

describe('chargeFor', () => {
  // Full green, not the brand's two-band stack. Two bands at fixed heights
  // read as a battery at a strange level in strange colours, which is worse
  // than saying nothing — and there is no caption to correct the impression.
  it('falls back to every cell lit, in green, with no reading', () => {
    for (const missing of [null, -1]) {
      const charge = chargeFor(missing, 'unknown');
      expect(charge.filled).toBe(CELLS);
      expect(charge.colour).toBe(colours.accent);
    }
  });

  // Blue on a battery means nothing to anyone, and this is the one part of the
  // mark carrying information that has to land without a caption.
  it('draws a healthy charge in green, never the brand aqua', () => {
    expect(chargeFor(0.8, 'battery').colour).toBe(colours.accent);
    expect(chargeFor(0.5, 'unknown').colour).toBe(colours.accent);
  });

  // Each block owns a fifth, and lights the moment its slice is entered. The
  // boundaries then fall where a reader would put them — 20, 40, 60, 80 — which
  // rounding does not: it would light the fifth block at 90.
  it('gives each block a fifth of the range', () => {
    const bands: ReadonlyArray<[number, number]> = [
      [0.01, 1],
      [0.2, 1],
      [0.21, 2],
      [0.4, 2],
      [0.41, 3],
      [0.6, 3],
      [0.61, 4],
      [0.8, 4],
      [0.81, 5],
      [1, 5],
    ];

    for (const [level, expected] of bands) {
      expect(chargeFor(level, 'battery').filled).toBe(expected);
    }
    expect(chargeFor(1, 'battery').filled).toBe(CELLS);
  });

  // An empty outline means "no reading", which is a different thing from a
  // phone that is nearly flat and needs to say so.
  it('keeps one cell lit above zero, and none at zero', () => {
    expect(chargeFor(0.03, 'battery').filled).toBe(1);
    expect(chargeFor(0, 'battery').filled).toBe(0);
  });

  it('warns in coral when the charge is low', () => {
    expect(chargeFor(LOW_LEVEL - 0.01, 'battery').colour).toBe(colours.coral);
  });

  it('uses the accent while plugged in', () => {
    expect(chargeFor(0.8, 'plugged').colour).toBe(colours.accent);
  });

  /**
   * Charging beats low, and that ordering is the point. A phone on 5% and
   * climbing is not the situation a warning colour is for — the warning would
   * be telling the player about a problem they have already solved.
   */
  it('prefers the charging colour over the warning colour', () => {
    expect(chargeFor(0.05, 'plugged').colour).toBe(colours.accent);
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
