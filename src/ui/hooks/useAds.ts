import { useEffect } from 'react';

import { primeInterstitial } from '@/ads/interstitial';
import { initialiseAds } from '@/ads/setup';

/**
 * Starts the ad SDK once, after consent, on launch.
 *
 * A hook rather than a module-scope call so it runs inside React's lifecycle
 * and cannot fire during a Fast Refresh reload of an unrelated module. Mounted
 * in `Root` beside the notification and visit hooks.
 *
 * **Deliberately unawaited and silent.** Nothing on screen waits for it: the
 * first frame is the one thing this project spends real effort keeping seamless,
 * and an ad SDK doing network work on that path is exactly what
 * `delayAppMeasurementInit` was set to avoid. An ad asked for before the SDK is
 * ready simply fails to load, which `showRewarded` already treats as
 * `unavailable`.
 *
 * **The interstitial is primed after the SDK is up, not beside it.** Doc §8
 * puts the first one at the fourth completion, so there are minutes of runway
 * — the point of fetching now is that when it is due it is already in hand and
 * nobody waits for it. Ordered after `initialiseAds` because a request made
 * before the SDK has initialised is answered with an error rather than an
 * advert; `primeInterstitial` treats that as a no-fill and retries, so the
 * ordering is an optimisation rather than a correctness requirement.
 */
export function useAds(): void {
  useEffect(() => {
    void initialiseAds()
      .catch(() => undefined)
      .then(primeInterstitial);
  }, []);
}
