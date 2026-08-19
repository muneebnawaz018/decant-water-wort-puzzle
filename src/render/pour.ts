import type { BoardLayout } from './layout';

/**
 * A pour is a journey, not a jump: the tube lifts out of the rack, flies to
 * the destination, tilts over its lip, empties, and returns. Doc §7 budgets
 * 350ms for the pour itself; the travel either side is on top of that.
 */
export const POUR_MS = 1850;

/**
 * Phases as fractions of the whole. The receiving level only rises once the
 * stream is actually falling — doc §7 is explicit that filling early is what
 * makes a pour look fake.
 */
export const PHASE = {
  // Pick-up and put-down are quick; the pour itself is the slow part. Most of
  // the 1850ms is liquid actually moving, which is the bit worth watching.
  travelStart: 0,
  travelEnd: 0.13,
  pourStart: 0.15,
  pourEnd: 0.74,
  returnStart: 0.87,
  returnEnd: 1,
  fillStart: 0.19,
  fillEnd: 0.76,
  splashStart: 0.21,
  splashEnd: 0.84,
  /** Drops that hang off the lip and fall after the stream has stopped. */
  dripStart: 0.7,
  dripEnd: 0.95,
} as const;

/** How far the tube tips over its lip, in radians. Just past horizontal. */
export const TILT = 1.78;

/** Drops left clinging to the lip once the stream stops. */
const DRIP_COUNT = 3;

/** Downward acceleration for thrown droplets. Tuned against POUR_MS. */
export const GRAVITY = 5.2;

const PARTICLE_COUNT = 20;

/**
 * Metaball threshold. Blur the liquid layer, then push alpha through a steep
 * ramp: overlapping blobs fuse into one surface with real tension, and lone
 * droplets round off. This is what separates liquid from a handful of circles.
 */
export const GOO_MATRIX = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 26, -10];

interface Point {
  x: number;
  y: number;
}

export interface PourGeometry {
  /** Corner the tube pivots and pours over, in its resting position. */
  pivot: Point;
  /** Where that corner ends up, hanging over the destination. */
  target: Point;
  /** Tilt at full extension. Signed so the body leans away from the target. */
  tilt: number;
  /** Horizontal center of the falling stream. */
  streamX: number;
  /** Surface of the destination before this pour started. */
  surfaceY: number;
  /** Width of the falling stream. */
  width: number;
}

/**
 * Everything the renderer needs to fly one tube to another and pour it.
 * Pure geometry, so the whole motion can be unit-tested without a canvas.
 */
export function pourGeometry(
  layout: BoardLayout,
  from: number,
  to: number,
  destFilled: number
): PourGeometry {
  const source = layout.tubes[from]!;
  const dest = layout.tubes[to]!;

  // The tube pours over whichever lip corner faces the destination, and leans
  // back over that corner so its body never covers the tube it is filling.
  const pouringRight = dest.x >= source.x;
  const pivot: Point = {
    x: source.x + (pouringRight ? source.width : 0),
    y: source.y,
  };

  const streamX = dest.x + dest.width / 2;
  // Hangs clear above the destination: tilted almost flat, the tube's body
  // sweeps a long way from the lip and would otherwise cover the tube it is
  // filling.
  const target: Point = {
    x: streamX + (pouringRight ? -source.width * 0.1 : source.width * 0.1),
    y: dest.y - layout.segmentHeight * 1.15,
  };

  return {
    pivot,
    target,
    tilt: pouringRight ? -TILT : TILT,
    streamX,
    surfaceY: dest.y + dest.height - destFilled * layout.segmentHeight,
    width: layout.segmentHeight * 0.34,
  };
}

/** Maps overall progress onto a phase, clamped to 0..1. */
export function phaseProgress(progress: number, start: number, end: number): number {
  'worklet';
  if (end <= start) return progress >= end ? 1 : 0;
  const t = (progress - start) / (end - start);
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Smoothstep. Takes the mechanical edge off the travel either side. */
function ease(t: number): number {
  'worklet';
  return t * t * (3 - 2 * t);
}

/**
 * How far the tube is from its resting place, 0 to 1: out on the way there,
 * held while pouring, back again afterwards.
 */
export function extension(progress: number): number {
  'worklet';
  const out = phaseProgress(progress, PHASE.travelStart, PHASE.travelEnd);
  const back = phaseProgress(progress, PHASE.returnStart, PHASE.returnEnd);
  return ease(out) * (1 - ease(back));
}

export interface Particle {
  /** Launch velocity, in multiples of the segment height per unit time. */
  vx: number;
  vy: number;
  radius: number;
  /** Fraction of the splash window to wait before launching. */
  delay: number;
  /** Lifetime as a fraction of the splash window. */
  life: number;
}

/**
 * Deterministic hash in 0..1. `Math.random` is banned here: a pour must look
 * identical every time it replays.
 */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Droplets thrown out where the stream hits the surface.
 *
 * Two populations, because real splashes have both: a wide low-energy sheet
 * that hugs the surface, and a few fast fine droplets that fly high. A single
 * even spread is exactly what made the first attempt look like a cartoon.
 */
export function splashParticles(count = PARTICLE_COUNT): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const a = hash(i);
    const b = hash(i + 91);
    const c = hash(i + 173);

    const side = i % 2 === 0 ? -1 : 1;
    const fine = i % 3 === 0;

    const speed = fine ? 0.75 + a * 0.6 : 0.3 + a * 0.35;
    const angle = fine ? 0.75 + b * 0.5 : 0.15 + b * 0.35;

    particles.push({
      vx: side * speed * Math.cos(angle - 0.2) * (fine ? 0.7 : 1.1),
      vy: -speed * Math.sin(angle + 0.35) * (fine ? 1.7 : 0.8),
      radius: fine ? 0.07 + c * 0.05 : 0.11 + c * 0.07,
      delay: c * 0.3,
      life: fine ? 0.7 + a * 0.3 : 0.45 + b * 0.3,
    });
  }

  return particles;
}

export interface Drip {
  /** When this drop lets go, as a fraction of the drip window. */
  delay: number;
  radius: number;
  /** Slight sideways drift so they do not fall in a single file. */
  drift: number;
}

/**
 * The last few drops hanging off the lip. Liquid does not stop dead when a
 * pour ends — it beads up and lets go, one drop at a time.
 */
export function lipDrips(count = DRIP_COUNT): Drip[] {
  const drips: Drip[] = [];
  for (let i = 0; i < count; i++) {
    const a = hash(i + 401);
    drips.push({
      delay: (i / count) * 0.55 + a * 0.12,
      radius: 0.22 - i * 0.035,
      drift: (a - 0.5) * 0.4,
    });
  }
  return drips;
}
