import { StyleSheet } from 'react-native';

import { apothecary, HAIRLINE } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/**
 * A share of the screen, capped.
 *
 * A drawer is read as a drawer because the screen behind it still shows — cover
 * the last strip and it is a page that happens to slide. The cap keeps that true
 * on a tablet, where 84% of an iPad is a full screen by any other name.
 */
const DRAWER_WIDTH_RATIO = 0.84;
const DRAWER_MAX_WIDTH = s(340);

export function drawerWidth(windowWidth: number): number {
  const share = windowWidth * DRAWER_WIDTH_RATIO;
  return share < DRAWER_MAX_WIDTH ? share : DRAWER_MAX_WIDTH;
}

export const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
    backgroundColor: ui.scrim,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 16,
    // Rounded on the leading edge only. A panel rounded on all four corners
    // reads as a card that has drifted to the edge; rounded on one it reads as
    // something pulled out from off-screen.
    borderTopLeftRadius: s(26),
    borderBottomLeftRadius: s(26),
    overflow: 'hidden',
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  /** The hairline down the leading edge, drawn rather than bordered. */
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: HAIRLINE,
    backgroundColor: ui.line,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingHorizontal: s(18),
    paddingBottom: s(12),
  },
  /**
   * Centered between the mark and the close button.
   *
   * `flex: 1` plus `textAlign` rather than absolute positioning: the two
   * flanking controls are within 6dp of each other in width, so the optical
   * center and the true center of the header agree closely enough that taking
   * the title out of flow would buy nothing and cost the truncation behavior.
   */
  name: {
    flex: 1,
    fontFamily: POPPINS.bold,
    fontSize: s(16),
    letterSpacing: s(1.6),
    color: apothecary.goldLight,
    includeFontPadding: false,
    textAlign: 'center',
  },
  close: {
    width: s(34),
    height: s(34),
    borderRadius: s(10),
    backgroundColor: alpha('white', 0.08),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: s(14) },
  version: {
    fontFamily: POPPINS.regular,
    fontSize: s(11),
    color: apothecary.inkMuted,
    textAlign: 'center',
    marginTop: s(6),
  },
});
