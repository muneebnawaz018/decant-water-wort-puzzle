import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Which ad unit each slot asks for.
 *
 * **From the environment, defaulting to Google's test units.** The IDs belong to
 * whoever owns the AdMob account, and that will not always be the account they
 * were first issued from — the company's takes over at launch. Reading them from
 * `.env` means that handover is a file nobody commits rather than an edit to
 * TypeScript, and it keeps one repo working against several accounts.
 *
 * **The default is the important half.** An unset variable falls back to the
 * test unit, so a build made without a `.env` serves test ads instead of firing
 * every request at `undefined`. A missing environment variable is the classic
 * way this pattern ships a broken release; here it ships a harmless one.
 *
 * These are not secrets. Anyone can unzip an APK and read them. They are outside
 * the repo because they are account-specific, not because they are sensitive.
 *
 * The App ID is a different thing and lives in `app.config.ts` — it is written
 * into the native manifest and read before any JavaScript runs.
 */

/**
 * Whether this build may use live units at all.
 *
 * Two conditions, and the second is not redundant. `__DEV__` alone would let a
 * **release APK sideloaded for testing** serve live ads — which is exactly how
 * this project is checked on Android and how the app will be passed around the
 * company before launch. Every one of those impressions is invalid traffic
 * against the account, and invalid traffic is what gets a publisher suspended.
 *
 * So the flag is explicit and defaults to off: a build only goes live when
 * someone sets `EXPO_PUBLIC_ADMOB_LIVE=true` for a release that is genuinely
 * going to a store.
 */
const liveAllowed = !__DEV__ && process.env.EXPO_PUBLIC_ADMOB_LIVE === 'true';

/**
 * The rewarded unit for this platform.
 *
 * **One per platform, never shared.** An AdMob ad unit belongs to a single app
 * entry, and Android and iOS are always two separate entries with two separate
 * App IDs — so a unit minted for the Android app is meaningless to the iOS one.
 * Passing the same string to both is a request AdMob answers with no-fill
 * forever, which looks exactly like poor demand rather than a wiring mistake.
 *
 * `Platform.select` rather than a runtime branch so the unreachable platform's
 * lookup is never evaluated, and so adding a third platform is a compile error
 * rather than a silent fallback.
 */
export function rewardedUnitId(): string {
  if (!liveAllowed) return TestIds.REWARDED;

  const live = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
  });

  return live ?? TestIds.REWARDED;
}

/**
 * The interstitial unit for this platform — doc §8's
 * `interstitial_level_complete`.
 *
 * A **separate unit from the rewarded one**, for the same reason the two
 * platforms are separate: an AdMob unit has a format, and asking for an
 * interstitial against a rewarded unit is answered with no-fill rather than
 * with an error. The two also want reading apart in the console — the rewarded
 * slots are opened by the player and this one is not, so their rates say
 * different things.
 */
export function interstitialUnitId(): string {
  if (!liveAllowed) return TestIds.INTERSTITIAL;

  const live = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
    ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
  });

  return live ?? TestIds.INTERSTITIAL;
}
