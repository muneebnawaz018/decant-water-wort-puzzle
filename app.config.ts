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
      // The runtime `<StatusBar hidden />` in App.tsx only applies once React
      // is drawing. These two hide the bar from the launch screen onward, so
      // the clock does not sit over the splash vial for the first second and
      // then vanish.
      UIStatusBarHidden: true,
      UIViewControllerBasedStatusBarAppearance: false,
    },
  },
  androidStatusBar: {
    // Same reason as the iOS pair above — hidden from the launch window, not
    // only once React mounts.
    hidden: true,
    translucent: true,
    barStyle: 'light-content',
  },
  android: {
    backgroundColor: colours.nightDeep,
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
