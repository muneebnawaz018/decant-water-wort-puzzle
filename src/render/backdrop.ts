/**
 * Backdrop geometry, spec §3. Pure so it can be tested without a canvas —
 * importing Skia outside a native runtime throws.
 *
 * Three layers: a warm lamp glow above, a magenta wash below, and a linear
 * ground between them. Together they stop a flat dark screen reading as black.
 */

import { createRng } from '@/core/rng';

export interface RadialSpec {
  cx: number;
  cy: number;
  r: number;
}

/**
 * Warm lamp, top center. Spec puts it at 50% / -8% with a 120%×60% spread; a
 * circle at the mean of those radii is close enough and far cheaper.
 */
export function lampGlow(width: number, height: number): RadialSpec {
  return {
    cx: width * 0.5,
    cy: height * -0.08,
    r: Math.max(width * 0.6, height * 0.3),
  };
}

/** Magenta wash, bottom right. Spec: 90%×55% at 85% / 108%. */
export function washGlow(width: number, height: number): RadialSpec {
  return {
    cx: width * 0.85,
    cy: height * 1.08,
    r: Math.max(width * 0.45, height * 0.275) * 2,
  };
}

/**
 * The ground gradient runs at 170°, which is near-vertical with a slight lean.
 * Returned as start/end points because Skia takes vectors, not degrees.
 */
export function groundVector(
  width: number,
  height: number
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  // 170° from the vertical axis: mostly top-to-bottom, drifting left.
  const radians = (170 * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  return {
    start: {
      x: width * 0.5 - (dx * width) / 2,
      y: height * 0.5 - (dy * height) / 2,
    },
    end: {
      x: width * 0.5 + (dx * width) / 2,
      y: height * 0.5 + (dy * height) / 2,
    },
  };
}

export interface Mote {
  /** Horizontal position as a fraction of width. */
  x: number;
  radius: number;
  /** Where in its rise this mote starts, so they do not move as one. */
  offset: number;
  /**
   * Rises per full clock turn. Whole numbers only, and that is load-bearing:
   * a mote's phase is `(clock * speed + offset) % 1`, so when the clock wraps
   * 1 → 0 the phase shifts by `-speed mod 1`. That is zero only for an integer
   * speed. A fractional one teleports every mote on the wrap frame, which
   * reads as a blink. Variety comes in whole steps instead, and `offset`
   * carries the rest of it.
   */
  speed: number;
  /** Sideways drift over one rise, as a fraction of width. */
  drift: number;
}

/**
 * Fixed seed for the drift. Any value works — what matters is that it never
 * changes at runtime, so the field is identical on every launch and a
 * re-render cannot re-roll it.
 */
const MOTE_SEED = 0x5eed;

/** Narrowest and widest a mote gets, in points. */
const MIN_RADIUS = 1;
const RADIUS_RANGE = 1.6;

/** Margin kept clear at each edge, as a fraction of width. */
const EDGE_INSET = 0.05;

/**
 * Warm motes drifting up through the scene (spec §6, "ambient").
 *
 * Positions are stratified, not sampled: the width is cut into one band per
 * mote and each mote is placed somewhere inside its own band. Fourteen
 * independent draws clump — that is what independent draws do at this sample
 * size — and a clump reads as a deliberate cluster rather than as atmosphere.
 * Stratifying keeps the field even across the screen while the jitter inside
 * each band keeps it from looking like a row of pickets.
 *
 * The starting phases are stratified the same way, so the motes are spread
 * through their rise as well as across the width. Those bands are shuffled
 * before use: handing band `i` of the width the `i`th phase would march them
 * up the screen in a diagonal rank.
 *
 * Kept to a low count on purpose: this runs behind every screen for as long as
 * the app is open, so it is the one animation whose cost is always being paid.
 */
export function ambientMotes(count = 14): Mote[] {
  const rng = createRng(MOTE_SEED);
  const phases = rng.shuffle(Array.from({ length: count }, (_, i) => i));

  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const band = (i + rng.next()) / count;
    const phase = (phases[i]! + rng.next()) / count;

    motes.push({
      x: EDGE_INSET + band * (1 - EDGE_INSET * 2),
      radius: MIN_RADIUS + rng.next() * RADIUS_RANGE,
      offset: phase,
      speed: 1 + Math.floor(rng.next() * 3),
      // Drawn independently of `x`. Deriving it from the position, as this
      // once did, tied every mote's drift to which side it started on.
      drift: (rng.next() - 0.5) * 0.06,
    });
  }
  return motes;
}

/**
 * A mote's opacity over its rise: fades in low, holds, fades out at the top.
 * Matches the prototype's 0 → .8 → .4 → 0 keyframes.
 */
export function moteOpacity(t: number): number {
  'worklet';
  const value =
    t < 0.15
      ? (t / 0.15) * 0.8
      : t < 0.85
        ? 0.8 - ((t - 0.15) / 0.7) * 0.4
        : 0.4 * (1 - (t - 0.85) / 0.15);
  // The tail lands a hair below zero in floating point. Skia takes a negative
  // opacity without complaining and the result is undefined, so clamp.
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * How many frames' worth of drift one frame may be asked to carry. Past this
 * the clock is pinned rather than advanced: a long stall would otherwise be
 * paid back as one large jump on the frame that recovers.
 *
 * Counted in frames, not milliseconds, because a fixed ceiling means different
 * things on different panels. The 50ms this replaced was three frames on a
 * 60Hz phone and six on a 120Hz one — twice the tolerance for a visible jump
 * on the display where a jump is more visible.
 */
const MAX_STALL_FRAMES = 3;

/** Where the frame-interval estimate starts, before any frame has landed. */
export const ASSUMED_FRAME_MS = 1000 / 60;

/**
 * Weight of each new sample in the frame-interval estimate. Low: the interval
 * only changes when the panel changes rate, so the estimate ignores single
 * slow frames and tracks the underlying cadence.
 */
const FRAME_EMA = 0.1;

/**
 * A frame this much longer than the running estimate is a stall, not a sample,
 * and is kept out of the average. A stall must never teach the estimate that
 * slow is normal, because that would raise the ceiling meant to catch it.
 *
 * Generous on purpose — it has to let a real rate change through. Coming from
 * the 60Hz seed, a 120Hz panel's 8.3ms frames are well under the bar and the
 * estimate walks down to them; a 30Hz one walks up. A 200ms hitch does not.
 */
const STALL_RATIO = 3;

/** The clock and its frame-interval estimate, after one frame. */
export interface DriftState {
  clock: number;
  frameMs: number;
}

/**
 * Advance a 0..1 drift clock by one frame, in units of frames rather than
 * milliseconds.
 *
 * The refresh rate is learned from the frames themselves. Nothing has to be
 * told what the panel runs at, and nothing has to be re-told when it changes —
 * Android drops to 60 under thermal load and iOS varies ProMotion between 10
 * and 120 on its own, so a rate read once at mount is wrong for most of a
 * session.
 *
 * Speed is unaffected by any of this: the clock advances by real elapsed time,
 * so the drift covers the same ground per second at every rate. The estimate
 * only decides how much catch-up counts as a stall.
 */
export function advanceDrift(
  state: DriftState,
  elapsed: number,
  cycleMs: number
): DriftState {
  'worklet';
  const estimate = state.frameMs;
  const frameMs =
    elapsed > 0 && elapsed < estimate * STALL_RATIO
      ? estimate + (elapsed - estimate) * FRAME_EMA
      : estimate;

  const ceiling = estimate * MAX_STALL_FRAMES;
  const step = elapsed > ceiling ? ceiling : elapsed < 0 ? 0 : elapsed;

  return { clock: (state.clock + step / cycleMs) % 1, frameMs };
}
