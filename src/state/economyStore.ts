import { create } from 'zustand';

import { readJson, writeJson } from './storage';

const KEY = 'economy.v1';

/** Coins in the daily track, one per day of the streak week. */
export const DAILY_REWARDS = [40, 50, 60, 75, 90, 110, 150] as const;

export interface EconomyState {
  coins: number;
  /** Consecutive days claimed, 0 to 7 then wrapping. */
  streak: number;
  /** `YYYY-MM-DD` of the last claim, or null if never. */
  lastClaim: string | null;
  /** Shop items bought. Cosmetic only — never pay-to-win (spec §7). */
  owned: string[];

  add: (amount: number) => void;
  /** Returns false if the player cannot afford it. */
  spend: (amount: number) => boolean;
  buy: (item: string, price: number) => boolean;
  /** Today's reward if it is claimable, else null. */
  claimable: (today: string) => number | null;
  claimDaily: (today: string) => number;
}

interface Stored {
  coins: number;
  streak: number;
  lastClaim: string | null;
  owned: string[];
}

function load(): Stored {
  const stored = readJson<Partial<Stored>>(KEY, {});
  return {
    coins: Math.max(0, Math.floor(stored.coins ?? 0)),
    streak: Math.min(DAILY_REWARDS.length, Math.max(0, Math.floor(stored.streak ?? 0))),
    lastClaim: stored.lastClaim ?? null,
    owned: stored.owned ?? [],
  };
}

/** Local calendar date. Days are what the player sees, not UTC midnight. */
export function today(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whether `b` is the calendar day right after `a`. */
export function isNextDay(a: string, b: string): boolean {
  const previous = new Date(`${a}T00:00:00`);
  previous.setDate(previous.getDate() + 1);
  return today(previous) === b;
}

export const useEconomyStore = create<EconomyState>((set, get) => {
  const initial = load();

  const persist = () => {
    const { coins, streak, lastClaim, owned } = get();
    writeJson(KEY, { coins, streak, lastClaim, owned });
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

    claimable: (date) => {
      if (get().lastClaim === date) return null;
      // A broken streak restarts at day one rather than resuming where it fell.
      const day = isNextDay(get().lastClaim ?? '', date) ? get().streak : 0;
      return DAILY_REWARDS[day % DAILY_REWARDS.length]!;
    },

    claimDaily: (date) => {
      const reward = get().claimable(date);
      if (reward === null) return 0;

      const continues = isNextDay(get().lastClaim ?? '', date);
      set((current) => ({
        coins: current.coins + reward,
        streak: (continues ? current.streak : 0) + 1,
        lastClaim: date,
      }));
      persist();
      return reward;
    },
  };
});
