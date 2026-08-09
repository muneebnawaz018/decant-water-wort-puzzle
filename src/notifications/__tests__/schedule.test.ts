import { remindersFor, type ReminderState } from '../schedule';

const HOURS = 60 * 60 * 1000;

/**
 * A local-time anchor. Built with the `Date` constructor rather than parsed
 * from a string, so the waking-hours logic is exercised against the machine's
 * own timezone instead of UTC — which is what it sees on a phone.
 */
const at = (hour: number, day = 1, minute = 0) =>
  new Date(2026, 2, day, hour, minute, 0, 0).getTime();

const hourOf = (ms: number) => new Date(ms).getHours();

const state = (over: Partial<ReminderState> = {}): ReminderState => ({
  lastVisitAt: null,
  streak: 0,
  lastPlayedAt: null,
  ...over,
});

const kinds = (over: Partial<ReminderState>, now: number) =>
  remindersFor(state(over), now).map((reminder) => reminder.kind);

describe('reward reminders', () => {
  it('schedules nothing before the first claim', () => {
    // The reward is already waiting, and announcing it is noise.
    expect(remindersFor(state(), at(12))).toEqual([]);
  });

  it('fires when the reward opens, not at a fixed hour', () => {
    const claim = at(14);
    const [ready] = remindersFor(state({ lastVisitAt: claim, streak: 1 }), claim);
    // A 2pm claim must not be answered at 8am with hours still on the clock.
    expect(ready!.at).toBe(claim + 24 * HOURS);
  });

  it('leaves a short streak alone', () => {
    // Two notifications for a one-day streak is nagging, and a player who has
    // claimed once has nothing invested to lose.
    expect(kinds({ lastVisitAt: at(12), streak: 1 }, at(12))).toEqual(['ready']);
    expect(kinds({ lastVisitAt: at(12), streak: 2 }, at(12))).toEqual(['ready']);
  });

  it('warns before a streak worth keeping lapses', () => {
    // 3pm claim, so +44h is 11am — a sociable hour, left where it is.
    const claim = at(15);
    const reminders = remindersFor(state({ lastVisitAt: claim, streak: 5 }), claim);
    const streak = reminders.find((r) => r.kind === 'streak')!;

    expect(streak.at).toBe(claim + 44 * HOURS);
    expect(streak.title).toContain('5-day streak');
  });

  it('drops the streak warning rather than send it too late', () => {
    // The waking-hours shift only moves a reminder forwards, so a warning due
    // late in the evening can be pushed past the deadline it is warning about.
    // Either it arrives while the streak is still alive, or not at all —
    // "about to end" delivered after it ended is worse than silence.
    const late = Array.from({ length: 24 }, (_, hour) => {
      const claim = at(hour);
      const streak = remindersFor(state({ lastVisitAt: claim, streak: 5 }), claim).find(
        (r) => r.kind === 'streak'
      );
      return streak !== undefined && streak.at >= claim + 48 * HOURS;
    });

    expect(late).not.toContain(true);
  });
});

describe('come-back nudges', () => {
  it('schedules two, a day and three days after the app was last open', () => {
    const played = at(12);
    const idle = remindersFor(state({ lastPlayedAt: played }), played);

    // Not twice a day: fourteen notifications a week gets the app muted, and a
    // muted app cannot be reminded back.
    expect(idle).toHaveLength(2);
    expect(idle[0]!.at).toBe(played + 24 * HOURS);
    expect(idle[1]!.at).toBe(played + 72 * HOURS);
  });

  it('schedules nothing for someone who has never opened the app', () => {
    expect(kinds({ lastPlayedAt: null }, at(12))).toEqual([]);
  });

  it('drops a nudge shifted too far past its own moment', () => {
    // Every nudge stays within half a day of when it was meant to land, or it
    // is not sent. "It has been a day" arriving most of a day late is a
    // different message, and it crowds the second nudge the spacing exists to
    // keep apart.
    for (let hour = 0; hour < 24; hour++) {
      const played = at(hour);
      for (const nudge of remindersFor(state({ lastPlayedAt: played }), played)) {
        expect(nudge.expiresAt).toBeDefined();
        expect(nudge.at).toBeLessThan(nudge.expiresAt!);
      }
    }
  });

  it('never displaces a streak warning it lands near', () => {
    // The nudge is two hours ahead of the warning, so resolving the clash by
    // whichever comes first would keep "no rush" and drop "your streak is
    // about to end". A missed nudge costs nothing; a missed warning costs the
    // thing the player has been building.
    const claim = at(16, 1);
    const reminders = remindersFor(
      state({ lastVisitAt: claim, streak: 7, lastPlayedAt: at(10, 2) }),
      claim
    );

    expect(reminders.map((r) => r.kind)).toContain('streak');
  });

  it('gives way to the reward reminder when they land together', () => {
    // Claimed and stopped playing within the same session, so both anchors are
    // 24 hours out. On a lock screen they say the same thing.
    const moment = at(12);
    const reminders = remindersFor(
      state({ lastVisitAt: moment, streak: 1, lastPlayedAt: moment }),
      moment
    );

    expect(reminders.filter((r) => r.at < moment + 48 * HOURS)).toHaveLength(1);
    expect(reminders[0]!.kind).toBe('ready');
  });
});

describe('waking hours', () => {
  it('never fires in the small hours', () => {
    // Claimed at 3am, so the reward opens at 3am. Waking someone at 3am to
    // say their vials are ready is how notifications get turned off forever.
    const claim = at(3);
    const [ready] = remindersFor(state({ lastVisitAt: claim, streak: 1 }), claim);

    expect(hourOf(ready!.at)).toBe(8);
    expect(ready!.at).toBeGreaterThan(claim);
  });

  it('rolls a late-evening reminder to the next morning', () => {
    const claim = at(23, 1);
    const [ready] = remindersFor(state({ lastVisitAt: claim, streak: 1 }), claim);

    expect(hourOf(ready!.at)).toBe(8);
    // Forward, never back: pulling it to the previous 11pm would announce the
    // reward before it opened.
    expect(ready!.at).toBeGreaterThan(claim + 24 * HOURS);
  });

  it('leaves a sociable time exactly where it is', () => {
    const claim = at(14, 1, 37);
    const [ready] = remindersFor(state({ lastVisitAt: claim, streak: 1 }), claim);
    expect(ready!.at).toBe(claim + 24 * HOURS);
  });

  it('keeps everything inside waking hours, whatever the anchor', () => {
    for (let hour = 0; hour < 24; hour++) {
      const anchor = at(hour);
      const reminders = remindersFor(
        state({ lastVisitAt: anchor, streak: 5, lastPlayedAt: anchor }),
        anchor
      );

      for (const reminder of reminders) {
        expect(hourOf(reminder.at)).toBeGreaterThanOrEqual(8);
        expect(hourOf(reminder.at)).toBeLessThan(23);
      }
    }
  });

  it('does not stack everything onto the same morning', () => {
    // Several anchors shifted into the same window would otherwise arrive as
    // a burst of notifications at once.
    const anchor = at(2);
    const reminders = remindersFor(
      state({ lastVisitAt: anchor, streak: 5, lastPlayedAt: anchor }),
      anchor
    );

    const times = reminders.map((r) => r.at);
    expect(new Set(times).size).toBe(times.length);
  });
});

describe('anything already due', () => {
  it('is dropped rather than fired late', () => {
    const claim = at(12, 1);
    // Two days later, never claimed. Both moments have been and gone, and the
    // reward is on the home screen where it can be seen.
    expect(kinds({ lastVisitAt: claim, streak: 5 }, at(12, 4))).toEqual([]);
  });

  it('never schedules anything in the past', () => {
    const anchor = at(12, 1);
    for (const hours of [0, 12, 24, 30, 44, 48, 96]) {
      const now = anchor + hours * HOURS;
      const reminders = remindersFor(
        state({ lastVisitAt: anchor, streak: 5, lastPlayedAt: anchor }),
        now
      );
      for (const reminder of reminders) expect(reminder.at).toBeGreaterThan(now);
    }
  });
});
