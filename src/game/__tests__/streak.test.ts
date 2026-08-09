import { EARNINGS } from '../economy';
import {
  standingFor,
  streakAfterVisit,
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
    // 9am one day and 8am two days later still counts: a strict interval breaks
    // the run on a technicality nobody would accept.
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
