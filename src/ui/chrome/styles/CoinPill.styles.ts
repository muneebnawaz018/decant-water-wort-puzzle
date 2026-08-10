import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
/**
 * The coin's diameter. Exported because `Coin` takes its size as a prop, and
 * the pill's own width is computed from it below.
 */
export const COIN_SIZE = s(18);

/**
 * The pill's drawn width, for a header that has to leave room for it.
 *
 * Summed from the parts rather than measured: `ScreenHeader` centres its title
 * absolutely, so it needs this number before layout runs, and an `onLayout`
 * pass would leave the title jumping on the first frame of every screen.
 *
 * The balance's `minWidth` is what makes this a constant at all — without it
 * the pill would be a digit wider at 1000 coins.
 */
export const COIN_PILL_WIDTH = s(2) * 2 + s(6) * 2 + COIN_SIZE + s(6) * 2 + s(28) + s(20);

export const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    borderRadius: s(16),
    // Stroke as a padded background — see `HAIRLINE`. Two points here, not one:
    // the coin pill's gold edge is the one deliberately heavy stroke in the
    // chrome.
    padding: s(2),
    backgroundColor: ui.goldEdgeOpaque,
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  pillFace: {
    flexDirection: 'row',
    alignItems: 'center',
    // 6, not 8. The row holds three things now rather than two, so the gap is
    // paid for twice and the pill grew by more than the button it gained.
    gap: s(6),
    borderRadius: s(16) - s(2),
    // Even both sides now. It was 15 on the right to balance the coin's own
    // 8 — the number was compensating for a disc at one end and nothing at the
    // other, and there is a disc at both ends now.
    paddingHorizontal: s(6),
    paddingVertical: s(5),
    overflow: 'hidden',
  },

  value: {
    fontFamily: POPPINS.bold,
    fontSize: s(14),
    color: apothecary.ink,
    // The balance is the only thing here that changes width, and it changes it
    // by a whole digit. Without this the plus walks left as you earn, and the
    // pill under it jumps by the width of a numeral.
    minWidth: s(28),
    textAlign: 'center',
  },
  /**
   * The shop shortcut: a green disc at the far end of the pill.
   *
   * The same size as the coin, so the pill reads as a balance bracketed by two
   * marks of equal weight rather than as a button with a number stuck to it.
   */
  plus: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the gradient inside the circle — on Android a radius masks a view's
    // own background but not an absolutely positioned child. See
    // `ScreenHeader.styles.ts`.
    overflow: 'hidden',
  },
});
