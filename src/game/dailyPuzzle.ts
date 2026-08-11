import type { LevelParams } from '@/core/types';
import { generateLevel, type GeneratedLevel } from './waterGenerator';

/**
 * The daily bonus puzzle — one board a day, harder than anything on the curve.
 *
 * It used to be the level you were already on. The Rewards row opened whatever
 * `gameStore` happened to be holding, so a player on stage 3 pressed "Today's
 * brew" and got stage 3: the same board, paying the same coins, twice. Nothing
 * about it was daily and nothing about it was a bonus.
 *
 * Three things make it its own thing:
 *
 * 1. **Its own shape.** Twelve colours and one spare tube — the hardest board
 *    this game can produce, which no mode reaches before level 501 and Easy
 *    never reaches at all.
 * 2. **Its own seed.** Keyed by the day, on a salt no mode uses, so it can
 *    never collide with a level a player has already solved.
 * 3. **Its own reward.** Paid by `bonusStore`, not by `progress` — it is not a
 *    level, so it unlocks nothing and appears in no star total.
 *
 * Pure and React-free, like the rest of `src/game`.
 */

/**
 * The bonus board's shape. Deliberately the ceiling.
 *
 * Twelve colours is every piece the palette has, and one spare tube is the
 * tightest a board is allowed to be — with none it is unplayable rather than
 * hard. `capacity: 5` follows the top of the curve, and the scramble is above
 * the curve's 110 because a harder board needs a longer scramble to be more
 * than a long board.
 *
 * Worth knowing what this costs the player: at twelve colours the palette
 * collapses for a deuteranope, which is why the colourblind glyphs exist and
 * why this is the board most likely to be played with them on.
 */
const BONUS_PARAMS: LevelParams = {
  colourCount: 12,
  capacity: 5,
  extraTubes: 1,
  scrambleSteps: 130,
};

/**
 * Salt for the bonus seed.
 *
 * A different constant from every entry in `DIFFICULTY_SALT`, so a day index
 * can never land on the same seed as a level number in some mode. Arbitrary,
 * and — like the mode salts — **part of the save format in practice**: change
 * it and every player's bonus board becomes a different puzzle. Only that, and
 * only for a day, which is why this one is far less load-bearing than the mode
 * salts are.
 */
const BONUS_SALT = 0x27d4eb2f;

/** Milliseconds in the cycle. The reward runs on the same rolling day. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which day a moment falls in, as a whole number of local days.
 *
 * **Local, not UTC.** `Date.now()` is an instant and has no timezone, so
 * dividing it by a day would roll the puzzle over at midnight UTC — the middle
 * of the afternoon in some places. Subtracting the offset first makes the
 * boundary local midnight, wherever the player is.
 *
 * Device time, per the same decision the daily reward already made: there is no
 * server to ask and the game is offline first. Winding the clock forward hands
 * out another puzzle, which is accepted rather than defended against.
 */
export function dayIndex(now: number): number {
  const offsetMs = new Date(now).getTimezoneOffset() * 60 * 1000;
  return Math.floor((now - offsetMs) / DAY_MS);
}

/**
 * The bonus board for a given day.
 *
 * Deterministic, like every board in this game: the same day gives the same
 * puzzle on every device, so two players can compare it. Nothing is stored —
 * the day index is enough to rebuild it.
 */
export function generateBonus(day: number): GeneratedLevel {
  return generateLevel(day, 'fiendish', {
    params: BONUS_PARAMS,
    /**
     * The strict gate. This board is the hardest thing the generator makes, so
     * it gets the tightest terms in the game.
     *
     * The first bonus boards shipped with five tubes already a single pour
     * from finished — the hardest shape in the game reading as half played
     * before it was touched. `maxLongRunMass` is now the check that catches
     * that, and it catches far more than `maxCappedTubes` ever could: the
     * capped check only sees a run of `capacity - 1`, while the mass counts
     * every segment sitting in a run of three or more. Both are kept, since a
     * near-finished tube is worth naming on its own.
     *
     * Three is one 3-run on the whole board — the floor the walk can actually
     * reach at capacity 5 with a single spare, where five segments of a colour
     * cannot always be prised apart. A gate the generator usually misses is
     * worse than a slightly looser one it always makes, because a missed gate
     * falls back to the best board seen.
     */
    maxLongRunMass: 3,
    maxCappedTubes: 1,
    maxSolvedTubes: 0,
    /**
     * A hard difficulty floor, which no level gets — levels use a floor under
     * their median so it always passes, and reach upward with `sampleSize`
     * instead. This board can afford a real bar: it is generated once a day on
     * a press, so it can burn attempts a level load cannot.
     */
    minMoves: 28,
    /**
     * Far above the level default, because the strict gate needs the attempts,
     * and a big sample because `generateLevel` keeps the hardest board it
     * accepts — the same selection pressure levels use, turned up as far as it
     * goes.
     *
     * Affordable because it runs once a day, on a press, rather than on every
     * level load. Hermes on a phone is several times slower than the machine
     * this was measured on, so budget tens of milliseconds — once, when the
     * player opens the puzzle.
     */
    maxAttempts: 400,
    sampleSize: 40,
    // Mixed rather than used raw: consecutive days would otherwise be
    // consecutive seeds, and `mulberry32` on adjacent seeds is well behaved but
    // there is no reason to lean on it.
    seed: (Math.imul(day + 1, 0x9e3779b1) ^ BONUS_SALT) >>> 0,
  });
}
