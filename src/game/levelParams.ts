import type { LevelParams } from '@/core/types';
import { DEFAULT_DIFFICULTY, type Difficulty } from './difficulty';

/** Difficulty curve, doc §5. Rows are ordered easiest first. */
const CURVE: ReadonlyArray<{ maxLevel: number; params: LevelParams }> = [
  {
    maxLevel: 5,
    params: { colourCount: 3, capacity: 4, extraTubes: 2, scrambleSteps: 8 },
  },
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

/** Highest colour index the theme can render (doc §9 lists 12 pieces). */
export const MAX_COLOURS = 12;

function rowIndexForLevel(level: number): number {
  const index = CURVE.findIndex((row) => level <= row.maxLevel);
  return index === -1 ? CURVE.length - 1 : index;
}

/**
 * Params for a level. Every 10th level drops back one row as a breather
 * (doc §5), and the open-ended top row rotates 10 to 12 colours.
 *
 * Difficulty pulls the lever doc §5 says matters — spare tubes — rather than
 * colour count alone. A board always keeps at least one spare tube; with none
 * the puzzle is unplayable, not hard.
 */
export function paramsForLevel(
  level: number,
  difficulty: Difficulty = DEFAULT_DIFFICULTY
): LevelParams {
  const clamped = Math.max(1, Math.floor(level));
  let row = rowIndexForLevel(clamped);
  if (clamped % 10 === 0) row = Math.max(0, row - 1);

  const params = { ...CURVE[row]!.params };

  if (row === CURVE.length - 1) {
    params.colourCount = 10 + (clamped % 3);
  }

  if (difficulty === 'gentle') {
    params.extraTubes += 1;
    params.scrambleSteps = Math.round(params.scrambleSteps * 0.75);
  } else if (difficulty === 'fiendish') {
    params.colourCount += 1;
    params.extraTubes = Math.max(1, params.extraTubes - 1);
    params.scrambleSteps = Math.round(params.scrambleSteps * 1.25);
  }

  params.colourCount = Math.min(params.colourCount, MAX_COLOURS);
  return params;
}

export function tubeCount(params: LevelParams): number {
  return params.colourCount + params.extraTubes;
}
