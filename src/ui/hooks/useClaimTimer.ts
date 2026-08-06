import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useEconomyStore } from '@/state/economyStore';

/**
 * The daily reward's state, refreshed once a second while it is counting down.
 *
 * Ticks only while a claim is actually pending. Once the reward is waiting
 * there is nothing left to count, so the interval is cleared rather than left
 * running behind a screen nobody is watching.
 *
 * `AppState` matters more than the interval here: timers do not run while the
 * app is backgrounded, so a player who leaves the screen open overnight would
 * come back to a stale countdown and a Claim button that does nothing. Coming
 * back to the foreground re-reads the clock.
 */
export function useClaimTimer(): {
  /** Coins waiting, or null while the timer is still running. */
  reward: number | null;
  /** Milliseconds left. Zero when a claim is ready. */
  remaining: number;
  /** Which day of the seven-day track the next claim pays. */
  dayIndex: number;
} {
  // Subscribed, not read through `getState`: claiming has to re-render this.
  const lastClaimAt = useEconomyStore((state) => state.lastClaimAt);
  const [now, setNow] = useState(() => Date.now());

  const store = useEconomyStore.getState();
  const remaining = store.timeUntilClaim(now);
  const reward = store.claimable(now);
  const dayIndex = store.nextDayIndex(now);

  useEffect(() => {
    setNow(Date.now());
    if (remaining <= 0) return;

    const tick = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });

    return () => {
      clearInterval(tick);
      subscription.remove();
    };
    // `lastClaimAt` restarts the timer after a claim; `remaining > 0` is what
    // decides whether there is anything to tick at all.
  }, [lastClaimAt, remaining > 0]);

  return { reward, remaining, dayIndex };
}
