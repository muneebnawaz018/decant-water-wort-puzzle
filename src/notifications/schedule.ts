/**
 * When the reminders should fire, given what the app knows.
 *
 * Pure and free of `expo-notifications`, for the same reason `src/core` is
 * free of React: the arithmetic here decides whether a player is nudged at the
 * right moment — or woken at three in the morning — and it should be testable
 * without a native module.
 */

const HOUR_MS = 60 * 60 * 1000;

/** The reward becomes claimable 24 hours after the last claim. */
const VISIT_INTERVAL_MS = 24 * HOUR_MS;

/** The streak lapses 48 hours after the last counted visit. */
const VISIT_WINDOW_MS = 48 * HOUR_MS;

/** How long before the streak lapses to warn about it. */
const STREAK_WARNING_LEAD_MS = 4 * HOUR_MS;

/**
 * Streak length worth defending with its own notification.
 *
 * Two notifications a day for a one-day streak is nagging, and a player who
 * has claimed once has nothing invested to lose. From three days there is
 * something worth protecting, and losing it silently is the kind of thing
 * people quit over.
 */
const STREAK_WORTH_WARNING = 3;

/**
 * Quiet away from the game before it says anything.
 *
 * A day, then three days. Not twice a day, which is what the phrase "daily
 * reminder" tempts you into: fourteen notifications a week from a puzzle game
 * gets the whole app muted, and a muted app cannot be reminded back. Two
 * nudges spaced apart is the most a game like this has earned.
 */
const IDLE_NUDGES_MS = [24 * HOUR_MS, 72 * HOUR_MS];

/**
 * How far past its moment a come-back nudge is still worth sending.
 *
 * The two nudges are spaced to feel like separate thoughts. A first one shoved
 * far enough forward by quiet hours stops reading as "it has been a day" and
 * starts crowding the second, which is the burst the spacing existed to avoid.
 * Half a day is the point where it is no longer the message that was written.
 */
const IDLE_STALE_MS = 12 * HOUR_MS;

/**
 * Waking hours, local time. Nothing fires outside them.
 *
 * The anchors here drift: the reward opens 24 hours after a claim and players
 * claim *after* it opens, never before, so each day's time slides later. Left
 * alone it wanders — and a puzzle game that wakes someone at 3am to say their
 * vials are ready gets its notifications turned off permanently, which is the
 * one failure this feature cannot recover from.
 *
 * Delaying a nudge costs nothing on its own. The reward is claimable the moment
 * the timer is up either way; only the announcement waits.
 *
 * But the delay is not free either, which is why the window is as wide as it
 * is rather than a polite 9-to-9. A shift eats into the streak window the
 * reminder is trying to protect: a claim at 23:00 has its reward announced 34
 * hours later against a 48-hour deadline. Every hour the window gives back is
 * an hour the player keeps. 8am to 11pm is the widest that is still defensible
 * as "awake", and it caps the worst shift at nine hours instead of eleven.
 *
 * The real backstop for that case is the streak warning, which is anchored 44
 * hours out and lands in the evening — comfortably inside waking hours for
 * exactly the late-night claims that push `ready` around.
 */
const WAKING_START_HOUR = 8;
const WAKING_END_HOUR = 23;

/**
 * Reminders landing closer together than this collapse to one.
 *
 * "Your reward is ready" and "your vials are waiting" say the same thing to
 * someone looking at a lock screen. After the waking-hours shift they can also
 * be pushed onto the same 9am, which would deliver both at once.
 */
const MERGE_WINDOW_MS = 3 * HOUR_MS;

type ReminderKind = 'ready' | 'streak' | 'idle';

/**
 * Which reminder wins when two land close enough to collapse.
 *
 * By consequence, not by time. The streak warning is the only one with a
 * deadline behind it — miss it and something the player built is gone, where
 * missing a nudge costs them nothing. Resolving a clash by whichever came
 * first is how "your 7-day streak is about to end" gets replaced by "no rush".
 */
const PRIORITY: Record<ReminderKind, number> = { streak: 0, ready: 1, idle: 2 };

export interface Reminder {
  kind: ReminderKind;
  /** When to fire, in ms since the epoch. */
  at: number;
  title: string;
  body: string;
  /**
   * A deadline the reminder is pointless past, if it has one.
   *
   * Two kinds have one, for the same underlying reason: the waking-hours shift
   * moves a reminder forwards, and far enough forward it is no longer the
   * message that was written. The streak warning can land after the streak it
   * warns about has lapsed — "about to end", to someone whose streak ended
   * overnight. A come-back nudge can drift until it crowds the next one.
   *
   * This is enforced when the schedule is built, so it covers the shift and
   * nothing else. Android may still deliver late from a standby bucket or an
   * OEM battery manager, and a local notification has no TTL to express that
   * with — the OS delivers when it decides to.
   */
  expiresAt?: number;
}

export interface ReminderState {
  /**
   * When the app was last opened on a *new day* — the visit that counted.
   *
   * Both reminders hang off this rather than off the last claim, because the
   * streak is made of visits now: it lapses 48 hours after the last one, and
   * the next day's reward unlocks 24 hours after it. Anchoring to the claim
   * would warn a player who has kept their run going but skipped a reward, and
   * stay silent for one who claimed and then vanished.
   */
  lastVisitAt: number | null;
  streak: number;
  /** When the app was last open. */
  lastPlayedAt: number | null;
}

/**
 * Moves a time into waking hours, always forwards.
 *
 * Forwards only, deliberately. Pulling a 3am reminder back to the previous
 * 9pm would fire it before the thing it announces has happened.
 */
function intoWakingHours(at: number): number {
  const date = new Date(at);
  const hour = date.getHours();

  if (hour >= WAKING_START_HOUR && hour < WAKING_END_HOUR) return at;

  // Late evening rolls to the following morning; small hours to this one.
  if (hour >= WAKING_END_HOUR) date.setDate(date.getDate() + 1);
  date.setHours(WAKING_START_HOUR, 0, 0, 0);
  return date.getTime();
}

/**
 * Drops any reminder landing on top of one that matters more.
 *
 * Walked in priority order rather than in time order, so the survivor of a
 * clash is the one with the most behind it. Time only breaks ties within a
 * kind. The result is sorted back into firing order.
 */
function merge(reminders: Reminder[]): Reminder[] {
  const byImportance = [...reminders].sort(
    (a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.at - b.at
  );

  const kept: Reminder[] = [];
  for (const reminder of byImportance) {
    const clash = kept.some(
      (existing) => Math.abs(existing.at - reminder.at) < MERGE_WINDOW_MS
    );
    if (!clash) kept.push(reminder);
  }

  return kept.sort((a, b) => a.at - b.at);
}

/** The reward and streak reminders, anchored to the last counted visit. */
function rewardReminders(state: ReminderState): Reminder[] {
  // Never opened, so there is no run to keep and nothing to announce.
  if (state.lastVisitAt === null) return [];

  const reminders: Reminder[] = [
    {
      kind: 'ready',
      at: state.lastVisitAt + VISIT_INTERVAL_MS,
      title: 'Your daily reward is ready',
      body: 'The vials are waiting. Claim it before the day is out.',
    },
  ];

  if (state.streak >= STREAK_WORTH_WARNING) {
    reminders.push({
      kind: 'streak',
      at: state.lastVisitAt + VISIT_WINDOW_MS - STREAK_WARNING_LEAD_MS,
      expiresAt: state.lastVisitAt + VISIT_WINDOW_MS,
      title: `Your ${state.streak}-day streak is about to end`,
      body: 'Open the game in the next few hours to keep it going.',
    });
  }

  return reminders;
}

/** The come-back nudges, anchored to the last time the app was open. */
function idleReminders(state: ReminderState): Reminder[] {
  if (state.lastPlayedAt === null) return [];

  const copy = [
    {
      title: 'The vials are settling',
      body: 'A quiet puzzle is waiting whenever you are.',
    },
    { title: 'Still sorting?', body: 'Your shelf is where you left it. No rush.' },
  ];

  const played = state.lastPlayedAt;

  return IDLE_NUDGES_MS.map((after, index) => ({
    kind: 'idle' as const,
    at: played + after,
    expiresAt: played + after + IDLE_STALE_MS,
    title: copy[index]!.title,
    body: copy[index]!.body,
  }));
}

/**
 * Everything that should be pending, soonest first.
 *
 * Absolute times, not "every day at nine". The reward runs on a rolling
 * twenty-four hours from the moment of the claim, so a fixed hour would fire
 * with hours still on the clock — and an instant has no opinion about
 * timezones or daylight saving, which a recurring hour/minute trigger does.
 * The waking-hours shift is applied after the fact, for the same reason.
 *
 * Anything already due is dropped rather than fired late. The reward is on the
 * home screen where it can be seen, and a notification about something that
 * happened yesterday is noise.
 */
export function remindersFor(state: ReminderState, now: number): Reminder[] {
  const all = [...rewardReminders(state), ...idleReminders(state)].map((reminder) => ({
    ...reminder,
    at: intoWakingHours(reminder.at),
  }));

  const live = all.filter(
    (reminder) => reminder.expiresAt === undefined || reminder.at < reminder.expiresAt
  );

  // Merged after the shift, not before: two reminders hours apart at night can
  // both be pushed onto the same 9am.
  return merge(live).filter((reminder) => reminder.at > now);
}
