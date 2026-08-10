import { EARNINGS } from './economy';

/**
 * Two separate runs, and keeping them separate is the point of this file.
 *
 * - **The streak** counts days the app was *opened*. It is the headline number
 *   on the card and the thing the tier ladder measures. Nothing about
 *   collecting a reward touches it.
 * - **The reward day** is where the player sits on the seven-day payout track.
 *   It advances when a reward is *collected*, and it restarts at day one if the
 *   window closes without one being taken.
 *
 * They were briefly one number and it was wrong in both directions: a player
 * who opened the app daily but forgot to collect lost a streak they had earned,
 * and one who collected late kept a "daily" streak they had not. Turning up and
 * collecting are different acts, so they get different counters.
 *
 * Pure and free of the store, the same rule `src/core` and `undoCost` follow —
 * this decides what a player has achieved, and it should be provable without a
 * balance, a clock or a screen.
 */

/* ------------------------------------------------------------------ streak */

/** Days between visits that still count as consecutive. */
export const VISIT_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a streak survives without the app being opened.
 *
 * Twice the interval. Open the app at 9am one day and 8am two days later and a
 * strict twenty-four hours has already broken the run on a technicality nobody
 * would accept.
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
 * The streak after the app is opened at `now`, given the last counted visit.
 *
 * Three outcomes, and the middle one is the common case:
 *
 * - **Never visited** — the run starts at one.
 * - **Inside the interval** — already counted today, so nothing moves. This is
 *   what stops a player who opens the app six times before lunch from having a
 *   six-day streak.
 * - **Past the window** — the run lapsed and restarts at one.
 *
 * A rolling window rather than calendar days. A calendar boundary would let a
 * visit at 11:59pm and another at 12:01am count as two days, which is a
 * two-minute streak.
 */
export function streakAfterVisit(
  streak: number,
  lastVisitAt: number | null,
  now: number
): { streak: number; counted: boolean } {
  if (lastVisitAt === null) return { streak: 1, counted: true };

  // Floored at zero: a clock wound backwards should pause the run, never
  // rewind it into a lapse. As likely to be a timezone change as an exploit.
  const elapsed = Math.max(0, now - lastVisitAt);

  if (elapsed < VISIT_INTERVAL_MS) return { streak, counted: false };
  if (elapsed <= VISIT_WINDOW_MS) return { streak: streak + 1, counted: true };
  return { streak: 1, counted: true };
}

/* -------------------------------------------------------------- reward day */

/** How long after a claim before the next reward unlocks. */
export const CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How long an unlocked reward stays available. Not grace, not extra — this IS
 * the reward's lifetime.
 *
 * One day: **the reward lives exactly until the next one would overtake it.**
 * Collect at 3pm, tomorrow's coins appear at 3pm, and they are available until
 * the day after's would have arrived at 3pm. Miss that day and the track
 * restarts at one — the schedule never stacks two uncollected rewards.
 *
 * **Missing it costs the reward day, never the streak.** A missed collection
 * says nothing about whether the player turned up.
 */
export const REWARD_AVAILABLE_MS = 24 * 60 * 60 * 1000;

/**
 * From a claim to the track restarting: 24h locked, then 24h available.
 *
 * Both segments hang off the one timestamp the store keeps — the moment of the
 * claim — which is why deadlines here read as +48h. Seen from the reward's own
 * appearance it is exactly its 24-hour lifetime; same instants, two viewpoints.
 */
export const CLAIM_WINDOW_MS = CLAIM_INTERVAL_MS + REWARD_AVAILABLE_MS;

/** Where the daily reward stands right now. */
export type ClaimPhase =
  /** Counting down. The reward is not available yet. */
  | 'waiting'
  /** Collectable, and the track continues if it is taken. */
  | 'ready'
  /** Collectable, but the window passed: taking it restarts at day one. */
  | 'lapsed';

/**
 * Which phase the reward is in, given when it was last collected.
 *
 * A lapsed reward is still collectable, deliberately. Refusing to pay someone
 * who came back two days later punishes the return itself — they have already
 * dropped to day one, which pays least, and locking it as well would make
 * coming back worth nothing.
 */
export function claimPhase(lastClaimAt: number | null, now: number): ClaimPhase {
  if (lastClaimAt === null) return 'ready';

  const elapsed = Math.max(0, now - lastClaimAt);

  if (elapsed < CLAIM_INTERVAL_MS) return 'waiting';
  if (elapsed <= CLAIM_WINDOW_MS) return 'ready';
  return 'lapsed';
}

/**
 * The reward day a claim at `now` would land on, 1-based.
 *
 * One step per collection inside the window; back to day one outside it. There
 * is no partial credit — the track is a chain, and a missing link is a new one.
 */
export function rewardDayAfterClaim(
  rewardDay: number,
  lastClaimAt: number | null,
  now: number
): number {
  if (claimPhase(lastClaimAt, now) !== 'ready' || lastClaimAt === null) return 1;
  return rewardDay + 1;
}

/**
 * Milliseconds until the reward unlocks. Zero once it is collectable.
 *
 * Only meaningful in the `waiting` phase; the other two return zero because
 * there is nothing left to count down to.
 */
export function timeUntilUnlock(lastClaimAt: number | null, now: number): number {
  if (lastClaimAt === null) return 0;
  const elapsed = Math.max(0, now - lastClaimAt);
  return Math.max(0, CLAIM_INTERVAL_MS - elapsed);
}

/**
 * Milliseconds left to collect before the track restarts. Zero once it has.
 *
 * This is the number the card shows while a reward is waiting — the deadline is
 * invisible otherwise, and a track reset by a rule nobody could see reads as the
 * game losing your progress.
 */
export function timeUntilLapse(lastClaimAt: number | null, now: number): number {
  if (lastClaimAt === null) return 0;
  const elapsed = Math.max(0, now - lastClaimAt);
  return Math.max(0, CLAIM_WINDOW_MS - elapsed);
}
