import { create } from 'zustand';

import { readJson, storage, writeJson } from './storage';
import { EARNINGS, STARTING_COINS } from '@/game/economy';
import {
  claimPhase,
  rewardDayAfterClaim,
  standingFor,
  streakAfterVisit,
  timeUntilLapse,
  timeUntilUnlock,
  type StreakStanding,
} from '@/game/streak';

const KEY = 'economy.v5';
/**
 * The v4 record, which had one counter doing two jobs. Balance only.
 *
 * v4 merged the streak and the reward track into a single number, so there is
 * no honest way to split it back into the two this version keeps. Coins and
 * cosmetics are real either way and come across; both runs start again.
 */
const LEGACY_KEY = 'economy.v4';

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
   * **Visits, and only visits.** Collecting a reward does not touch it, and
   * missing one does not break it — see `game/streak.ts` for why the two runs
   * are separate.
   */
  streak: number;
  /** Device time of the last visit that counted, or null before the first. */
  lastVisitAt: number | null;
  /**
   * Position on the seven-day payout track, 1-based. Zero before the first.
   *
   * Advances on a collection inside the window and restarts at one outside it.
   * Stored rather than derived from the streak, because the two now move
   * independently: a player can be nine days into a streak and on day two of
   * the track.
   */
  rewardDay: number;
  /**
   * Device time of the last claim, or null before the first.
   *
   * The reward track's anchor: the next reward unlocks 24h after it and stays
   * collectable until the one after would arrive, 48h after it. Says nothing
   * about the streak.
   */
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
   * Returns the standing afterwards so a caller can react to a completed tier
   * without recomputing it.
   */
  registerVisit: (now: number) => StreakStanding;
  /** The reward waiting right now, or null while the timer is still running. */
  claimable: (now: number) => number | null;
  /** Milliseconds until the next reward unlocks. Zero when one is waiting. */
  timeUntilClaim: (now: number) => number;
  /**
   * Milliseconds left to collect before the track restarts. Zero when nothing
   * is waiting, or once the window has already passed.
   */
  timeUntilLapse: (now: number) => number;
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
  rewardDay: number;
  lastClaimAt: number | null;
  owned: string[];
}

/** The shape v4 wrote. Only the parts that still mean the same thing. */
interface StoredV4 {
  coins: number;
  owned: string[];
}

/**
 * Exported for the migration tests: the store is created once at import time,
 * and the jest MMKV mock holds its data per instance, so re-importing the
 * module to re-run this would also throw the seeded records away.
 */
export function loadEconomy(): Stored {
  const stored = readJson<Partial<Stored>>(KEY, {});

  // First run after the change: carry the balance and the shelf, and nothing
  // else. Losing coins to a scheduling fix is not a trade worth making; keeping
  // a streak that was measuring a different thing is worse than losing it.
  if (stored.coins === undefined) {
    const legacy = readJson<Partial<StoredV4>>(LEGACY_KEY, {});
    if (legacy.coins !== undefined || legacy.owned !== undefined) {
      const carried: Stored = {
        coins: Math.max(0, Math.floor(legacy.coins ?? 0)),
        streak: 0,
        lastVisitAt: null,
        rewardDay: 0,
        lastClaimAt: null,
        owned: legacy.owned ?? [],
      };
      // Written under the new key *before* the old one goes: a crash between
      // the two leaves both records, and the next launch migrates again. The
      // old record cannot stay — it is what a corrupt v3 would resurrect, a
      // build-old balance handed back as if the time since never happened.
      writeJson(KEY, carried);
      storage.remove(LEGACY_KEY);
      return carried;
    }
  }

  // Already migrated, or a fresh install: either way the legacy record is
  // done. Removing it here as well covers records written by builds that
  // migrated before this delete existed.
  storage.remove(LEGACY_KEY);

  const lastVisitAt = readTime(stored.lastVisitAt);
  const lastClaimAt = readTime(stored.lastClaimAt);

  return {
    coins: Math.max(0, Math.floor(stored.coins ?? STARTING_COINS)),
    // A run with no timestamp behind it is not a run. Each counter and its
    // anchor are written together and only together, so a record holding one
    // without the other has been hand-edited or half-migrated — and the honest
    // reading is zero rather than progress the player never made.
    streak: lastVisitAt === null ? 0 : readCount(stored.streak),
    lastVisitAt,
    rewardDay: lastClaimAt === null ? 0 : readCount(stored.rewardDay),
    lastClaimAt,
    owned: stored.owned ?? [],
  };
}

/**
 * A stored counter, validated but **not capped**.
 *
 * The streak used to be clamped to the reward track's seven, which quietly
 * discarded every run past a week: the card said "21-day streak" until the app
 * restarted and then said seven. The streak is a total with a ladder above
 * seven to climb, so the cap was both a bug and a contradiction — and the
 * reward day is bounded by its own arithmetic rather than by a clamp here.
 */
function readCount(value: number | undefined): number {
  return Math.max(0, Math.floor(value ?? 0));
}

/** A stored instant, or null if the record does not hold a usable one. */
function readTime(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const useEconomyStore = create<EconomyState>((set, get) => {
  const initial = loadEconomy();

  const persist = () => {
    const { coins, streak, lastVisitAt, rewardDay, lastClaimAt, owned } = get();
    writeJson(KEY, { coins, streak, lastVisitAt, rewardDay, lastClaimAt, owned });
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
     * Which of the seven tiles the next claim pays.
     *
     * The track cycles weekly whatever tier the streak is on: day 8 pays what
     * day 1 paid. The ladder is the long game and the week is the short one,
     * and keeping them separate is what lets a thirty-day tier exist without
     * thirty tiles on screen.
     *
     * A lapsed track reads day one, because that is what the claim will make
     * it. The tile the player is about to take has to be the tile they see.
     */
    nextDayIndex: (now) => {
      const { rewardDay, lastClaimAt } = get();
      const next = rewardDayAfterClaim(rewardDay, lastClaimAt, now);
      return (next - 1) % DAILY_REWARDS.length;
    },

    /**
     * The reward waiting right now, or null while the timer is running.
     *
     * A lapsed reward is still offered, deliberately. Refusing to pay someone
     * who came back two days late punishes the return itself — they have
     * already lost the streak, which was the thing at stake, and locking the
     * coins as well makes coming back worth nothing.
     */
    claimable: (now) => {
      if (claimPhase(get().lastClaimAt, now) === 'waiting') return null;
      return DAILY_REWARDS[get().nextDayIndex(now)]!;
    },

    /** Time to the unlock. Zero once a reward is waiting, lapsed or not. */
    timeUntilClaim: (now) => timeUntilUnlock(get().lastClaimAt, now),

    /**
     * Time left to collect before the track resets to day one.
     *
     * Zero while the reward is still locked and zero once it has lapsed, so a
     * non-zero value means exactly one thing: a reward is waiting and the
     * track is still on the line. That is the only state the card warns about.
     */
    timeUntilLapse: (now) => {
      if (claimPhase(get().lastClaimAt, now) !== 'ready') return 0;
      return timeUntilLapse(get().lastClaimAt, now);
    },

    claimDaily: (now) => {
      const reward = get().claimable(now);
      if (reward === null) return 0;

      set((current) => ({
        coins: current.coins + reward,
        // The claim moves the track and nothing else. The streak is made of
        // visits and is not this function's business.
        rewardDay: rewardDayAfterClaim(current.rewardDay, current.lastClaimAt, now),
        lastClaimAt: now,
      }));
      persist();
      return reward;
    },
  };
});
