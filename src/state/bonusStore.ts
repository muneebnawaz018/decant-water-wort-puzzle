import { create } from 'zustand';

import { DAY_MS, dayIndex } from '@/game/dailyPuzzle';
import { readJson, writeJson } from './storage';

const KEY = 'bonus.v1';

interface Stored {
  /** When the last bonus puzzle was solved, or null if none ever has been. */
  solvedAt: number | null;
  /** The day index that puzzle belonged to. */
  solvedDay: number | null;
  /** How many have been finished, all time. */
  total: number;
}

export interface BonusState extends Stored {
  /** Whether today's puzzle is still to be played. */
  available: (now: number) => boolean;
  /** Milliseconds until the next one opens. 0 when one is waiting. */
  timeUntilNext: (now: number) => number;
  /** Records a finished bonus puzzle. Idempotent within a day. */
  complete: (now: number) => void;
}

function load(): Stored {
  const stored = readJson<Partial<Stored>>(KEY, {});
  const at = stored.solvedAt;
  const day = stored.solvedDay;

  return {
    // Validated rather than trusted: the record outlives the build that wrote
    // it, and a corrupt timestamp here would lock the puzzle out forever.
    solvedAt: typeof at === 'number' && Number.isFinite(at) ? at : null,
    solvedDay: typeof day === 'number' && Number.isFinite(day) ? day : null,
    total: Math.max(0, Math.floor(stored.total ?? 0)),
  };
}

/**
 * Today's bonus puzzle, and when the next one opens.
 *
 * **Two gates, not one, and they answer different questions.** A rolling
 * twenty-four hours from the moment it was solved is the timer the player sees,
 * and it is the same rule the daily reward runs on — a calendar day misbehaves
 * at both ends, letting an 11pm player play again an hour later while an 8am
 * player waits. But the *puzzle itself* is keyed to the calendar day, because
 * that is what makes it the same board for everyone.
 *
 * So both have to hold: the clock has to have run out, and the day has to have
 * turned. Without the second, finishing at 9pm would open the timer at 9pm
 * tomorrow — into a day whose puzzle you may already have played.
 *
 * Device time, per spec, with elapsed time floored at zero so winding the clock
 * backwards pauses the wait rather than skipping it. Winding it *forwards*
 * hands out another puzzle; that is accepted for the same reason the daily
 * reward accepts it — the prize is coins, and a player cheating themselves out
 * of a daily habit is not worth a trusted time source.
 */
export const useBonusStore = create<BonusState>((set, get) => {
  const persist = () => {
    const { solvedAt, solvedDay, total } = get();
    writeJson(KEY, { solvedAt, solvedDay, total });
  };

  const waitRemaining = (now: number): number => {
    const { solvedAt } = get();
    if (solvedAt === null) return 0;
    return Math.max(0, DAY_MS - Math.max(0, now - solvedAt));
  };

  return {
    ...load(),

    available: (now) => {
      if (get().solvedAt === null) return true;
      return waitRemaining(now) === 0 && dayIndex(now) !== get().solvedDay;
    },

    timeUntilNext: (now) => {
      if (get().available(now)) return 0;

      const wait = waitRemaining(now);
      if (wait > 0) return wait;

      // The clock is up but the day has not turned — only reachable when the
      // player solved it very late and the twenty-four hours ran out before
      // midnight did. What is left is the wait to local midnight.
      const midnight = (dayIndex(now) + 1) * DAY_MS;
      const offsetMs = new Date(now).getTimezoneOffset() * 60 * 1000;
      return Math.max(0, midnight + offsetMs - now);
    },

    complete: (now) => {
      const day = dayIndex(now);
      // Idempotent within a day: the win path can fire more than once for one
      // board (a redo of the winning pour re-solves it), and that must not
      // count as a second puzzle or restart the timer.
      if (get().solvedDay === day) return;
      set((current) => ({ solvedAt: now, solvedDay: day, total: current.total + 1 }));
      persist();
    },
  };
});
