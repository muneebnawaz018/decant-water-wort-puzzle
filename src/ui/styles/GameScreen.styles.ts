import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { POPPINS } from '@/theme/fonts';

/** Fixed chrome above and below the board; the board gets what is left. */
export const HUD_HEIGHT = 64;
export const CONTROLS_HEIGHT = 86;
export const SIDE_PADDING = 20;

export const styles = StyleSheet.create({
  // Transparent: the shared backdrop in Root shows through.
  root: { flex: 1 },
  hud: {
    height: HUD_HEIGHT,
    paddingHorizontal: SPACE.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boardSlot: { marginHorizontal: SIDE_PADDING },
  hudMiddle: { flex: 1, alignItems: 'center' },
  hudLevel: {
    fontFamily: POPPINS.semibold,
    fontSize: 21,
    color: apothecary.ink,
  },
  hudMoves: {
    fontFamily: POPPINS.semibold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: apothecary.inkMuted,
  },
  controls: {
    height: CONTROLS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});
