/**
 * Poppins family names (spec §3).
 *
 * The names live in the theme, not in the UI, because the type presets in
 * `typography.ts` need them and the theme must not depend on a screen module.
 * Loading the faces is a UI concern and stays in `src/ui/fonts.ts`.
 */
export const POPPINS = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;
