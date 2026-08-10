import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';

/**
 * Consent first, then the SDK. Called once from `Root`.
 *
 * **The order is the whole point.** Google's consent SDK (UMP) has to gather a
 * decision from an EU player before the ad SDK is allowed to request a
 * personalised ad, so initialising the ad SDK first is the thing this function
 * exists to prevent — which is also why `delayAppMeasurementInit` is set in
 * `app.config.ts`. Left at its default the SDK starts during app launch, before
 * any JavaScript has run and long before anyone has been asked anything.
 *
 * Outside the EU the form never appears: UMP returns `NOT_REQUIRED` and this is
 * two silent async calls. Inside it, the player sees Google's own form, which is
 * what keeps the app on the right side of GDPR without this project shipping a
 * consent UI of its own.
 *
 * **Nothing here blocks the first frame.** It is fired and forgotten from
 * `Root`, and every ad request is guarded by `showRewarded` regardless — an ad
 * asked for before the SDK is ready fails to load, which is a case that has to
 * be handled anyway.
 */
export async function initialiseAds(): Promise<void> {
  try {
    await gatherConsent();
  } catch {
    // A consent failure is not a reason to have no ads: UMP falls back to
    // non-personalised, which is the safe direction. Swallowed rather than
    // logged loudly because this runs on every launch, including offline ones,
    // where a network failure here is entirely expected.
  }

  await mobileAds()
    .setRequestConfiguration({
      /**
       * The strongest rating the app will accept.
       *
       * `G` — general audiences. Decant is a calm puzzle game with a store
       * listing to match, so an ad for a gambling app or a shooter in the
       * middle of it is a rating complaint waiting to happen. It costs some
       * demand and is worth it.
       *
       * Distinct from being *child-directed*, which this app is not: it is
       * rated for everyone, not aimed at under-13s, and tagging it otherwise
       * would force non-personalised ads on the whole audience and cut revenue
       * sharply. See `AGENTS.md`.
       */
      maxAdContentRating: MaxAdContentRating.G,
    })
    .then(() => mobileAds().initialize());
}

/**
 * Ask UMP whether this player needs a form, and show it if so.
 *
 * `gatherConsent` handles the whole flow — checking the region, fetching the
 * form, showing it only when required — so there is no branching to get wrong
 * here. It resolves with the status either way.
 */
async function gatherConsent(): Promise<void> {
  const consent = await AdsConsent.gatherConsent();

  // Nothing to act on. The status is read rather than ignored so the intent is
  // legible: consent decides whether requests may be personalised, and the SDK
  // reads that state itself from the same store UMP wrote it to.
  if (consent.status === AdsConsentStatus.REQUIRED) {
    await AdsConsent.showForm();
  }
}
