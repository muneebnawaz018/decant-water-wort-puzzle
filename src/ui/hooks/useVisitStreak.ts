import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useEconomyStore } from '@/state/economyStore';

/**
 * Counts today's visit, which is what the streak is made of.
 *
 * **On launch and on every foreground.** Launch alone is not enough: a phone
 * that never fully closes the app would leave a daily player's streak frozen at
 * whatever it was the day they installed it, and "days you opened the game" has
 * to include the mornings you came back to it rather than restarted it.
 *
 * The store decides whether the visit counts — a second one inside the same
 * twenty-four hours moves nothing — so this can fire as often as it likes.
 * Deliberately silent: a streak advancing is not an interruption, and the
 * Rewards screen is where it is shown.
 *
 * Mounted once in `Root`, beside the notification reconciler, which reacts to
 * foreground for the same reason.
 */
export function useVisitStreak(): void {
  useEffect(() => {
    useEconomyStore.getState().registerVisit(Date.now());

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') useEconomyStore.getState().registerVisit(Date.now());
    });

    return () => subscription.remove();
  }, []);
}
