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

/** Where each suffix starts, largest first. */
const UNITS = [
  { at: 1e9, suffix: 'B' },
  { at: 1e6, suffix: 'M' },
  { at: 1e3, suffix: 'K' },
] as const;

/**
 * A coin balance short enough to sit inside a pill or a toast.
 *
 * Under a thousand it is the number itself — 850 is already short, and "0.9K"
 * is both longer and less use. Above that it is one decimal at most, trimmed
 * when it would be a trailing zero: `1.2K`, `12K`, `1M`, `3.4M`.
 *
 * The decimal is dropped once the whole part reaches three digits, so nothing
 * ever renders wider than three characters plus a suffix — `999K`, not
 * `999.9K`.
 *
 * **Truncated, not rounded.** A balance of 1,999 shows `1.9K`, not `2K`. It is
 * the same reason a bank rounds a balance down: telling someone they have more
 * money than they do is the one error that costs them a tap, because the price
 * they can see is the one they will try to pay.
 */
export function compactCoins(value: number): string {
  const sign = value < 0 ? '-' : '';
  const amount = Math.abs(Math.floor(value));

  /*
    Past the largest unit the string starts growing again.

    `B` is the top tier, so a trillion is `1000B` and ten quadrillion is
    `12000000B` — nine characters in a control whose width is a declared
    constant. `COIN_PILL_WIDTH` is summed rather than measured, because
    `ScreenHeader` centers its title absolutely and needs the number before
    layout runs, so nothing downstream can absorb a string this wide: the pill
    simply grows into the title.

    Bounding it here rather than adding a `T` tier and a `Q` after it. No
    balance this game can pay comes close — the cap exists so the width is a
    guarantee rather than a reasonable expectation, and the `+` says the figure
    is a ceiling rather than the balance.
  */
  if (amount >= 1e12) return `${sign}999B+`;

  for (const { at, suffix } of UNITS) {
    if (amount < at) continue;

    const scaled = amount / at;
    // One decimal below 100, none above — `99.9M` and `100M` are both five
    // characters, and `100.4M` would be six.
    const text =
      scaled < 100 ? (Math.floor(scaled * 10) / 10).toFixed(1) : String(Math.floor(scaled));
    // `1.0K` reads as a rounding artefact. `1K` is the number.
    return `${sign}${text.replace(/\.0$/, '')}${suffix}`;
  }

  return `${sign}${amount}`;
}

/**
 * The whole balance, grouped — `1,204,832`. The counterpart to `compactCoins`.
 *
 * The pill shortens because it has a width to keep; this is what the player
 * gets when they ask what the short figure stands for, so it must not round,
 * truncate or abbreviate anything.
 *
 * Hand-grouped rather than `toLocaleString`. Hermes ships Intl, but its data is
 * the device's and the separator would then vary by locale while every other
 * string in the app is English — a comma here and a full stop on the next phone
 * is worse than one wrong convention consistently.
 */
export function groupedNumber(value: number): string {
  return String(Math.max(0, Math.floor(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
