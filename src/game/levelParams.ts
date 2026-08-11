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
 * never drop below 2, and the gate ramp is the shallowest of the three.
 *
 * **Ten colours is the ceiling, and the reason is par cost rather than
 * difficulty.** Capacity 4 with two spare tubes is the most expensive shape in
 * the game to search — all that empty space branches — and the exact-par
 * search runs on the JS thread. Measured worst case on a laptop: 138ms at ten
 * colours, 209ms at eleven, 418ms at twelve, and Hermes on a phone is several
 * times slower again. Par is deferred, so it lands after the board is drawn,
 * but a second-long block right then is a stutter on the calmest mode in the
 * game. Ten holds the worst case where it cannot be felt.
 */
const GENTLE_CURVE: readonly CurveRow[] = [
  {
    maxLevel: 30,
    params: { colourCount: 3, capacity: 4, extraTubes: 3, scrambleSteps: 8 },
  },
  {
    maxLevel: 90,
    params: { colourCount: 4, capacity: 4, extraTubes: 3, scrambleSteps: 16 },
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
    maxLevel: 560,
    params: { colourCount: 9, capacity: 4, extraTubes: 2, scrambleSteps: 66 },
  },
  {
    maxLevel: Infinity,
    params: { colourCount: 10, capacity: 4, extraTubes: 2, scrambleSteps: 76 },
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
 * The typical minimum-pour count the scrambler produces for a shape.
 *
 * `moveLowerBound` is `runs - colours`, so a board whose colours are each
 * broken into `k` runs scores `colours * (k - 1)`. The least-clumping walk
 * lands on a strikingly consistent `k` — measured across every shape the
 * curves reach, 3.0 at capacity 4 and 3.2 at capacity 5, from four colours to
 * twelve. That regularity is what makes a difficulty floor expressible as a
 * formula rather than as a table of hand-picked numbers per band.
 *
 * Capacity 5 sits higher because five segments can hold more runs than four.
 */
function typicalBound(params: LevelParams): number {
  const splits = params.capacity >= 5 ? 3.2 : 3.0;
  return params.colourCount * (splits - 1);
}

/**
 * How hard the generator is told to look, by level and mode.
 *
 * **This is the growth dial, and it is selection pressure rather than a
 * threshold.** `generateLevel` keeps the hardest accepted board of the sample
 * — hardest by `moveLowerBound`, which never overestimates the true optimum
 * and, on the un-clumped boards the walk now produces, sits within a move of
 * it (measured gap 0 to 1, worst 2). So drawing more samples reaches further
 * into the hard tail of what the shape can produce, and nothing can ever be
 * unsatisfiable: there is no bar to fail, only a bigger pile to pick the best
 * from.
 *
 * That property is the whole reason this is a sample count and not a floor.
 * The first attempt at this dial *was* a floor, ramped above the median bound,
 * and it rejected 27 of 30 boards at classic 201 — capacity-4 boards land on
 * their median almost every time, so a bar one move above it is a bar almost
 * nothing clears. Every rejected board is wasted work and a level that falls
 * back to whatever the fallback ranking liked.
 *
 * Measured effect at the endgame, par of the chosen board against par of a
 * single unfiltered scramble: classic 26 → 28, fiendish 27 → 31. A few moves,
 * honestly earned. Every water sort has a ceiling set by its widest board;
 * this reaches that ceiling instead of shipping the same board with a
 * different seed.
 *
 * Ramped on a log of the level so the early game moves quickly and the late
 * game keeps inching, rather than stepping between bands and then stopping.
 * Capped where the cost stops being worth it — a scramble is about a
 * millisecond, and this runs on the level-load path.
 */
function samplesFor(level: number, difficulty: Difficulty): number {
  const { start, floor, ceiling } = {
    gentle: { start: 200, floor: 6, ceiling: 10 },
    classic: { start: 100, floor: 8, ceiling: 20 },
    fiendish: { start: 40, floor: 8, ceiling: 24 },
  }[difficulty];

  if (level <= start) return floor;
  // Doubling the level adds a fixed slice of the range; five doublings reach
  // the ceiling. Level 100 → 200 is worth as much as 800 → 1600.
  const doublings = Math.log2(level / start);
  return Math.round(Math.min(ceiling, floor + ((ceiling - floor) * doublings) / 5));
}

/**
 * How the acceptance gate tightens with level — the growth dial the shape
 * params cannot provide.
 *
 * Colours cap at 12, capacity at 5, spares floor at 1, and the scramble
 * saturates (130 steps and 300 steps produce identical statistics), so past
 * the top of a curve the *shape* cannot get harder. Two things still can:
 *
 * 1. **The par floor** — `minMoves`, above. The honest dial.
 * 2. **The look** — `maxLongRunMass`, how much of the board starts stacked in
 *    runs of three or more. `scramble` keeps this near zero by construction
 *    now, so the gate is a backstop rather than the mechanism; before it, the
 *    median endgame board had a third of its segments pre-stacked and eleven
 *    of thirteen tubes carrying a 3-run, which is what made every vial look
 *    the same.
 *
 * Breathers keep the untightened gate along with their easier row.
 *
 * `sampleSize` is the third dial and the quiet one: `generateLevel` keeps the
 * hardest accepted board of the sample, so drawing more samples reaches
 * further into the tail. Cheap — a scramble is about a millisecond.
 *
 * All of this is save format: it decides which attempt a level accepts, so
 * moving any of it repoints boards exactly like editing a curve does. Bump
 * `GENERATOR_VERSION` in the same commit.
 */
function gateForLevel(level: number, difficulty: Difficulty): GenerateOptions {
  const params = paramsForLevel(level, difficulty);

  /**
   * Capacity 4 can be held at zero stacked segments — the walk reaches it
   * every time. At capacity 5 one stubborn 3-run survives on most boards,
   * because five segments of a colour cannot always be split with only one
   * spare tube to work in, so the allowance is three: one run, not two.
   */
  const maxLongRunMass = params.capacity >= 5 ? 3 : 0;

  // A breather is a breather: an easier row, no selection pressure, and a
  // little slack on the look.
  if (isBreather(level)) {
    return { maxLongRunMass: maxLongRunMass + 3, sampleSize: 4, maxAttempts: 40 };
  }

  return {
    /**
     * A floor, not a target — deliberately under the median so it can always
     * be met. Its job is to throw out the bottom of the distribution, the
     * board that happens to fall together far too easily; reaching *up* is
     * `sampleSize`'s job, and the two were conflated in the version of this
     * that made classic 201 unsatisfiable.
     */
    minMoves: Math.floor(typicalBound(params) * 0.9),
    maxLongRunMass,
    // A pre-solved tube is free progress and reads as a mistake at any level.
    // Only the earliest boards, where it is an on-ramp, still allow one.
    maxSolvedTubes: level <= 20 && difficulty === 'gentle' ? 1 : 0,
    sampleSize: samplesFor(level, difficulty),
    maxAttempts: 60,
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
