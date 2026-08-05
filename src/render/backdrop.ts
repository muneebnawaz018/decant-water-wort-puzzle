/**
 * Backdrop geometry, spec §3. Pure so it can be tested without a canvas —
 * importing Skia outside a native runtime throws.
 *
 * Three layers: a warm lamp glow above, a magenta wash below, and a linear
 * ground between them. Together they stop a flat dark screen reading as black.
 */

export interface RadialSpec {
  cx: number;
  cy: number;
  r: number;
}

/**
 * Warm lamp, top centre. Spec puts it at 50% / -8% with a 120%×60% spread; a
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
  /** Rises per full clock turn. Varies so the drift never looks like a grid. */
  speed: number;
  /** Sideways drift over one rise, as a fraction of width. */
  drift: number;
}

/** Deterministic hash in 0..1. `Math.random` would re-roll every render. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Warm motes drifting up through the scene (spec §6, "ambient").
 *
 * Kept to a low count on purpose: this runs behind every screen for as long as
 * the app is open, so it is the one animation whose cost is always being paid.
 */
export function ambientMotes(count = 14): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const a = hash(i);
    const b = hash(i + 53);
    const c = hash(i + 149);
    motes.push({
      x: 0.05 + a * 0.9,
      radius: 1 + b * 1.6,
      offset: c,
      speed: 0.55 + b * 0.6,
      drift: (a - 0.5) * 0.06,
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
