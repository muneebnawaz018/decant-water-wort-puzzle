import { storage } from '@/state/storage';

const KEY = 'played.v1';

/**
 * When the app was last open, for the come-back nudges.
 *
 * Its own key rather than a field on a store, because nothing in the app reads
 * it — only the notification scheduler does. Putting it in `economyStore` or
 * `progress` would mean every screen subscribed to those re-rendering on a
 * value none of them use.
 *
 * Written when the app goes to the background rather than on every pour: the
 * question it answers is "when did they last stop playing", and a write per
 * move would be a hundred writes a level for the same answer.
 */
export function markPlayed(now: number): void {
  storage.set(KEY, now);
}

export function lastPlayedAt(): number | null {
  const value = storage.getNumber(KEY);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
