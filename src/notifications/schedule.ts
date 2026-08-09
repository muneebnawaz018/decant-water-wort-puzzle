/**
 * When the reminders should fire, given what the app knows.
 *
 * Pure and free of `expo-notifications`, for the same reason `src/core` is
 * free of React: the arithmetic here decides whether a player is nudged at the
 * right moment — or woken at three in the morning — and it should be testable
 * without a native module.
 */

import { VISIT_INTERVAL_MS, VISIT_WINDOW_MS } from '@/game/streak';

const HOUR_MS = 60 * 60 * 1000;

/**
 * The streak warnings, as **time left before the run lapses**.
 *
 * Counted back from the deadline, not forward from the last visit. Those are
 * the same instant today, and writing it this way is what keeps them the same
 * instant tomorrow: the deadline is `VISIT_WINDOW_MS` and it now comes from
 * `game/streak`, so moving the window moves both warnings with it and the copy
 * stays true. Written as "+18h after the visit", a window change silently turns
 * "six hours left" into a lie.
 *
 * Two of them because they do different jobs. Eighteen hours out is a heads-up
 * someone can plan around; six is a last call. A single warning has to be one
 * or the other and is wrong for half the cases.
 */
const STREAK_WARNINGS = [
  {
    leftBefore: 18 * HOUR_MS,
    title: (days: number) => `Your ${days}-day streak is running out`,
    body: 'Open the game today to keep it going.',
  },
  {
    leftBefore: 6 * HOUR_MS,
    title: (days: number) => `Last call for your ${days}-day streak`,
    body: 'Around six hours left. Open the game and it carries on.',
  },
] as const;

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
 * How long away from the game before it says anything, and how often after.
 *
 * Every twelve hours from the moment the app was last closed, and that is the
 * only thing this reminder knows about. It does not look at the streak, the
 * reward or the last visit — someone who opens the app daily and never plays a
 * level is still away from the game, and someone mid-streak who has not played
 * in a day should hear the same thing as anyone else.
 */
const IDLE_EVERY_MS = 12 * HOUR_MS;

/**
 * How many come-back nudges to queue at once.
 *
 * Four, so two days are covered from a single scheduling pass. They are rebuilt
 * on every background, so in practice only the first one or two ever fire — the
 * rest exist for the player who does not come back, which is exactly who this
 * reminder is for and the only case where nothing re-schedules them.
 *
 * Not unlimited. iOS caps pending notifications at 64, and a queue stretching a
 * week out is a week of "still sorting?" for someone who has quietly moved on.
 */
const IDLE_NUDGE_COUNT = 4;

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
    // The one moment that matters: when the run dies if nothing is done.
    const lapsesAt = state.lastVisitAt + VISIT_WINDOW_MS;

    for (const warning of STREAK_WARNINGS) {
      reminders.push({
        kind: 'streak',
        at: lapsesAt - warning.leftBefore,
        // Both expire at the lapse. "About to end" delivered after it ended is
        // worse than silence, and the waking-hours shift moves times forwards.
        expiresAt: lapsesAt,
        title: warning.title(state.streak),
        body: warning.body,
      });
    }
  }

  return reminders;
}

/**
 * The come-back nudges: every twelve hours away from the game.
 *
 * Anchored to `lastPlayedAt` and nothing else. This is the reminder that has no
 * opinion about the streak or the reward — it fires because the app has not
 * been opened, which is true whatever the rest of the economy is doing.
 *
 * Alternating copy, so the second one is not the first one again. Two lines
 * cycled is not variety, but a nudge that arrives word for word twice in a day
 * reads as a stuck app rather than a reminder.
 */
const IDLE_COPY = [
  { title: 'The vials are settling', body: 'A quiet puzzle is waiting whenever you are.' },
  { title: 'Still sorting?', body: 'Your shelf is where you left it. No rush.' },
] as const;

function idleReminders(state: ReminderState): Reminder[] {
  const played = state.lastPlayedAt;
  if (played === null) return [];

  return Array.from({ length: IDLE_NUDGE_COUNT }, (_, index) => {
    const at = played + IDLE_EVERY_MS * (index + 1);
    return {
      kind: 'idle' as const,
      at,
      expiresAt: at + IDLE_STALE_MS,
      ...IDLE_COPY[index % IDLE_COPY.length]!,
    };
  });
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
