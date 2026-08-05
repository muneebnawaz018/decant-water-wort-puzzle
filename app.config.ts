import type { ExpoConfig } from 'expo/config';

import { colours } from './src/theme/colors.ts';

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
  platforms: ['ios', 'android'],
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.decant.watersort',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: colours.nightDeep,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.decant.watersort',
  },
  web: {
    favicon: './assets/favicon.png',
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
        imageWidth: 180,
        resizeMode: 'contain',
        // The ground the app itself paints, so the handoff from the native
        // splash to the first frame has nothing to cut between.
        backgroundColor: colours.nightDeep,
      },
    ],
  ],
};

export default config;
