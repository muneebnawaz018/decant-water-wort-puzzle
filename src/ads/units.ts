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

export function rewardedUnitId(): string {
  if (!liveAllowed) return TestIds.REWARDED;
  return process.env.EXPO_PUBLIC_ADMOB_REWARDED ?? TestIds.REWARDED;
}
