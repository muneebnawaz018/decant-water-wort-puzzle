import type { LevelParams } from '@/core/types';
import { BREW_LEAD } from './economy';
import { paramsForLevel } from './levelParams';
import { generateLevel, type GeneratedLevel } from './waterGenerator';

/**
 * The daily bonus puzzle — one board a day, ahead of wherever the player is.
 *
 * It used to be the level you were already on. The Rewards row opened whatever
 * `gameStore` happened to be holding, so a player on stage 3 pressed "Today's
 * brew" and got stage 3: the same board, paying the same coins, twice. Nothing
 * about it was daily and nothing about it was a bonus.
 *
 * Three things make it its own thing:
 *
 * 1. **Its own shape**, on the Hard curve and `BREW_LEAD` levels beyond the
 *    furthest the player has reached in any mode — see `brewParamsFor`.
 * 2. **Its own seed.** Keyed by the day, on a salt no mode uses, so it can
 *    never collide with a level a player has already solved.
 * 3. **Its own reward.** Paid by `bonusStore`, not by `progress` — it is not a
 *    level, so it unlocks nothing and appears in no star total.
 *
 * Pure and React-free, like the rest of `src/game`.
 */

/**
 * The bonus board's shape: the Hard curve, `BREW_LEAD` levels past the player.
 *
 * **It used to be a constant at the ceiling** — twelve colors, one spare — and
 * that shape was right for the player it was written for and wrong for
 * everyone else. Nothing gates the Rewards row on progress, so somebody who
 * installed the game an hour ago could open the hardest board it can produce,
 * holding zero coins, one free hint, and a board that is not saved if they
 * leave. Two positions in five reached by casual play at that shape have no
 * winning line at all. As a first taste of a feature whose whole job is a
 * daily habit, it teaches the player the brew is not for them.
 *
 * Scaling fixes that without a lock. The brew is always harder than anything
 * on the player's own ladder, at every stage of the game, and it converges on
 * the old fixed shape once they pass roughly level 400 — so for the player the
 * constant was written for, nothing changes.
 *
 * `furthest` is the highest level reached across **all three modes**, so a
 * player who has pushed Hard cannot get an easy brew by opening it from Easy.
 *
 * **The breather is skipped on purpose.** `paramsForLevel` drops a difficulty
 * band on every tenth level, so a player whose furthest happens to end in a
 * zero would get a quietly easier brew that day, for a reason nobody could
 * work out from the screen. `+ 1` steps off that without disturbing the curve.
 *
 * The scramble is lifted above the curve's own figure for the same reason the
 * fixed shape used to be: a harder board needs a longer walk to be more than a
 * long board.
 *
 * Worth knowing what the top of this costs the player: at twelve colors the
 * palette collapses for a deuteranope, which is why the colorblind glyphs
 * exist and why this is the board most likely to be played with them on.
 */
export function brewParamsFor(furthest: number): LevelParams {
  const target = Math.max(1, Math.floor(furthest)) + BREW_LEAD;
  const level = target % 10 === 0 ? target + 1 : target;
  const params = paramsForLevel(level, 'fiendish');

  return { ...params, scrambleSteps: Math.round(params.scrambleSteps * 1.15) };
}

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
 * The bonus board for a given day, at the shape that day's player has earned.
 *
 * Deterministic in the way that matters: the seed is the day and nothing else,
 * so the board is stable for a given player all day and rebuilds identically
 * after a reinstall. Nothing is stored.
 *
 * **Two players on the same day no longer get the same board**, and that is the
 * price of scaling — the shape follows `furthest`, so a beginner and a veteran
 * get different puzzles. Nothing in the app reads the old property: there is no
 * leaderboard, no sharing and no compare, so it was a future option rather than
 * a present feature, and day-one playability is worth more than keeping it.
 *
 * `furthest` is read live rather than pinned for the day. Open the brew, leave
 * it unsolved, clear a level, come back, and the shape moves up with you. That
 * needs no defending: the brew is not saved either way, so returning always
 * meant a board from move zero, and pinning it would cost a stored field and a
 * migration to make a board slightly *less* current.
 */
export function generateBonus(day: number, furthest: number): GeneratedLevel {
  return generateLevel(day, 'fiendish', {
    params: brewParamsFor(furthest),
    /**
     * The strict gate. Whatever shape this board takes, it is the one board a
     * day, so it gets the tightest look terms in the game.
     *
     * The first bonus boards shipped with five tubes already a single pour
     * from finished — reading as half played before they were touched.
     * `maxLongRunMass` is now the check that catches that, and it catches far
     * more than `maxCappedTubes` ever could: the capped check only sees a run
     * of `capacity - 1`, while the mass counts every segment sitting in a run
     * of three or more. Both are kept, since a near-finished tube is worth
     * naming on its own.
     *
     * Three is one 3-run on the whole board — the floor the walk can actually
     * reach at capacity 5 with a single spare, where five segments of a color
     * cannot always be prised apart. Capacity-4 shapes reach zero, so this is
     * slack they never need. A gate the generator usually misses is worse than
     * a slightly looser one it always makes, because a missed gate falls back
     * to the best board seen.
     */
    maxLongRunMass: 3,
    maxCappedTubes: 1,
    maxSolvedTubes: 0,
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
