import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/**
 * Fixed chrome above and below the board; the board gets what is left.
 *
 * These scale with the controls they contain — the HUD holds a 21pt level
 * number and the control bar holds 50dp round buttons, both of which grow on a
 * tablet. Left at phone heights they would have clipped.
 */
export const HUD_HEIGHT = s(64);
export const CONTROLS_HEIGHT = s(86);
export const SIDE_PADDING = s(20);

export const styles = StyleSheet.create({
  // Transparent: the shared backdrop in Root shows through.
  root: { flex: 1 },
  hud: {
    height: HUD_HEIGHT,
    paddingHorizontal: SPACE.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  boardSlot: { marginHorizontal: SIDE_PADDING },
  hudMiddle: { flex: 1, alignItems: 'center' },
  hudLevel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(21),
    color: apothecary.ink,
  },
  hudMoves: {
    fontFamily: POPPINS.semibold,
    fontSize: s(12),
    letterSpacing: s(0.5),
    color: apothecary.inkMuted,
  },
  controls: {
    height: CONTROLS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(16),
  },
});
