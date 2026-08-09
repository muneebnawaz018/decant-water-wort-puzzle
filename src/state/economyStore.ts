import { create } from 'zustand';

import { readJson, writeJson } from './storage';
import { EARNINGS, STARTING_COINS } from '@/game/economy';
import {
  standingFor,
  streakAfterVisit,
  VISIT_INTERVAL_MS,
  type StreakStanding,
} from '@/game/streak';

const KEY = 'economy.v3';
/**
 * The v2 record, whose `streak` counted claims. Read once, for the balance only.
 *
 * The number itself is deliberately **not** carried. A claim-era streak was a
 * count of rewards taken, and reading it as a count of days visited invents a
 * history that never happened — a test account with 22 claims came back as a
 * 22-day streak against a `lastVisitAt` of null. Visits were not recorded before
 * this version, so there is no honest value to migrate and the run starts over.
 */
const LEGACY_KEY = 'economy.v2';

/**
 * Coins in the daily track, one per day of the streak week.
 *
 * The week totals 350, averaging 50 a day — about one level's payout, which is
 * the right size for a habit nudge. The track it replaced averaged 82, so
 * simply opening the app paid better than playing it.
 *
 * The shape matters more than the total. Gaps widen the whole way through —
 * +5, +5, +10, +20, +25, +75 — so the early days are small and the week builds
 * to something. An evenly spaced ladder is arithmetic a player finishes in
 * their head on day two, and once tomorrow is predictable there is nothing to
 * come back for.
 *
 * Day seven is the point of the week: 150 coins, double day six and fifteen
 * times day one, and 43% of everything the week pays. Breaking a streak on day
 * six has to cost something real or the streak is decoration.
 *
 * The numbers themselves are in `game/economy.ts`, with every other price and
 * payout; this is only the name the daily code knows them by.
 */
export const DAILY_REWARDS = EARNINGS.daily;

export interface EconomyState {
  coins: number;
  /**
   * Consecutive days the app was opened. Unbounded, zero before the first.
   *
   * **Visits, not claims.** It used to count claims and wrap at seven, which
   * made "streak" mean something no player would guess: turn up daily for a
   * week without tapping Collect and it stayed at zero. Now the tap pays and
   * the visit counts, which is what the word means everywhere else.
   */
  streak: number;
  /** Device time of the last visit that counted, or null before the first. */
  lastVisitAt: number | null;
  /**
   * The streak value on the day the last reward was collected.
   *
   * One number instead of a per-day collected list: a day's reward can only be
   * taken on that day, so all the screen has to know is whether today's has
   * gone. Comparing it to `streak` answers that, and it survives a week rolling
   * over without anything needing to be reset.
   */
  claimedOnDay: number | null;
  /** Device time of the last claim, in ms, or null if never claimed. */
  lastClaimAt: number | null;
  /** Shop items bought. Cosmetic only — never pay-to-win (spec §7). */
  owned: string[];

  add: (amount: number) => void;
  /** Returns false if the player cannot afford it. */
  spend: (amount: number) => boolean;
  buy: (item: string, price: number) => boolean;
  /**
   * Counts today's visit, if it is a new day. Call on launch and on foreground.
   *
   * Returns the standing afterwards so a caller can celebrate a completed tier
   * without recomputing it.
   */
  registerVisit: (now: number) => StreakStanding;
  /** The reward waiting right now, or null when today's has been taken. */
  claimable: (now: number) => number | null;
  /** Milliseconds until the next reward unlocks. Zero when one is waiting. */
  timeUntilClaim: (now: number) => number;
  /** Which day of the seven-day track today's reward pays. */
  nextDayIndex: (now: number) => number;
  claimDaily: (now: number) => number;
  /** Where the run stands on the tier ladder. */
  standing: () => StreakStanding;
}

interface Stored {
  coins: number;
  streak: number;
  lastVisitAt: number | null;
  claimedOnDay: number | null;
  lastClaimAt: number | null;
  owned: string[];
}

/** The shape v2 wrote. Only the parts that still mean the same thing. */
interface StoredV2 {
  coins: number;
  owned: string[];
}

function load(): Stored {
  const stored = readJson<Partial<Stored>>(KEY, {});

  // First run after the change: carry the balance and the shelf, and nothing
  // else. Losing coins to a scheduling fix is not a trade worth making; keeping
  // a streak that was measuring a different thing is worse than losing it.
  if (stored.coins === undefined) {
    const legacy = readJson<Partial<StoredV2>>(LEGACY_KEY, {});
    if (legacy.coins !== undefined || legacy.owned !== undefined) {
      return {
        coins: Math.max(0, Math.floor(legacy.coins ?? 0)),
        streak: 0,
        lastVisitAt: null,
        claimedOnDay: null,
        lastClaimAt: null,
        owned: legacy.owned ?? [],
      };
    }
  }

  const lastVisitAt =
    typeof stored.lastVisitAt === 'number' && Number.isFinite(stored.lastVisitAt)
      ? stored.lastVisitAt
      : null;

  return {
    coins: Math.max(0, Math.floor(stored.coins ?? STARTING_COINS)),
    // A streak with no visit behind it is not a streak. The two fields are
    // written together and only together, so a record holding one without the
    // other has been hand-edited or half-migrated, and the honest reading of it
    // is zero rather than a run the player never had.
    streak: lastVisitAt === null ? 0 : readStreak(stored.streak),
    lastVisitAt,
    claimedOnDay:
      typeof stored.claimedOnDay === 'number' && Number.isInteger(stored.claimedOnDay)
        ? stored.claimedOnDay
        : null,
    lastClaimAt:
      typeof stored.lastClaimAt === 'number' && Number.isFinite(stored.lastClaimAt)
        ? stored.lastClaimAt
        : null,
    owned: stored.owned ?? [],
  };
}

/**
 * A stored streak, validated but **not capped**.
 *
 * It used to be clamped to the reward track's seven, which quietly discarded
 * every run past a week: the card said "21-day streak" until the app restarted
 * and then said seven. The streak is a total now and has a ladder above seven
 * to climb, so the cap was both a bug and a contradiction.
 */
function readStreak(value: number | undefined): number {
  return Math.max(0, Math.floor(value ?? 0));
}

/**
 * How long since the last claim, in ms. `Infinity` before the first one.
 *
 * Device time, per spec — there is no server to ask. A clock moved backwards
 * would otherwise read as a negative age and hand out an early reward, so the
 * elapsed time is floored at zero: winding the clock back pauses the timer
 * rather than skipping it.
 */
function elapsedSince(lastClaimAt: number | null, now: number): number {
  if (lastClaimAt === null) return Infinity;
  return Math.max(0, now - lastClaimAt);
}

export const useEconomyStore = create<EconomyState>((set, get) => {
  const initial = load();

  const persist = () => {
    const { coins, streak, lastVisitAt, claimedOnDay, lastClaimAt, owned } = get();
    writeJson(KEY, { coins, streak, lastVisitAt, claimedOnDay, lastClaimAt, owned });
  };

  return {
    ...initial,

    add: (amount) => {
      set((current) => ({
        coins: current.coins + Math.max(0, Math.floor(amount)),
      }));
      persist();
    },

    spend: (amount) => {
      if (get().coins < amount) return false;
      set((current) => ({ coins: current.coins - amount }));
      persist();
      return true;
    },

    buy: (item, price) => {
      if (get().owned.includes(item)) return true;
      if (!get().spend(price)) return false;
      set((current) => ({ owned: [...current.owned, item] }));
      persist();
      return true;
    },

    registerVisit: (now) => {
      const { streak, lastVisitAt } = get();
      const next = streakAfterVisit(streak, lastVisitAt, now);

      if (next.counted) {
        set({ streak: next.streak, lastVisitAt: now });
        persist();
      }

      return standingFor(next.streak);
    },

    standing: () => standingFor(get().streak),

    /**
     * Which of the seven tiles today's visit unlocked.
     *
     * The reward track cycles weekly whatever tier the streak is on: day 8 pays
     * what day 1 paid. The tier ladder is the long game and the week is the
     * short one, and keeping them separate is what lets a thirty-day tier exist
     * without needing thirty tiles on screen.
     *
     * Zero before the first visit, so a fresh install shows day one waiting
     * rather than an empty track.
     */
    nextDayIndex: () => {
      const { streak } = get();
      if (streak <= 0) return 0;
      return (streak - 1) % DAILY_REWARDS.length;
    },

    /**
     * Today's reward, or null once it has been taken.
     *
     * **A day's coins are claimable only on that day.** Miss the tap and they
     * are gone — the streak survives, because turning up is what the streak
     * measures, but the reward was for turning up *and* collecting. Anything
     * else means a player could ignore the card for a week and then bank seven
     * days at once, which makes the daily nothing of the sort.
     */
    claimable: (now) => {
      const { streak, claimedOnDay } = get();
      if (streak <= 0) return null;
      if (claimedOnDay === streak) return null;
      return DAILY_REWARDS[get().nextDayIndex(now)]!;
    },

    /**
     * How long until the next reward unlocks — which is the next visit day.
     *
     * Measured from the last counted visit rather than the last claim, since
     * that is what moves the day on now. Zero when today's reward is still
     * waiting, so the button can key off one number.
     */
    timeUntilClaim: (now) => {
      const { lastVisitAt, streak, claimedOnDay } = get();
      if (streak <= 0) return 0;
      if (claimedOnDay !== streak) return 0;

      const elapsed = elapsedSince(lastVisitAt, now);
      if (elapsed === Infinity) return 0;
      return Math.max(0, VISIT_INTERVAL_MS - elapsed);
    },

    claimDaily: (now) => {
      const reward = get().claimable(now);
      if (reward === null) return 0;

      set((current) => ({
        coins: current.coins + reward,
        // Marks *today* as collected rather than starting a timer. The streak
        // is what moves the day on, so the claim only has to record which day
        // it was for.
        claimedOnDay: current.streak,
        lastClaimAt: now,
      }));
      persist();
      return reward;
    },
  };
});
