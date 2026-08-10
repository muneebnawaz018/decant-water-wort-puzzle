import { useEffect } from 'react';

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
 */
export function useAds(): void {
  useEffect(() => {
    void initialiseAds();
  }, []);
}
