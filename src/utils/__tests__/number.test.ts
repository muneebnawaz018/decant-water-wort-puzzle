import { clamp, fract, percentWidth } from '../number';

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
