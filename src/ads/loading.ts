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
 * **Shared by every format**, which is why it lives here rather than inside
 * `rewarded.ts` where it started. The interstitial was written without it and
 * inherited the exact bug the veil exists to prevent: pressing Next with an ad
 * due left the button dead for up to five seconds with nothing on screen.
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
