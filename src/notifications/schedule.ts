/**
 * When the reminders should fire, given what the app knows.
 *
 * Pure and free of `expo-notifications`, for the same reason `src/core` is
 * free of React: the arithmetic here decides whether a player is nudged at the
 * right moment — or woken at three in the morning — and it should be testable
 * without a native module.
 *
 * **Three families, three anchors, no cross-talk.** Each family reads exactly
 * one timestamp and never looks at another family's:
 *
 * | Family                    | Anchor         | About                        |
 * | ------------------------- | -------------- | ---------------------------- |
 * | Claim (`ready`, `track`)  | `lastClaimAt`  | The daily reward             |
 * | Streak (`streak`)         | `lastVisitAt`  | Consecutive days opened      |
 * | Away (`idle`)             | `lastPlayedAt` | The app not being opened     |
 *
 * A claim is not a visit and a visit is not a play session: you can open the
 * app at 9am (visit), collect at 3pm (claim), and close it at 4pm (played).
 * Any reminder built off the wrong one of those three lies about its own
 * deadline, which is why the builders below take only their own anchor and
 * nothing else.
 *
 * After the three families are built, one shared delivery pass applies rules
 * that are about *politeness*, not meaning: nothing fires at night, nothing
 * fires late, and two reminders landing together collapse to the one with the
 * most at stake.
 */

import { CLAIM_INTERVAL_MS, CLAIM_WINDOW_MS, VISIT_WINDOW_MS } from '@/game/streak';

const HOUR_MS = 60 * 60 * 1000;

export interface Reminder {
  kind: ReminderKind;
  /** When to fire, in ms since the epoch. */
  at: number;
  title: string;
  body: string;
  /**
   * A deadline the reminder is pointless past, if it has one.
   *
   * The waking-hours shift moves a reminder forwards, and far enough forward
   * it is no longer the message that was written — "about to end", delivered
   * to someone whose streak ended overnight. Enforced when the schedule is
   * built; Android may still deliver late from a standby bucket, which a local
   * notification has no TTL to express.
   */
  expiresAt?: number;
}

export interface ReminderState {
  /** When a reward was last collected. The claim family's only anchor. */
  lastClaimAt: number | null;
  /** When the app was last opened on a new day. The streak family's only anchor. */
  lastVisitAt: number | null;
  /** When the app was last open at all. The away family's only anchor. */
  lastPlayedAt: number | null;
  /**
   * Position on the seven-day payout track, 1-based.
   *
   * Not an anchor — it decides whether the track warning is worth sending and
   * names the payout at risk. Its own counter, not derived from the streak: a
   * player can be nine days into a streak and on day two of the track.
   */
  rewardDay: number;
  /** Days of the streak. Decides whether the streak warnings are worth sending. */
  streak: number;
}

type ReminderKind = 'ready' | 'track' | 'streak' | 'idle';

/* ----------------------------------------------- 1. claim — `lastClaimAt` */

/**
 * The claim family: the reward unlocking, and the deadline to collect it.
 *
 * Everything here is measured from the last collection. The reward unlocks
 * `CLAIM_INTERVAL_MS` (24h) after it and keeps its whole day: the track resets
 * `CLAIM_WINDOW_MS` (48h) after it, the moment the next reward would have
 * arrived. The streak and the last play session have no say.
 */

/**
 * How long before the track resets to warn about it.
 *
 * Six hours, inside the reward's own day — the only span where the warning
 * means anything. Before the unlock there is nothing the player could act on,
 * and a nudge saying "act now" against a locked reward teaches people to
 * ignore the next one.
 *
 * One warning, not two. The streak gets two because losing it costs weeks; the
 * track costs a place on a seven-day ladder, which is worth a sentence and not
 * a campaign.
 */
const TRACK_WARNING_LEAD_MS = 6 * HOUR_MS;

/**
 * Position on the payout track worth defending with a notification.
 *
 * Days three onward. Below that the track pays 10 or 15 coins and restarting
 * is barely a loss, so the warning would cost more attention than the thing it
 * protects.
 */
const TRACK_WORTH_WARNING = 3;

function claimReminders(lastClaimAt: number | null, rewardDay: number): Reminder[] {
  // Never collected: the first reward is already waiting on the screen, so
  // there is no unlock to announce and no place on the track to lose.
  if (lastClaimAt === null) return [];

  const reminders: Reminder[] = [
    {
      kind: 'ready',
      at: lastClaimAt + CLAIM_INTERVAL_MS,
      title: 'Your daily reward is ready',
      body: 'The vials are waiting. Claim it before the day is out.',
    },
  ];

  if (rewardDay >= TRACK_WORTH_WARNING) {
    const resetsAt = lastClaimAt + CLAIM_WINDOW_MS;
    reminders.push({
      kind: 'track',
      at: resetsAt - TRACK_WARNING_LEAD_MS,
      // "About to restart" delivered after it restarted is worse than silence.
      expiresAt: resetsAt,
      title: `Day ${rewardDay + 1} is waiting`,
      body: 'Collect it in the next few hours or the rewards start again at day one.',
    });
  }

  return reminders;
}

/* --------------------------------------------- 2. streak — `lastVisitAt` */

/**
 * The streak family: warnings before the run of opened days lapses.
 *
 * Everything here is measured from the last counted visit — the streak is made
 * of visits, so its deadline is `VISIT_WINDOW_MS` (48h) after the last one.
 * Collecting a reward moves nothing in this family, which is why the copy says
 * **"open the game"** and never "collect": collecting would not save the thing
 * being warned about.
 */

/**
 * The warnings, as **time left before the run lapses**.
 *
 * Counted back from the deadline, not forward from the visit. Same instants
 * today; the difference is what happens when the window changes. The deadline
 * comes from `game/streak`, so moving it moves both warnings with it and the
 * copy stays true — written as "+30h after the visit", a window change would
 * silently turn "six hours left" into a lie.
 *
 * Two because they do different jobs: eighteen hours out is a heads-up someone
 * can plan around, six is a last call. One warning has to be one or the other
 * and is wrong for half the cases.
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
 * Streak length worth defending with notifications.
 *
 * From three days. Two warnings a day for a one-day streak is nagging, and a
 * player one day in has nothing invested to lose.
 */
const STREAK_WORTH_WARNING = 3;

function streakReminders(lastVisitAt: number | null, streak: number): Reminder[] {
  if (lastVisitAt === null || streak < STREAK_WORTH_WARNING) return [];

  // The one moment that matters: when the run dies if the app stays closed.
  const lapsesAt = lastVisitAt + VISIT_WINDOW_MS;

  return STREAK_WARNINGS.map((warning) => ({
    kind: 'streak' as const,
    at: lapsesAt - warning.leftBefore,
    // Both expire at the lapse — never delivered about a run already lost.
    expiresAt: lapsesAt,
    title: warning.title(streak),
    body: warning.body,
  }));
}

/* ---------------------------------------------- 3. away — `lastPlayedAt` */

/**
 * The away family: the app has not been opened in a while.
 *
 * Every twelve hours from the moment it was last open, and that is the only
 * thing this family knows. It has no opinion about the streak or the reward —
 * someone mid-streak who has not opened the app in a day hears the same thing
 * as anyone else.
 */
const AWAY_EVERY_MS = 12 * HOUR_MS;

/**
 * How many nudges to queue at once.
 *
 * Four, covering two days from a single scheduling pass. The queue is rebuilt
 * on every background, so in practice only the first one or two ever fire —
 * the rest exist for the player who does not come back, which is exactly who
 * this reminder is for and the only case where nothing re-schedules them.
 *
 * Not unlimited: iOS caps pending notifications at 64, and a week-long queue
 * of "still sorting?" is aimed at someone who has quietly moved on.
 */
const AWAY_NUDGE_COUNT = 4;

/**
 * How far past its moment a nudge is still worth sending.
 *
 * Half a day — its own interval. Shifted further than that by quiet hours, it
 * lands on top of the next one and stops being the message that was written.
 */
const AWAY_STALE_MS = 12 * HOUR_MS;

/**
 * Alternating copy, so the second nudge is not the first one again. Two lines
 * cycled is not variety, but word-for-word repetition in a day reads as a
 * stuck app rather than a reminder.
 */
const AWAY_COPY = [
  { title: 'The vials are settling', body: 'A quiet puzzle is waiting whenever you are.' },
  { title: 'Still sorting?', body: 'Your shelf is where you left it. No rush.' },
] as const;

function awayReminders(lastPlayedAt: number | null): Reminder[] {
  if (lastPlayedAt === null) return [];

  return Array.from({ length: AWAY_NUDGE_COUNT }, (_, index) => {
    const at = lastPlayedAt + AWAY_EVERY_MS * (index + 1);
    return {
      kind: 'idle' as const,
      at,
      expiresAt: at + AWAY_STALE_MS,
      ...AWAY_COPY[index % AWAY_COPY.length]!,
    };
  });
}

/* ------------------------------------------------------------ 4. delivery */

/**
 * Waking hours, local time. Nothing fires outside them.
 *
 * The anchors drift: rewards are collected after they unlock, never before, so
 * each day's times slide later and eventually into the night — and a puzzle
 * game that wakes someone at 3am gets its notifications turned off for good,
 * which is the one failure this feature cannot recover from.
 *
 * 8am to 11pm rather than a polite 9-to-9, because the shift is not free: every
 * hour a warning is pushed forward is an hour taken off the deadline it warns
 * about. This is the widest window still defensible as "awake".
 */
const WAKING_START_HOUR = 8;
const WAKING_END_HOUR = 23;

/**
 * Reminders landing closer together than this collapse to one.
 *
 * Two lock-screen lines saying "come back" within the same three hours read as
 * one app nagging twice — and after the waking-hours shift, reminders from
 * different families genuinely do pile onto the same 8am.
 */
const MERGE_WINDOW_MS = 3 * HOUR_MS;

/**
 * Which reminder survives a collision: the one that costs most to miss.
 *
 * - **streak** — weeks of turning up, gone.
 * - **track** — a place on the seven-day payout, back to ten coins.
 * - **ready** — coins that keep for another twelve hours.
 * - **idle** — nothing at all.
 *
 * Resolving by time instead is how "your 7-day streak is about to end" gets
 * replaced by "no rush".
 */
const PRIORITY: Record<ReminderKind, number> = {
  streak: 0,
  track: 1,
  ready: 2,
  idle: 3,
};

/**
 * Moves a time into waking hours, always forwards.
 *
 * Forwards only, deliberately: pulling a 3am reminder back to the previous 9pm
 * would fire it before the thing it announces has happened.
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
 * Walked in priority order rather than time order, so the survivor of a clash
 * is the one with the most behind it; time only breaks ties within a kind.
 * Sorted back into firing order on the way out.
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

/**
 * Everything that should be pending, soonest first.
 *
 * The three families are built independently — each from its own anchor — and
 * only then share the delivery pass: shift into waking hours, drop what the
 * shift pushed past its deadline, collapse collisions, drop what is already
 * due. Anything already due is dropped rather than fired late; the reward is
 * on the home screen where it can be seen, and a notification about yesterday
 * is noise.
 *
 * Absolute times, not "every day at nine". The reward runs on a rolling
 * twenty-four hours from the claim, so a fixed hour would fire with hours
 * still on the clock — and an instant has no opinion about timezones or
 * daylight saving, which a recurring hour/minute trigger does.
 */
export function remindersFor(state: ReminderState, now: number): Reminder[] {
  const all = [
    ...claimReminders(state.lastClaimAt, state.rewardDay),
    ...streakReminders(state.lastVisitAt, state.streak),
    ...awayReminders(state.lastPlayedAt),
  ].map((reminder) => ({ ...reminder, at: intoWakingHours(reminder.at) }));

  const live = all.filter(
    (reminder) => reminder.expiresAt === undefined || reminder.at < reminder.expiresAt
  );

  // Merged after the shift, not before: two reminders hours apart at night can
  // both be pushed onto the same 8am.
  return merge(live).filter((reminder) => reminder.at > now);
}
