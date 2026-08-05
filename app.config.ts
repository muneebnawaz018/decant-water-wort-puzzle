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
  userInterfaceStyle: 'light',
  // The colour behind every React view, and — the reason it is here — the one
  // the window shows in the gap between the OS dismissing the splash and the
  // first React frame being drawn. It defaults to white, which flashed for a
  // frame on every launch against this near-black app.
  backgroundColor: colours.nightDeep,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.decant.watersort',
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
    'expo-audio',
    'expo-asset',
    'expo-font',
    'expo-system-ui',
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
