import * as ExpoSplashScreen from 'expo-splash-screen';

/**
 * The **native** splash — the static image the OS shows before React Native has
 * mounted anything. Not to be confused with `SplashScreen.tsx`, which is the
 * animated vial that plays afterwards, inside the app.
 *
 * `expo-splash-screen` rather than `react-native-bootsplash`: this project is on
 * the prebuild workflow, and Expo's own module is already wired into the SDK's
 * config plugin pipeline. Bootsplash would mean hand-maintaining the same iOS
 * storyboard and Android theme that `expo prebuild` regenerates, and the two
 * would fight over `LaunchScreen.storyboard` on every prebuild.
 *
 * Called at module scope, deliberately: auto-hide fires as soon as the first
 * frame is drawn, and by the time a component's effect runs it has already
 * happened. Missing that window is exactly the flash this exists to prevent.
 */
void ExpoSplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or the module is unavailable (Expo Go). Not worth failing
  // startup over — the app renders either way.
});

ExpoSplashScreen.setOptions({ duration: 260, fade: true });

/**
 * Hand off to the app.
 *
 * Call this only once there is a real frame underneath: hiding while the tree
 * is still blank shows the background colour for a beat, which reads as a
 * stutter rather than a launch.
 */
export function hideNativeSplash(): void {
  void ExpoSplashScreen.hideAsync().catch(() => {
    // Nothing to hide. Harmless.
  });
}
