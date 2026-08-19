import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
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
 *
 * **It runs once per process, and the guard is here rather than at the call
 * site.** `Root` mounts once in a release build, so this looks unnecessary
 * until Fast Refresh remounts it — six reloads meant six consent gathers and
 * six SDK initialisations, which is how it was noticed. A one-shot promise
 * rather than a boolean, so a second caller during the first run waits on that
 * run instead of starting a parallel one: `gatherConsent` can put a form on
 * screen, and two of those is not a thing to leave to timing.
 *
 * Not exposed as "reset" anywhere. Starting the ad SDK twice is not something
 * the app should be able to ask for.
 */
let started: Promise<void> | null = null;

export function initialiseAds(): Promise<void> {
  started ??= start();
  return started;
}

async function start(): Promise<void> {
  try {
    await gatherConsent();
  } catch (error) {
    // Swallowed because this runs on every launch, including offline ones,
    // where a network failure here is entirely expected — and because there is
    // nothing the app can do about it either way.
    //
    // **What it costs is not "a lower rate", and that mistake is worth not
    // repeating.** Outside the EEA a failure here changes nothing: consent was
    // never required, so the SDK serves as usual. Inside it, consent is
    // required and a failure means it cannot be obtained, so Google sets
    // `canRequestAds` false and serves *nothing* — test units included. The
    // usual cause is not the network at all: it is no consent message being
    // published in the AdMob console, which the app cannot fix and cannot
    // detect any other way. See `docs/06-launch.md` §6.
    //
    // The game itself is unharmed. `paysWithoutAd` grants the spare vial when
    // no advert can be shown, so the escape hatch on an unfinishable board
    // still opens; every other slot is an optional offer that declines
    // politely.
    //
    // **Except while `debugEea` is on**, where silence is the problem rather
    // than the manners: the flag exists to make one specific sequence visible,
    // and a swallowed throw there looks exactly like the flag not working.
    if (debugEea) console.warn('[ads] consent failed', error);
  }

  await requestTracking();

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
 * The ATT native module, or `null` in any build that does not carry it.
 *
 * **Reached this way rather than through `expo-tracking-transparency`'s own JS,
 * and that is a crash fix rather than a preference.** The package's entry point
 * is `requireNativeModule('ExpoTrackingTransparency')` at module scope, which
 * *throws* when the module is absent — during bundle evaluation, so the app
 * dies at `[runtime not ready]` with no screen and nothing to catch. Its
 * `isAvailable()` is `Boolean(ExpoTrackingTransparency)`, which cannot return
 * false for a missing module: the import has already taken the app down.
 *
 * That is not a hypothetical. Adding a native dependency and reloading Metro
 * against a dev build compiled *before* it is the ordinary state of every
 * machine between `npm install` and the next `npm run ios`, and it should cost
 * a missing prompt, not a dead launch. Autolinking still compiles the package
 * into the binary — this only changes how the JS reaches it.
 *
 * `requireOptionalNativeModule` is the same primitive `modules/system-sound`,
 * `system-haptics` and `system-battery` use, and it returns `null` instead of
 * throwing. It also makes the module null under Jest, which is why nothing here
 * needs a mock.
 */
interface TrackingTransparencyModule {
  requestPermissionsAsync(): Promise<{ status: string }>;
}

const tracking = requireOptionalNativeModule<TrackingTransparencyModule>(
  'ExpoTrackingTransparency'
);

/**
 * iOS's App Tracking Transparency prompt — the one that decides whether the
 * IDFA exists for this install.
 *
 * **After UMP, before the SDK starts.** Two separate reasons, and the order
 * satisfies both. UMP first because Google's form is the one that explains why
 * the app is about to ask, and a bare system dialog with no lead-in is the one
 * everybody denies. The SDK last because it reads the tracking status when it
 * initialises; started first, it would take "denied" as the answer for the
 * whole session and only pick up the real one on the next launch.
 *
 * `NSUserTrackingUsageDescription` — the sentence the prompt shows — is set by
 * the `react-native-google-mobile-ads` plugin in `app.config.ts`, and stays
 * its job rather than moving here. `expo-tracking-transparency` ships a config
 * plugin that would write the same key, and two plugins writing one plist
 * string is a value that changes depending on plugin order. So the package is
 * installed for its runtime API only and is deliberately **not** in the
 * `plugins` array.
 *
 * A denial is not a failure and nothing branches on the result: ads still
 * serve, non-personalised, at a lower rate. The system asks once per install
 * and answers from its own record afterwards, so this needs no guard of its
 * own.
 *
 * The platform check is ours now rather than the package's. ATT is an iOS
 * concept — the package answers "granted" on Android without asking anything —
 * and calling a native method that only exists on one platform is not something
 * to leave to a `null` check that happens to be true.
 *
 * One constraint worth remembering if this ever moves: iOS silently drops the
 * prompt unless the app is active. It is called from `Root`'s launch effect,
 * which is well inside that window.
 */
async function requestTracking(): Promise<void> {
  if (Platform.OS !== 'ios' || !tracking) return;

  try {
    await tracking.requestPermissionsAsync();
  } catch {
    // Same trade as the consent failure above. No answer means no IDFA, which
    // is the outcome a denial produces anyway.
  }
}

/**
 * Pretends this device is in the EEA, so the consent form can be seen.
 *
 * **The European path is the one nobody here can reach.** Whether a form is
 * needed is Google's decision, made server-side from the request's IP, so
 * outside the EEA `gatherConsent` returns `NOT_REQUIRED` and shows nothing —
 * and the sequence this file is arranged around (form first, then Apple's
 * tracking prompt, then the SDK) never actually executes during development.
 * The first person to run it would be a real player in Berlin.
 *
 * Set `EXPO_PUBLIC_ADS_DEBUG_EEA=1` and relaunch to run it here instead.
 *
 * **`__DEV__` as well as the variable, and both are required.** `EXPO_PUBLIC_`
 * names are inlined into the bundle at build time, so one left set in a shell
 * — or in a CI job — would otherwise ship a store build that shows every player
 * on earth a GDPR form. `__DEV__` is false in any release bundle, which makes
 * that impossible rather than unlikely.
 *
 * Simulators and emulators are automatically test devices, so no device id is
 * needed. On a physical device the SDK logs the id to add to
 * `testDeviceIdentifiers`; it is not wired up here because the simulator is
 * where this gets looked at.
 *
 * The answer is remembered — a second launch returns `OBTAINED` and the form
 * stays away, which is correct behavior and looks like the flag has stopped
 * working. Delete the app and reinstall to see it again.
 */
const debugEea = __DEV__ && process.env.EXPO_PUBLIC_ADS_DEBUG_EEA === '1';

/**
 * Ask UMP whether this player needs a form, and show it if so.
 *
 * `gatherConsent` handles the whole flow — checking the region, fetching the
 * form, showing it only when required — so there is no branching to get wrong
 * here. It resolves with the status either way.
 */
async function gatherConsent(): Promise<void> {
  // `reset()` under the debug flag, because the answer is remembered and the
  // second launch is otherwise indistinguishable from the flag not working:
  // UMP returns `OBTAINED` and shows nothing, exactly as `NOT_REQUIRED` does.
  // Only ever called here — resetting a real player's consent would re-ask a
  // question they have already answered.
  //
  // **Leaving the flag on stops ads loading, and that is the SDK behaving
  // correctly.** Reset plus a forced EEA geography plus no published form is a
  // player who must consent and cannot, so `canRequestAds` goes false and
  // nothing serves — including test ads. Turn the flag off before testing
  // anything else about ads, or the first symptom is "no ad available" on a
  // screen with nothing wrong with it.
  if (debugEea) AdsConsent.reset();

  const consent = await AdsConsent.gatherConsent(
    debugEea ? { debugGeography: AdsConsentDebugGeography.EEA } : undefined
  );

  // `canRequestAds` is the one to read, not `status`. It is the SDK's own
  // answer to "may I serve anything at all", and it goes false whenever consent
  // is required and has not been obtained — which is what an unpublished form
  // produces: no ads whatsoever, not degraded ones.

  // Nothing to act on. The status is read rather than ignored so the intent is
  // legible: consent decides whether requests may be personalised, and the SDK
  // reads that state itself from the same store UMP wrote it to.
  if (consent.status === AdsConsentStatus.REQUIRED) {
    await AdsConsent.showForm();
  }
}

/**
 * Whether this player is owed a standing way back to their consent choice.
 *
 * **Google's own consent message tells them one exists.** Its body reads "Look
 * for a link or button in the app menu to manage or withdraw consent in privacy
 * and cookie settings" — text this project does not write and cannot edit. A
 * build with no such button publishes a dialog that sends European players
 * looking for something that is not there.
 *
 * The US states message is the other half and is stricter about it: CCPA/CPRA
 * expect a "Do Not Sell or Share My Personal Information" path that stays
 * reachable, not a choice offered once on first launch and never again. The
 * AdMob console will not even let that message's entry point be configured —
 * it answers "You need to implement a privacy options entry point in your app",
 * because there is nothing to configure on their side.
 *
 * **The status decides whether the row appears at all**, rather than the app
 * guessing from a region it has no business knowing. UMP answers `REQUIRED`
 * only where a form is genuinely owed, so a player in Karachi or Chicago sees
 * one fewer row in a settings drawer that is already long, and nobody who is
 * owed the choice is denied it.
 *
 * Answers `false` on any failure. A missing row is a smaller wrong than a row
 * that opens nothing, and this is called while a screen is being built.
 */
export async function privacyOptionsRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus ===
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch {
    return false;
  }
}

/**
 * Reopen Google's own privacy options form.
 *
 * Deliberately not `AdsConsent.reset()` followed by a fresh gather, which is
 * the tempting shape and the wrong one: reset discards the decision before
 * asking again, so a player who opens this out of curiosity and backs out has
 * silently had their consent revoked. `showPrivacyOptionsForm` opens the form
 * seeded with what they chose last time and leaves it alone unless they change
 * it.
 *
 * Throws nothing. The form failing to open is not something a player can act
 * on, and there is no second mechanism to fall back to.
 */
export async function showPrivacyOptions(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch (error) {
    if (__DEV__) console.warn('[ads] privacy options form failed', error);
  }
}
