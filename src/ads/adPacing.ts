/**
 * When a full-screen advert was last on screen, whatever kind it was.
 *
 * **One clock for every format, and that is the whole point.** The gap rule
 * started life inside the interstitial, measuring only the distance from one
 * interstitial to the next — which quietly permitted the worst sequence the app
 * can produce:
 *
 * > Finish a level → press **Double** → watch a rewarded advert → the coin
 * > shower plays → the screen navigates home on its own → **interstitial**.
 *
 * Two full-screen adverts back to back, the second one triggered by a timer
 * rather than a tap, and aimed at the player who had just chosen to watch the
 * first. The same shape happens without the doubling offer: take a rewarded
 * spare vial, finish the board a few seconds later, and the interstitial lands
 * on top of an advert already watched.
 *
 * Counting every format against one timestamp removes the whole family at once
 * rather than special-casing the two paths that happen to be reachable today.
 *
 * In memory rather than in MMKV, for the same reason as the completion count —
 * see `interstitial.ts`. Every failure mode here costs an impression instead of
 * showing a spare one, which is the correct side to be wrong on.
 */

/**
 * Negative infinity, never 0.
 *
 * Zero is a real timestamp — the epoch — so using it to mean "never" makes the
 * sentinel indistinguishable from a legitimate value. That is only noticed
 * somewhere the clock can actually read zero, which is exactly where it was
 * noticed: a test with a mocked `Date.now`.
 */
let lastAdShownAt = Number.NEGATIVE_INFINITY;

/** Records that a full-screen advert reached the screen. */
export function noteAdShown(now = Date.now()): void {
  lastAdShownAt = now;
}

/** How long since the last full-screen advert. `Infinity` if there has been none. */
export function msSinceLastAd(now = Date.now()): number {
  return now - lastAdShownAt;
}

/** Forgets the last advert. Tests only. */
export function resetAdPacing(): void {
  lastAdShownAt = Number.NEGATIVE_INFINITY;
}
