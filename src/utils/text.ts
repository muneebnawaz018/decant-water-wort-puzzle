/** Wording helpers. Pure, so the copy rules are testable. */

/** `1 move`, `2 moves`. English-only, which is all the app ships today. */
export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/**
 * A countdown as `H:MM:SS`, or `M:SS` under an hour.
 *
 * Rounds up, not down: a timer showing 0:00 while the thing is still locked
 * reads as broken, and the last second of a wait should say one second.
 */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
