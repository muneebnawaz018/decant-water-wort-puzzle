import { EARNINGS } from '../economy';
import {
  claimPhase,
  REWARD_AVAILABLE_MS,
  CLAIM_INTERVAL_MS,
  CLAIM_WINDOW_MS,
  rewardDayAfterClaim,
  standingFor,
  streakAfterVisit,
  timeUntilLapse,
  timeUntilUnlock,
  VISIT_INTERVAL_MS,
  VISIT_WINDOW_MS,
} from '../streak';

const [FIRST, SECOND, THIRD] = EARNINGS.streakTiers;

describe('where a run stands on the ladder', () => {
  it('starts below the first milestone before anything is done', () => {
    expect(standingFor(0)).toEqual({ tier: 1, days: 0, target: FIRST });
  });

  it('counts the whole run, not a position inside a rung', () => {
    expect(standingFor(1)).toEqual({ tier: 1, days: 1, target: FIRST });
    expect(standingFor(3)).toEqual({ tier: 1, days: 3, target: FIRST });
  });

  it('moves the marker on the day a milestone is reached', () => {
    // Day seven shows "7 of 14", not "7 of 7". A streak is kept, not finished,
    // and a full bar on the best day of the week invites a player to stop.
    expect(standingFor(FIRST!)).toEqual({ tier: 2, days: FIRST, target: SECOND });
    expect(standingFor(FIRST! - 1).target).toBe(FIRST);
  });

  it('climbs to the month once the fortnight is passed', () => {
    expect(standingFor(SECOND!)).toEqual({ tier: 3, days: SECOND, target: THIRD });
    expect(standingFor(SECOND! + 1).target).toBe(THIRD);
  });

  it('keeps stepping by the last gap once the named list runs out', () => {
    const step = THIRD! - SECOND!;
    expect(standingFor(THIRD!).target).toBe(THIRD! + step);
    expect(standingFor(THIRD! + step - 1).target).toBe(THIRD! + step);
    expect(standingFor(THIRD! + step).target).toBe(THIRD! + step * 2);
  });

  it('never fills the bar, at any length of run', () => {
    for (let days = 0; days < 400; days++) {
      const standing = standingFor(days);
      expect(standing.target).toBeGreaterThan(standing.days);
    }
  });

  it('never moves the marker backwards', () => {
    let previous = 0;
    for (let days = 0; days < 400; days++) {
      const { target } = standingFor(days);
      expect(target).toBeGreaterThanOrEqual(previous);
      previous = target;
    }
  });
});

describe('counting a visit', () => {
  const T0 = Date.parse('2026-03-01T09:00:00Z');

  it('starts the run on the first visit', () => {
    expect(streakAfterVisit(0, null, T0)).toEqual({ streak: 1, counted: true });
  });

  it('ignores a second visit the same day', () => {
    // Opening the app six times before lunch is one day, not six.
    expect(streakAfterVisit(3, T0, T0 + 60_000)).toEqual({ streak: 3, counted: false });
    expect(streakAfterVisit(3, T0, T0 + VISIT_INTERVAL_MS - 1)).toEqual({
      streak: 3,
      counted: false,
    });
  });

  it('advances once the day has turned', () => {
    expect(streakAfterVisit(3, T0, T0 + VISIT_INTERVAL_MS)).toEqual({
      streak: 4,
      counted: true,
    });
  });

  it('forgives a late visit inside the window', () => {
    expect(streakAfterVisit(5, T0, T0 + VISIT_WINDOW_MS - 1).streak).toBe(6);
  });

  it('restarts once the window has passed', () => {
    expect(streakAfterVisit(20, T0, T0 + VISIT_WINDOW_MS + 1)).toEqual({
      streak: 1,
      counted: true,
    });
  });

  it('pauses rather than lapses when the clock is wound back', () => {
    // Negative elapsed time would otherwise read as a very old visit and wipe
    // the run — a timezone change should not cost a streak.
    expect(streakAfterVisit(9, T0, T0 - VISIT_WINDOW_MS)).toEqual({
      streak: 9,
      counted: false,
    });
  });
});

describe('the reward track', () => {
  const T0 = Date.parse('2026-03-01T09:00:00Z');
  const H = 60 * 60 * 1000;

  it('offers the first reward with nothing to wait for', () => {
    expect(claimPhase(null, T0)).toBe('ready');
    expect(rewardDayAfterClaim(0, null, T0)).toBe(1);
  });

  it('locks the reward for a day after a claim', () => {
    expect(claimPhase(T0, T0)).toBe('waiting');
    expect(claimPhase(T0, T0 + CLAIM_INTERVAL_MS - 1)).toBe('waiting');
    expect(timeUntilUnlock(T0, T0 + 6 * H)).toBe(18 * H);
  });

  it('opens the reward on the day, and leaves the grace to collect it', () => {
    expect(claimPhase(T0, T0 + CLAIM_INTERVAL_MS)).toBe('ready');
    expect(claimPhase(T0, T0 + CLAIM_WINDOW_MS)).toBe('ready');
    expect(rewardDayAfterClaim(4, T0, T0 + 30 * H)).toBe(5);
  });

  it('lapses one millisecond past the window', () => {
    expect(claimPhase(T0, T0 + CLAIM_WINDOW_MS + 1)).toBe('lapsed');
    // Still collectable — it pays day one and the track starts again.
    expect(rewardDayAfterClaim(6, T0, T0 + CLAIM_WINDOW_MS + 1)).toBe(1);
  });

  it('counts the deadline down through the grace only', () => {
    // Nothing at risk while it is locked: the number is for the card, and the
    // card only warns when the track can actually be lost.
    expect(timeUntilLapse(T0, T0 + CLAIM_INTERVAL_MS)).toBe(REWARD_AVAILABLE_MS);
    expect(timeUntilLapse(T0, T0 + 30 * H)).toBe(18 * H);
    expect(timeUntilLapse(T0, T0 + CLAIM_WINDOW_MS + H)).toBe(0);
  });

  it('pauses rather than lapses when the clock is wound back', () => {
    // Negative elapsed time would otherwise read as a very old claim and reset
    // the track — a timezone change should not cost a week's progress.
    expect(claimPhase(T0, T0 - CLAIM_WINDOW_MS)).toBe('waiting');
  });
});
