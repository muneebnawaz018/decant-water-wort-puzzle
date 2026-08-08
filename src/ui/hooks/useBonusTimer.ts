import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useBonusStore } from '@/state/bonusStore';

/**
 * Whether today's bonus puzzle is open, and how long until the next one.
 *
 * The same shape as `useClaimTimer` and for the same reasons: it ticks only
 * while something is actually counting down, and it re-reads the clock on
 * foreground because timers do not run in the background — a screen left open
 * overnight would otherwise show a dead countdown over a row that is by then
 * playable.
 */
export function useBonusTimer(): { available: boolean; remaining: number } {
  // Subscribed rather than read through `getState`: finishing the puzzle has to
  // re-render this row, and a selector on a method would pin a stable function
  // identity and never fire.
  const solvedAt = useBonusStore((state) => state.solvedAt);
  const [now, setNow] = useState(() => Date.now());

  const store = useBonusStore.getState();
  const available = store.available(now);
  const remaining = store.timeUntilNext(now);

  useEffect(() => {
    setNow(Date.now());
    if (available) return;

    const tick = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });

    return () => {
      clearInterval(tick);
      subscription.remove();
    };
  }, [solvedAt, available]);

  return { available, remaining };
}
