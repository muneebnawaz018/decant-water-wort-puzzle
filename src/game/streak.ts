import { EARNINGS } from './economy';

/**
 * The streak's arithmetic: what a run of days is worth and where it sits.
 *
 * Pure and free of the store, the same rule `src/core` and `undoCost` follow —
 * this decides what a player has achieved, and it should be provable without a
 * balance, a clock or a screen.
 *
 * **The streak counts days the app was opened, not days a reward was claimed.**
 * That is the whole difference from the version this replaced. A player who
 * opens the game every morning has a streak whether or not they remember to tap
 * Collect; the tap is what pays them, and missing it costs that day's coins
 * rather than the run. "Streak" everywhere else in games means "days you turned
 * up", and a counter that quietly meant something else was the confusion worth
 * fixing.
 */

/** Days between visits that still count as consecutive. */
export const VISIT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a run survives without a visit.
 *
 * Twice the interval, matching the reward timer's own grace and for the same
 * reason: open the app at 9am one day and 8am the next and a strict
 * twenty-four hours has already broken the run on a technicality.
 */
export const VISIT_WINDOW_MS = VISIT_INTERVAL_MS * 2;

/** Where a streak stands: which rung it is climbing and how far up it is. */
export interface StreakStanding {
  /** 1-based rung of the ladder currently being climbed. */
  tier: number;
  /** Days on the run. The same total the card's headline shows. */
  days: number;
  /**
   * The milestone being climbed towards, as a **total** number of days.
   *
   * Always strictly greater than `days`, which is the point: a streak is a
   * thing you keep, not a thing you finish. Reaching seven does not fill the
   * bar, it moves the marker to fourteen — otherwise the card spends the day it
   * should feel best saying "done", which is an invitation to stop.
   */
  target: number;
}

/**
 * What a run of `days` amounts to on the ladder.
 *
 * The milestones are **absolute totals**, not rung lengths: 7 days, then 14,
 * then 30. Past the last named one the spacing of the last gap repeats, so the
 * ladder never runs out of rungs and the ask keeps growing at a steady pace
 * rather than doubling into numbers nobody will reach.
 */
export function standingFor(days: number): StreakStanding {
  const milestones = EARNINGS.streakTiers;
  const run = Math.max(0, days);

  const index = milestones.findIndex((milestone) => milestone > run);
  if (index !== -1) return { tier: index + 1, days: run, target: milestones[index]! };

  // Off the end of the named list. Keep stepping by the last gap until the
  // marker is ahead of the run again.
  const last = milestones[milestones.length - 1]!;
  const previous = milestones[milestones.length - 2] ?? 0;
  const step = Math.max(1, last - previous);

  const stepsPast = Math.floor((run - last) / step) + 1;
  return {
    tier: milestones.length + stepsPast,
    days: run,
    target: last + stepsPast * step,
  };
}

/**
 * The streak after a visit at `now`, given when the last counted visit was.
 *
 * Three outcomes, and the middle one is the common case:
 *
 * - **Never visited** — the run starts at one.
 * - **Inside the interval** — already counted today, so nothing moves. This is
 *   what stops a player who opens the app six times before lunch from having a
 *   six-day streak.
 * - **Past the window** — the run lapsed and restarts at one.
 *
 * A rolling window rather than calendar days, matching the reward timer. A
 * calendar boundary would let a visit at 11:59pm and another at 12:01am count
 * as two days, which is a two-minute streak.
 */
export function streakAfterVisit(
  streak: number,
  lastVisitAt: number | null,
  now: number
): { streak: number; counted: boolean } {
  if (lastVisitAt === null) return { streak: 1, counted: true };

  // Floored at zero: a clock wound backwards should pause the run, never
  // rewind it into a lapse. Same treatment the claim timer gives elapsed time.
  const elapsed = Math.max(0, now - lastVisitAt);

  if (elapsed < VISIT_INTERVAL_MS) return { streak, counted: false };
  if (elapsed <= VISIT_WINDOW_MS) return { streak: streak + 1, counted: true };
  return { streak: 1, counted: true };
}
