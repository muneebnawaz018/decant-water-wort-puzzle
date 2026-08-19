import { colors } from '@/theme/colors';

/**
 * The battery mark's arithmetic, with no `expo-battery` in it.
 *
 * Its own module for the same reason `src/core` is React-free: importing the
 * battery module pulls a native module, which cannot load in a test. What is
 * decided here — how full the vial is drawn, what color the liquid takes, and
 * whether a reading is worth re-rendering for — is the part that can be wrong.
 */

/** Below this, the liquid turns to the warning color. */
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

export interface Charge {
  /** How many cells are lit, 0..`total`. */
  filled: number;
  color: string;
}

/** Cells in the mark. Five, like every battery glyph people already read. */
export const CELLS = 5;

/**
 * A full cell stack, in the same green a healthy battery draws.
 *
 * What the drawer shows when there is no reading — an iOS simulator, a device
 * that does not report, or the first frame before the first read resolves.
 *
 * It was the brand's two-color stack first, on the theory that a mark unable
 * to show a level should look like a logo rather than a broken gauge. In the
 * hand it reads as a *reading*: bands at fixed heights look like a battery at
 * some strange level in strange colors, and nothing on screen says otherwise.
 * Full and green is the one fallback that cannot be misread as bad news.
 */
const FALLBACK: Charge = { filled: CELLS, color: colors.accent };

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
 * The lit cells, for a given charge.
 *
 * Cells rather than a continuous column, and the reason is legibility at the
 * size this is drawn. A 36dp bar with a moving surface asks the eye to measure
 * a height; five blocks ask it to count, and counting to five is instant and
 * exact where estimating a fraction is neither.
 *
 * Each block owns a fifth of the range, and a block lights the moment its slice
 * is entered — 81% and 100% both show five, 41% and 60% both show three:
 *
 *     0%        empty
 *     1-20%     one block
 *     21-40%    two
 *     41-60%    three
 *     61-80%    four
 *     81-100%   five
 *
 * `ceil`, so the count answers "how much is left" rather than "how much is
 * certainly left". Rounding was tried and puts 90% on five *and* 81% on four,
 * which makes the boundaries land at 10, 30, 50 — halfway through each block's
 * own slice, and impossible to explain to anyone reading the glyph. Flooring is
 * worse: a full battery would need exactly 100.0% to show its last block.
 *
 * Anything above zero keeps a block, which `ceil` gives for free: a phone with
 * 3% left shows the red block it is warning about, where an empty outline would
 * say "no reading" — a different thing entirely.
 *
 * Green, and red when it is nearly out. Those are the two colors a battery is
 * read in everywhere else on the phone, and a gauge is not the place to be
 * inventive — the status bar two inches above this one uses exactly them.
 *
 * The healthy color was the app's aqua at first, to tie the mark to the brand.
 * It reads as blue on a device, and blue on a battery means nothing to anyone;
 * worse, it is the one part of this mark carrying information that has to land
 * without a caption. Green is not decoration here, it is the label.
 *
 * Plugged in draws the same green rather than a third color. It is not a
 * warning and the level is not falling, which is all the color has to say —
 * and `low` never overrides it, because a phone on 5% and climbing is not what
 * a warning color is for.
 */
export function chargeFor(level: number | null, source: PowerSource): Charge {
  if (level === null || !isKnownLevel(level)) return FALLBACK;

  const color = source !== 'plugged' && level <= LOW_LEVEL ? colors.coral : colors.accent;

  const filled = Math.ceil(level * CELLS);

  return { filled, color };
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
