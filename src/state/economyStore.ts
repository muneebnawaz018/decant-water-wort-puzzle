import { create } from 'zustand';

import { readJson, writeJson } from './storage';
import { EARNINGS, STARTING_COINS } from '@/game/economy';

const KEY = 'economy.v2';
/** The v1 record, keyed on calendar dates. Read once to carry coins across. */
const LEGACY_KEY = 'economy.v1';

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

/**
 * How long after a claim the next one opens.
 *
 * A rolling timer, not a calendar day. Calendar days mean a player who claims
 * at 11pm can claim again an hour later, and one who plays at 9am every
 * morning is fine while one who plays at 9am then 8am the next day breaks
 * their streak on a technicality. From the moment you claim, the clock is
 * twenty-four hours.
 */
const CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a claim stays claimable before the streak lapses.
 *
 * A day's grace past the reset. Miss the whole window and the track restarts
 * at day one, which is the only thing the streak can mean.
 */
const STREAK_WINDOW_MS = CLAIM_INTERVAL_MS * 2;

export interface EconomyState {
  coins: number;
  /** Consecutive claims, 1 to 7 then wrapping. Zero before the first. */
  streak: number;
  /** Device time of the last claim, in ms, or null if never claimed. */
  lastClaimAt: number | null;
  /** Shop items bought. Cosmetic only — never pay-to-win (spec §7). */
  owned: string[];

  add: (amount: number) => void;
  /** Returns false if the player cannot afford it. */
  spend: (amount: number) => boolean;
  buy: (item: string, price: number) => boolean;
  /** The reward waiting right now, or null if the timer has not run out. */
  claimable: (now: number) => number | null;
  /** Milliseconds until the next claim opens. Zero when one is waiting. */
  timeUntilClaim: (now: number) => number;
  /** Which day of the seven-day track the next claim pays. */
  nextDayIndex: (now: number) => number;
  claimDaily: (now: number) => number;
}

interface Stored {
  coins: number;
  streak: number;
  lastClaimAt: number | null;
  owned: string[];
}

/** The shape v1 wrote, before the timer replaced calendar dates. */
interface StoredV1 {
  coins: number;
  streak: number;
  lastClaim: string | null;
  owned: string[];
}

function load(): Stored {
  const stored = readJson<Partial<Stored>>(KEY, {});

  // First run after the change: carry the v1 record over rather than wiping a
  // player's coins for a scheduling fix. The old `lastClaim` was a calendar
  // date with no time in it, so it becomes that day's midnight — the most
  // generous reading, and it only ever brings the next claim forward.
  if (stored.coins === undefined && stored.lastClaimAt === undefined) {
    const legacy = readJson<Partial<StoredV1>>(LEGACY_KEY, {});
    if (legacy.coins !== undefined || legacy.lastClaim) {
      const at = legacy.lastClaim ? Date.parse(`${legacy.lastClaim}T00:00:00`) : null;
      return {
        coins: Math.max(0, Math.floor(legacy.coins ?? 0)),
        streak: clampStreak(legacy.streak),
        lastClaimAt: at !== null && Number.isFinite(at) ? at : null,
        owned: legacy.owned ?? [],
      };
    }
  }

  return {
    coins: Math.max(0, Math.floor(stored.coins ?? STARTING_COINS)),
    streak: clampStreak(stored.streak),
    lastClaimAt:
      typeof stored.lastClaimAt === 'number' && Number.isFinite(stored.lastClaimAt)
        ? stored.lastClaimAt
        : null,
    owned: stored.owned ?? [],
  };
}

function clampStreak(value: number | undefined): number {
  return Math.min(DAILY_REWARDS.length, Math.max(0, Math.floor(value ?? 0)));
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
    const { coins, streak, lastClaimAt, owned } = get();
    writeJson(KEY, { coins, streak, lastClaimAt, owned });
  };

  /** Whether a claim now continues the streak or restarts the track. */
  const continues = (now: number): boolean =>
    elapsedSince(get().lastClaimAt, now) < STREAK_WINDOW_MS;

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

    timeUntilClaim: (now) => {
      const elapsed = elapsedSince(get().lastClaimAt, now);
      if (elapsed === Infinity) return 0;
      return Math.max(0, CLAIM_INTERVAL_MS - elapsed);
    },

    nextDayIndex: (now) => (continues(now) ? get().streak : 0) % DAILY_REWARDS.length,

    claimable: (now) => {
      if (get().timeUntilClaim(now) > 0) return null;
      return DAILY_REWARDS[get().nextDayIndex(now)]!;
    },

    claimDaily: (now) => {
      const reward = get().claimable(now);
      if (reward === null) return 0;

      // Read before the write: `continues` looks at the claim being replaced.
      const carriesOn = continues(now);
      set((current) => ({
        coins: current.coins + reward,
        streak: (carriesOn ? current.streak : 0) + 1,
        lastClaimAt: now,
      }));
      persist();
      return reward;
    },
  };
});
