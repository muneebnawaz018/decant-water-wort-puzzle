import { clamp, compactCoins, fract, percentWidth } from '../number';

describe('clamp', () => {
  it('passes a value already in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('holds both ends', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(30, 0, 10)).toBe(10);
  });
});

describe('percentWidth', () => {
  it('reads as a percentage string', () => {
    expect(percentWidth(1, 4)).toBe('25%');
  });

  // The bug this exists for: `0 / 0` is NaN, and `NaN%` blanks a progress bar
  // with no error anywhere.
  it('returns zero rather than NaN on an empty total', () => {
    expect(percentWidth(0, 0)).toBe('0%');
    expect(percentWidth(3, 0)).toBe('0%');
  });

  it('never overflows its track', () => {
    expect(percentWidth(9, 4)).toBe('100%');
  });
});

describe('fract', () => {
  it('keeps only the fractional part', () => {
    expect(fract(2.25)).toBeCloseTo(0.25);
    expect(fract(-1.75)).toBeCloseTo(0.25);
  });
});

describe('compactCoins', () => {
  it('leaves a short number alone', () => {
    // "0.9K" is longer than "850" and says less. The point is width, and
    // three digits already fit.
    expect(compactCoins(0)).toBe('0');
    expect(compactCoins(850)).toBe('850');
    expect(compactCoins(999)).toBe('999');
  });

  it('shortens from a thousand up', () => {
    expect(compactCoins(1000)).toBe('1K');
    expect(compactCoins(1200)).toBe('1.2K');
    expect(compactCoins(12_480)).toBe('12.4K');
    expect(compactCoins(1_000_000)).toBe('1M');
    expect(compactCoins(3_450_000)).toBe('3.4M');
    expect(compactCoins(2_000_000_000)).toBe('2B');
  });

  /**
   * Down, never up. A balance of 1,999 shown as "2K" tells the player they can
   * afford a 2,000 skin they cannot, and they find out by pressing Buy — the
   * one error in a currency display that costs a wasted tap.
   */
  it('truncates rather than rounds', () => {
    expect(compactCoins(1999)).toBe('1.9K');
    // Past 100 the decimal is dropped, so this truncates twice over: 999.999K
    // loses its fraction to the width rule and then floors.
    expect(compactCoins(999_999)).toBe('999K');
  });

  it('drops a decimal that would be a trailing zero', () => {
    // "1.0K" reads as a rounding artefact rather than as a number.
    expect(compactCoins(1000)).not.toContain('.');
    expect(compactCoins(5_000_000)).toBe('5M');
  });

  it('never renders wider than six characters', () => {
    for (const value of [0, 999, 1000, 99_999, 999_999, 1e6, 999e6, 9.99e9]) {
      expect(compactCoins(value).length).toBeLessThanOrEqual(6);
    }
  });

  it('handles a negative balance and a fractional one', () => {
    // Neither should reach the UI — coins are whole and floored at zero — but
    // this formats whatever it is handed rather than producing "NaN" in a pill.
    expect(compactCoins(-1500)).toBe('-1.5K');
    expect(compactCoins(1500.7)).toBe('1.5K');
  });
});
