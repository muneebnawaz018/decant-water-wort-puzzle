/**
 * Whether an ad is being fetched, and a way to be told when that changes.
 *
 * **The load is the only part worth a spinner.** It is the one stretch where
 * the player has pressed something and the screen has nothing to show for it,
 * and on a slow connection it is seconds long — which without a spinner reads
 * as a dead button, and a dead button gets pressed again. It goes false the
 * moment the ad reaches the screen rather than when the offer settles, because
 * from there the advert speaks for itself.
 *
 * A subscription rather than a store field, because `src/ads` is the boundary
 * the UI sits above: this module knowing about zustand would put the dependency
 * the wrong way round, and every screen would import an ad concept to render a
 * spinner. `AdVeil` is the only reader.
 *
 * **Only the rewarded slots raise it, and the interstitial deliberately does
 * not.** It did once, and the veil was the visible half of the wrong fix: the
 * interstitial was loading on demand, so pressing Next opened a network request
 * with the player waiting on it. It now loads ahead of time and shows only what
 * is already in hand — no wait, so nothing to spin over. A rewarded advert is
 * the opposite case and keeps the veil: the player pressed a button asking for
 * one and is owed it, so waiting is the lesser evil.
 *
 * It stays here rather than in `rewarded.ts` because it is about what is on
 * screen rather than about one format, and a second format needing it would
 * otherwise import the first.
 */
type LoadingListener = (loading: boolean) => void;

let adLoading = false;
const listeners = new Set<LoadingListener>();

export function setAdLoading(value: boolean): void {
  if (adLoading === value) return;
  adLoading = value;
  for (const listener of listeners) listener(value);
}

/** Whether an ad is being fetched. The snapshot half of the subscription. */
export function isAdLoading(): boolean {
  return adLoading;
}

/** Listen for the fetch starting and ending. Returns its own unsubscribe. */
export function subscribeToAdLoading(listener: LoadingListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
