import { colours } from '@/theme/colors';

/**
 * The battery mark's arithmetic, with no `expo-battery` in it.
 *
 * Its own module for the same reason `src/core` is React-free: importing the
 * battery module pulls a native module, which cannot load in a test. What is
 * decided here — how full the vial is drawn, what colour the liquid takes, and
 * whether a reading is worth re-rendering for — is the part that can be wrong.
 */

/** Below this, the liquid turns to the warning colour. */
export const LOW_LEVEL = 0.2;

/**
 * How the device is powered, reduced to the three cases the mark draws.
 *
 * Ours rather than `expo-battery`'s `BatteryState`, so nothing here imports the
 * native module. The hook maps five platform states onto these: `FULL` and
 * `NOT_CHARGING` both read as plugged in, because from the mark's point of view
 * they are — the cable is attached and the level is not falling.
 */
export type PowerSource = 'battery' | 'plugged' | 'unknown';

export interface Band {
  /** Where the band starts, as a share of the tube's height from the top. */
  top: number;
  colour: string;
}

/**
 * The brand mark: two stacked bands, the shape the launcher icon draws.
 *
 * What the drawer shows when there is no reading — an iOS simulator, a device
 * that does not report, or the first frame before the first read resolves. It
 * is deliberately the identity rather than an empty tube or a spinner: a mark
 * that cannot show a level should look like a logo, not like a broken gauge.
 */
const BRAND: readonly Band[] = [
  { top: 0.5, colour: colours.plum },
  { top: 0.75, colour: colours.aqua },
];

/**
 * A reading the platform actually gave us.
 *
 * `expo-battery` returns `-1` for "unknown", which is a sentinel inside the
 * valid-looking number type — left unchecked it draws a vial filled 100% past
 * the bottom. Anything outside 0..1 is treated the same way.
 */
export function isKnownLevel(level: number): boolean {
  return level >= 0 && level <= 1;
}

/**
 * The liquid, for a given charge.
 *
 * One band, not two. The brand mark stacks colours because it has to say
 * "sorted colour"; a gauge has to say one number, and a second band would be
 * read as part of the level.
 *
 * Colour carries the state that the height cannot: green while it is filling
 * from the wall, red when it is nearly out, and the app's own aqua the rest of
 * the time. `charging` wins over `low`, because a phone on 5% and climbing is
 * not the thing a warning colour is for.
 */
export function bandsFor(level: number | null, source: PowerSource): readonly Band[] {
  if (level === null || !isKnownLevel(level)) return BRAND;

  const colour =
    source === 'plugged'
      ? colours.accent
      : level <= LOW_LEVEL
        ? colours.coral
        : colours.aqua;

  // `top` is measured from the top of the tube, so a full battery starts at 0.
  return [{ top: 1 - level, colour }];
}

/**
 * The level rounded to what the mark can actually show.
 *
 * Used to drop updates that change nothing. Android's battery broadcast carries
 * temperature and voltage as well as charge, so it fires while the number the
 * vial draws stays put; iOS quantises to about 5% and reports the same figure
 * repeatedly. Either way, re-rendering for a change below a whole percent is
 * work with no pixels behind it.
 */
export function percentOf(level: number): number {
  return Math.round(level * 100);
}

/** Whether a new reading is worth a render. */
export function isSameReading(
  a: { level: number | null; source: PowerSource },
  b: { level: number | null; source: PowerSource }
): boolean {
  if (a.source !== b.source) return false;
  if (a.level === null || b.level === null) return a.level === b.level;
  return percentOf(a.level) === percentOf(b.level);
}
