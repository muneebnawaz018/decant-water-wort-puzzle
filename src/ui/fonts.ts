import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';

/**
 * Poppins, bundled (spec §3). Loaded from the app package rather than fetched,
 * so the first frame is never a system-font flash that reflows once the real
 * face arrives.
 *
 * The family names themselves live in `@/theme/fonts`; style files import them
 * from there, not from here, so the theme never depends on the UI layer.
 */

export function usePoppins(): boolean {
  const [loaded] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  return loaded;
}
