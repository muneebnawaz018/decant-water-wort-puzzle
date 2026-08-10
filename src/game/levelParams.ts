import type { LevelParams } from '@/core/types';
import { DEFAULT_DIFFICULTY, type Difficulty } from './difficulty';
import type { GenerateOptions } from './waterGenerator';

/**
 * Three curves, one per mode, each its own table — not one table with
 * modifiers.
 *
 * The modifier design this replaces ("fiendish = classic + 1 colour − 1
 * spare") had two structural bugs that no tuning could fix:
 *
 * 1. The base curve drops to one spare at level 201, so fiendish's `−1 spare`
 *    hit the floor of one from level 1. The mode burned the game's main
 *    difficulty lever before the first board, then had nothing left — and at
 *    201, when classic finally made its big jump, the gap between the modes
 *    *halved* instead of holding.
 * 2. The open-ended band rotates 10–12 colours, so fiendish's `+1` pushed into
 *    the 12-colour clamp and produced 11, 12, 12 — a third of its endgame was
 *    classic's exact shape with a different seed.
 *
 * Owning a whole table per mode costs a few lines and removes the coupling:
 * each curve spends the spare-tube lever at its own moment, and no arithmetic
 * on another mode's numbers can collide with a cap.
 *
 * **Classic's table is byte-for-byte the old shared table.** It is the curve
 * the game is tuned around and was verified over levels 1–1000; keeping it
 * identical means classic boards below 501 do not move in this rewrite.
 */
interface CurveRow {
  maxLevel: number;
  params: LevelParams;
}

/**
 * Easy. The relaxation promise, kept structurally: capacity stays 4, spares
 * never drop below 2, and the acceptance gate never tightens. Colours are the
 * only thing that grows, and slowly — the mode plateaus once they reach 12,
 * on purpose.
 */
const GENTLE_CURVE: readonly CurveRow[] = [
  {
    maxLevel: 30,
    params: { colourCount: 3, capacity: 4, extraTubes: 3, scrambleSteps: 8 },
  },
  {
    maxLevel: 90,
    params: { colourCount: 4, capacity: 4, extraTubes: 2, scrambleSteps: 16 },
  },
  {
    maxLevel: 160,
    params: { colourCount: 5, capacity: 4, extraTubes: 2, scrambleSteps: 26 },
  },
  {
    maxLevel: 240,
    params: { colourCount: 6, capacity: 4, extraTubes: 2, scrambleSteps: 36 },
  },
  {
    maxLevel: 330,
    params: { colourCount: 7, capacity: 4, extraTubes: 2, scrambleSteps: 46 },
  },
  {
    maxLevel: 430,
    params: { colourCount: 8, capacity: 4, extraTubes: 2, scrambleSteps: 56 },
  },
  {
    maxLevel: 540,
    params: { colourCount: 9, capacity: 4, extraTubes: 2, scrambleSteps: 66 },
  },
  {
    maxLevel: 660,
    params: { colourCount: 10, capacity: 4, extraTubes: 2, scrambleSteps: 76 },
  },
  {
    maxLevel: 790,
    params: { colourCount: 11, capacity: 4, extraTubes: 2, scrambleSteps: 84 },
  },
  {
    maxLevel: Infinity,
    params: { colourCount: 12, capacity: 4, extraTubes: 2, scrambleSteps: 90 },
  },
];

/** Medium — the old shared curve, unchanged. Doc §5's pacing. */
const CLASSIC_CURVE: readonly CurveRow[] = [
  { maxLevel: 5, params: { colourCount: 3, capacity: 4, extraTubes: 2, scrambleSteps: 8 } },
  {
    maxLevel: 20,
    params: { colourCount: 4, capacity: 4, extraTubes: 2, scrambleSteps: 16 },
  },
  {
    maxLevel: 50,
    params: { colourCount: 5, capacity: 4, extraTubes: 2, scrambleSteps: 28 },
  },
  {
    maxLevel: 100,
    params: { colourCount: 6, capacity: 4, extraTubes: 2, scrambleSteps: 40 },
  },
  {
    maxLevel: 200,
    params: { colourCount: 7, capacity: 4, extraTubes: 2, scrambleSteps: 55 },
  },
  {
    maxLevel: 350,
    params: { colourCount: 8, capacity: 4, extraTubes: 1, scrambleSteps: 70 },
  },
  {
    maxLevel: 500,
    params: { colourCount: 9, capacity: 5, extraTubes: 1, scrambleSteps: 90 },
  },
  {
    maxLevel: Infinity,
    params: { colourCount: 10, capacity: 5, extraTubes: 1, scrambleSteps: 110 },
  },
];

/**
 * Hard. Runs one step ahead of classic at every level — the colour thresholds
 * are chosen so classic never catches up to the same shape — and makes its
 * spare-tube jump at 101, a hundred levels before classic's. The endgame is a
 * fixed 12 colours rather than a rotation: fiendish has nowhere higher to
 * rotate to, and past 400 the acceptance gate is what keeps climbing.
 */
const FIENDISH_CURVE: readonly CurveRow[] = [
  {
    maxLevel: 5,
    params: { colourCount: 4, capacity: 4, extraTubes: 2, scrambleSteps: 12 },
  },
  {
    maxLevel: 20,
    params: { colourCount: 5, capacity: 4, extraTubes: 2, scrambleSteps: 20 },
  },
  {
    maxLevel: 50,
    params: { colourCount: 6, capacity: 4, extraTubes: 2, scrambleSteps: 32 },
  },
  {
    maxLevel: 100,
    params: { colourCount: 7, capacity: 4, extraTubes: 2, scrambleSteps: 48 },
  },
  {
    maxLevel: 140,
    params: { colourCount: 8, capacity: 4, extraTubes: 1, scrambleSteps: 60 },
  },
  {
    maxLevel: 200,
    params: { colourCount: 9, capacity: 4, extraTubes: 1, scrambleSteps: 72 },
  },
  {
    maxLevel: 280,
    params: { colourCount: 10, capacity: 5, extraTubes: 1, scrambleSteps: 85 },
  },
  {
    maxLevel: 400,
    params: { colourCount: 11, capacity: 5, extraTubes: 1, scrambleSteps: 100 },
  },
  {
    maxLevel: 520,
    params: { colourCount: 12, capacity: 5, extraTubes: 1, scrambleSteps: 115 },
  },
  {
    maxLevel: Infinity,
    params: { colourCount: 12, capacity: 5, extraTubes: 1, scrambleSteps: 130 },
  },
];

const CURVES: Record<Difficulty, readonly CurveRow[]> = {
  gentle: GENTLE_CURVE,
  classic: CLASSIC_CURVE,
  fiendish: FIENDISH_CURVE,
};

/** Highest colour index the theme can render (doc §9 lists 12 pieces). */
export const MAX_COLOURS = 12;

function rowIndexForLevel(curve: readonly CurveRow[], level: number): number {
  const index = curve.findIndex((row) => level <= row.maxLevel);
  return index === -1 ? curve.length - 1 : index;
}

/** Every 10th level is a breather (doc §5): one row easier, gate untightened. */
function isBreather(level: number): boolean {
  return level % 10 === 0;
}

/**
 * Params for a level. Every 10th level drops back one row as a breather
 * (doc §5). Classic's open-ended top row rotates 10 to 12 colours; the other
 * modes' top rows are fixed, so no arithmetic can run into the colour cap.
 *
 * Difficulty pulls the lever doc §5 says matters — spare tubes — rather than
 * colour count alone. A board always keeps at least one spare tube; with none
 * the puzzle is unplayable, not hard.
 */
export function paramsForLevel(
  level: number,
  difficulty: Difficulty = DEFAULT_DIFFICULTY
): LevelParams {
  const curve = CURVES[difficulty];
  const clamped = Math.max(1, Math.floor(level));
  let row = rowIndexForLevel(curve, clamped);
  if (isBreather(clamped)) row = Math.max(0, row - 1);

  const params = { ...curve[row]!.params };

  if (difficulty === 'classic' && row === curve.length - 1) {
    params.colourCount = 10 + (clamped % 3);
  }

  params.colourCount = Math.min(params.colourCount, MAX_COLOURS);
  return params;
}

/**
 * How the acceptance gate tightens with level — the growth dial the shape
 * params cannot provide.
 *
 * Colours cap at 12, capacity at 5, spares floor at 1 and scramble saturates,
 * so past the top of a curve the *shape* cannot get harder. What can is the
 * gate: rejecting boards that start with tubes already solved, tubes one lift
 * from solved, or too little mixing. The daily bonus puzzle proved the
 * mechanism — same 12 colours as an endgame level, but `maxSolvedTubes: 0` and
 * `maxCappedTubes: 1` make it the hardest board in the game. The median
 * untightened endgame board starts with five capped tubes, which reads as half
 * pre-played; squeezing that to two or one is growth a player feels long after
 * the shape dials are pinned.
 *
 * Breathers keep the untightened gate along with their easier row.
 *
 * Attempts and sample size rise with the gate, because a tighter gate accepts
 * fewer of the boards the scrambler produces. When no attempt passes,
 * `generateLevel` still returns the best board seen — the ramp degrades into
 * "the hardest board the attempts found", never a failure.
 *
 * These thresholds are save format: they decide which attempt a level accepts,
 * so moving them repoints boards exactly like editing a curve does. Same rule
 * as everything else here — bump `GENERATOR_VERSION` in the same commit.
 */
function gateForLevel(level: number, difficulty: Difficulty): GenerateOptions {
  if (difficulty === 'gentle' || isBreather(level)) return {};

  // The fragmentation ceilings are measured, not aspirational. Capacity-5
  // boards land between 0.50 and 0.68 on their own, but jointly with zero
  // solved tubes and a capped-tube cap the feasible region tops out around
  // 0.56–0.63 — ramps aimed higher rejected every attempt at the tight tiers,
  // which costs the whole attempt budget on every load and degrades the level
  // into whatever the fallback ranking prefers.
  if (difficulty === 'classic') {
    if (level <= 500) return {};
    return {
      minFragmentation: Math.min(0.55, 0.5 + Math.floor((level - 500) / 100) * 0.01),
      maxSolvedTubes: level > 700 ? 0 : 1,
      maxCappedTubes: level > 1300 ? 2 : level > 900 ? 3 : level > 600 ? 4 : Infinity,
      maxAttempts: level > 900 ? 120 : 80,
      sampleSize: level > 900 ? 10 : 8,
    };
  }

  // Fiendish: starts tightening at 401 and reaches the daily bonus's gate —
  // zero solved tubes, one capped — by 1301. Endgame Hard is the bonus
  // puzzle's construction, every level.
  if (level <= 400) return {};
  return {
    minFragmentation: Math.min(0.56, 0.5 + Math.floor((level - 400) / 100) * 0.01),
    maxSolvedTubes: 0,
    maxCappedTubes: level > 1300 ? 1 : level > 900 ? 2 : level > 600 ? 3 : 4,
    maxAttempts: level > 1300 ? 240 : level > 900 ? 160 : 100,
    sampleSize: level > 900 ? 10 : 8,
  };
}

/**
 * Everything `generateLevel` needs for a level beyond its seed: the board
 * shape and the gate it must clear. One function so the two can never be
 * computed against different levels.
 */
export function generationForLevel(level: number, difficulty: Difficulty): GenerateOptions {
  return { ...gateForLevel(level, difficulty), params: paramsForLevel(level, difficulty) };
}

export function tubeCount(params: LevelParams): number {
  return params.colourCount + params.extraTubes;
}
