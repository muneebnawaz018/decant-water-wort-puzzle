/**
 * Small numeric helpers shared by the UI.
 *
 * Pure and React-free, so they are unit-tested rather than eyeballed on a
 * screen — a percentage that silently goes NaN blanks a progress bar with no
 * error to notice.
 */

/** Clamp `value` into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * A width percentage for a progress bar, as a React Native style string.
 *
 * Guards the two ways this goes wrong in practice: a zero total, which would
 * produce `NaN%` and blank the bar, and a part above the total, which would
 * overflow its track.
 */
export function percentWidth(part: number, total: number): `${number}%` {
  if (!(total > 0)) return '0%';
  return `${clamp((part / total) * 100, 0, 100)}%`;
}

/** The fractional part of a number. Used for deterministic pseudo-random art. */
export function fract(value: number): number {
  return value - Math.floor(value);
}
