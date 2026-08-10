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
  /**
   * Milliseconds left to collect before the run resets to day one. Zero unless
   * a reward is waiting and the streak is still on the line.
   */
  lapseIn: number;
} {
  // Subscribed, not read through `getState`: claiming has to re-render this,
  // and the claim is the only thing that moves any of these numbers now.
  const lastClaimAt = useEconomyStore((state) => state.lastClaimAt);
  const [now, setNow] = useState(() => Date.now());

  const store = useEconomyStore.getState();
  const remaining = store.timeUntilClaim(now);
  const reward = store.claimable(now);
  const dayIndex = store.nextDayIndex(now);
  const lapseIn = store.timeUntilLapse(now);

  useEffect(() => {
    setNow(Date.now());
    // Ticking while a reward is waiting too, which the countdown-only version
    // did not: the deadline on the card is live, and a run that lapses while
    // the screen is open has to stop claiming it can still be saved.
    if (remaining <= 0 && lapseIn <= 0) return;

    const tick = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });

    return () => {
      clearInterval(tick);
      subscription.remove();
    };
    // `lastClaimAt` restarts both clocks; the two booleans decide whether
    // there is anything to tick at all.
  }, [lastClaimAt, remaining > 0, lapseIn > 0]);

  return { reward, remaining, dayIndex, lapseIn };
}
