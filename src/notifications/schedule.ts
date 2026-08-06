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
const CLAIM_INTERVAL_MS = 24 * HOUR_MS;

/** The streak lapses 48 hours after the last claim. */
const STREAK_WINDOW_MS = 48 * HOUR_MS;

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
 * Waking hours, local time. Nothing fires outside them.
 *
 * The anchors here drift: the reward opens 24 hours after a claim and players
 * claim *after* it opens, never before, so each day's time slides later. Left
 * alone it wanders — and a puzzle game that wakes someone at 3am to say their
 * vials are ready gets its notifications turned off permanently, which is the
 * one failure this feature cannot recover from.
 *
 * Delaying a nudge costs nothing. The reward is claimable the moment the timer
 * is up either way; only the announcement waits.
 */
const WAKING_START_HOUR = 9;
const WAKING_END_HOUR = 22;

/**
 * Reminders landing closer together than this collapse to one.
 *
 * "Your reward is ready" and "your vials are waiting" say the same thing to
 * someone looking at a lock screen. After the waking-hours shift they can also
 * be pushed onto the same 9am, which would deliver both at once.
 */
const MERGE_WINDOW_MS = 3 * HOUR_MS;

type ReminderKind = 'ready' | 'streak' | 'idle';

export interface Reminder {
  kind: ReminderKind;
  /** When to fire, in ms since the epoch. */
  at: number;
  title: string;
  body: string;
  /**
   * A deadline the reminder is pointless past, if it has one.
   *
   * The streak warning does: shifted out of the small hours it can land after
   * the streak it is warning about has already lapsed, and "your streak is
   * about to end" delivered to someone whose streak ended overnight is worse
   * than silence.
   */
  expiresAt?: number;
}

export interface ReminderState {
  /** When the daily reward was last taken. */
  lastClaimAt: number | null;
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

/** Drops any reminder landing on top of an earlier, more specific one. */
function merge(reminders: Reminder[]): Reminder[] {
  const kept: Reminder[] = [];

  for (const reminder of [...reminders].sort((a, b) => a.at - b.at)) {
    const clash = kept.some(
      (existing) => Math.abs(existing.at - reminder.at) < MERGE_WINDOW_MS
    );
    if (!clash) kept.push(reminder);
  }

  return kept;
}

/** The reward and streak reminders, anchored to the last claim. */
function rewardReminders(state: ReminderState): Reminder[] {
  // Never claimed, so the reward is waiting right now. Nothing to announce.
  if (state.lastClaimAt === null) return [];

  const reminders: Reminder[] = [
    {
      kind: 'ready',
      at: state.lastClaimAt + CLAIM_INTERVAL_MS,
      title: 'Your daily reward is ready',
      body: 'The vials are waiting. Claim it before the day is out.',
    },
  ];

  if (state.streak >= STREAK_WORTH_WARNING) {
    reminders.push({
      kind: 'streak',
      at: state.lastClaimAt + STREAK_WINDOW_MS - STREAK_WARNING_LEAD_MS,
      expiresAt: state.lastClaimAt + STREAK_WINDOW_MS,
      title: `Your ${state.streak}-day streak is about to end`,
      body: 'Claim in the next few hours to keep it going.',
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

  return IDLE_NUDGES_MS.map((after, index) => ({
    kind: 'idle' as const,
    at: state.lastPlayedAt! + after,
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
