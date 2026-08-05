/** Wording helpers. Pure, so the copy rules are testable. */

/** `1 move`, `2 moves`. English-only, which is all the app ships today. */
export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}
