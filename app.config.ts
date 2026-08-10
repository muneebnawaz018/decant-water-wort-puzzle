import type { ExpoConfig } from 'expo/config';

import { colours } from './src/theme/colors.ts';
import { VIAL_HEIGHT } from './src/theme/splash.ts';

/**
 * Expo config as TypeScript, not `app.json`.
 *
 * The reason is the palette rule: a static JSON file cannot import anything, so
 * every colour baked into the native shell — splash background, adaptive icon —
 * had to be a second copy of a hex that already exists in `src/theme/colors.ts`.
 * The adaptive icon was still carrying Expo's default pale blue against a
 * near-black app, which is exactly the drift the rule exists to stop.
 *
 * `colors.ts` is pure TypeScript with no React Native imports, so Expo's config
 * loader can read it directly. Keep it that way — an `import` of anything
 * native here breaks `expo prebuild` and every EAS build with it.
 */
const config: ExpoConfig = {
  name: 'Decant',
  description: 'Decant: Water Sort Puzzle',
  slug: 'decant',
  version: '1.0.0',
  orientation: 'portrait',
  // Phone only. Web was tried and dropped: MMKV, Skia and the worklet runtime
  // each need their own browser shim, which makes a second rendering path to
  // keep honest for a target the game does not ship on.
  platforms: ['ios', 'android'],
  icon: './assets/icon.png',
  // The app is the dark purple theme end to end. This drives the native chrome
  // — iOS keyboard/alert appearance, Android's system UI — and declaring
  // `light` against a near-black app made both fight the design on first
  // launch.
  userInterfaceStyle: 'dark',
  // The colour behind every React view, and — the reason it is here — the one
  // the window shows in the gap between the OS dismissing the splash and the
  // first React frame being drawn. It defaults to white, which flashed for a
  // frame on every launch against this near-black app.
  backgroundColor: colours.nightDeep,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.decant.watersort',
    infoPlist: {
      // `UIStatusBarHidden` is set by the `expo-status-bar` plugin below. This
      // is the half it does not cover: without it iOS asks each view controller
      // what the bar should look like and ignores the plist, so the bar comes
      // back the moment React Native's controller is on screen.
      UIViewControllerBasedStatusBarAppearance: false,
    },
  },
  android: {
    backgroundColor: colours.nightDeep,
    /**
     * The OS's default, made a decision. Auto Backup ships the MMKV file to
     * the player's Google Drive, so a new phone restores their progress —
     * which is the whole promise of a save. iCloud does the same on iOS with
     * nothing to declare.
     *
     * What rides along is the daily-reward record, so restoring an old backup
     * re-opens claimed days. Accepted, the same way winding the device clock
     * forward is: the prize is coins, the coins buy cosmetics, and defending
     * either needs a trusted clock the app does not have. Set here rather
     * than in `AndroidManifest.xml`, which prebuild regenerates.
     */
    allowBackup: true,
    adaptiveIcon: {
      backgroundColor: colours.nightDeep,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.decant.watersort',
  },
  plugins: [
    'expo-dev-client',
    [
      // Hides the status bar from the launch window onward, on both platforms.
      //
      // The runtime `<StatusBar hidden />` in App.tsx only applies once React
      // is drawing, so without this the clock sits over the splash vial for the
      // first second and then vanishes.
      //
      // This replaces the top-level `androidStatusBar` key, which SDK 57
      // deprecated to no effect — it warned on every prebuild and set nothing,
      // so the bar was hidden on iOS and shown on Android's splash. The
      // plugin's two props are all that survived: `translucent` and
      // `barStyle` have no meaning behind a bar that is not drawn.
      'expo-status-bar',
      { hidden: true, style: 'light' },
    ],
    [
      'expo-audio',
      {
        // The plugin defaults to asking for microphone and background audio,
        // because most apps using it record or play behind a lock screen. This
        // one does neither: it plays short pour sounds while it is on screen.
        //
        // Left at the defaults, a puzzle game ships asking for RECORD_AUDIO and
        // NSMicrophoneUsageDescription, which is a store-review question with
        // no good answer and a permission prompt players are right to refuse.
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
    [
      /**
       * AdMob. The plugin writes the App ID into `AndroidManifest.xml` and
       * `Info.plist`, which is the one thing the SDK cannot be told at runtime
       * — it is read before any JavaScript runs, and a missing or mismatched
       * value crashes the app at launch rather than failing an ad request.
       *
       * **From `.env`, and from nowhere else.** No ID is written in this file,
       * not even a test one. They belong to whoever owns the AdMob account,
       * and that changes when the company's account takes over at launch — a
       * handover that should be a `.env` edit, never a commit. Copy
       * `.env.example` to `.env`; it ships with Google's public test IDs
       * already filled in, so a fresh clone builds and serves ads marked
       * "Test Ad" without touching anything.
       *
       * There is deliberately no fallback here. A default written into the
       * config is a second place an ID can come from, and the one time that
       * matters is the one time it is wrong — a release quietly built on test
       * IDs earns nothing and looks fine. Missing `.env` fails the build
       * instead, which is loud, early, and fixable in one command.
       *
       * Ad *unit* IDs are not here: those are read at run time and live in
       * `src/ads/units.ts`.
       */
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID,
        /**
         * Delays SDK start-up until `MobileAds().initialize()` is called.
         *
         * Off by default, meaning the SDK initialises during app launch and
         * does network work on the critical path to the first frame — on the
         * one screen this project spends real effort keeping seamless. It also
         * means the SDK would start before the EU consent form has been
         * answered, which is the wrong order.
         */
        delayAppMeasurementInit: true,
        /**
         * iOS asks for tracking permission through the SDK's own prompt rather
         * than a separate `expo-tracking-transparency` install.
         *
         * The wording matters: Apple rejects generic strings, and a puzzle
         * game asking to "track you" with no reason given is the prompt every
         * player denies.
         */
        userTrackingUsageDescription:
          'This lets Decant show ads that are relevant to you. Rewards work either way.',
      },
    ],
    'expo-asset',
    'expo-font',
    'expo-system-ui',
    [
      // Release-build size. Both of these default to **off** in the Expo
      // Android template, so a release build without this block ships an
      // unminified dex and every resource the project has ever had.
      //
      // They live here rather than in `android/gradle.properties` because
      // `expo prebuild` regenerates that file — an edit there survives until
      // the next config change and then quietly disappears, which is the worst
      // possible failure mode for a build setting.
      'expo-build-properties',
      {
        android: {
          /**
           * R8. Shrinks and obfuscates the dex — the debug APK carries eight
           * dex files totalling ~55MB, and most of that is code no release
           * build reaches.
           *
           * The risk R8 carries is that it strips what only reflection finds,
           * and that fails at runtime rather than at build time. Every native
           * module here ships its own consumer ProGuard rules, so the
           * framework is covered; what is not covered by anyone is this app's
           * own code, and none of it uses reflection. **A release build still
           * has to be played through before it is trusted.**
           */
          enableMinifyInReleaseBuilds: true,

          /**
           * Drops resources nothing references. Safe here in a way it often is
           * not: resources are only reached by name when code does
           * `getIdentifier()`, and this app draws its own icons as Skia paths
           * and has no bitmap art beyond the launcher icons and the splash.
           */
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
    [
      'expo-notifications',
      {
        // The small monochrome glyph Android draws in the status bar. It
        // reuses the adaptive icon's foreground rather than shipping a fifth
        // mark to keep in sync.
        icon: './assets/android-icon-monochrome.png',
        color: colours.gold,
        defaultChannel: 'daily-reward',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        // `imageWidth` is the side of a **square** box the image is fitted
        // into, not the rendered width — expo-splash-screen generates a square
        // imageset (54x54, 108x108, 162x162). A tall vial contained in that box
        // ends up as wide as the box is tall, which rendered it at 19dp against
        // the animated vial's 54 and made the handoff jump.
        //
        // Passing the vial's *height* makes the contained image exactly
        // VIAL_WIDTH x VIAL_HEIGHT, matching the in-app splash.
        imageWidth: VIAL_HEIGHT,
        resizeMode: 'contain',
        // The ground the app itself paints, so the handoff from the native
        // splash to the first frame has nothing to cut between.
        backgroundColor: colours.nightDeep,
      },
    ],
  ],
};

export default config;
