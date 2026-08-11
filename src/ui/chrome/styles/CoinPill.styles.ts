import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s, WINDOW_WIDTH } from '@/theme/scale';
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

/**
 * How wide the balance note may run: the screen, less the margin either side.
 *
 * Derived rather than picked. It hangs off the pill's left edge, which sits one
 * screen margin in, so this is simply the room there is — and the note has to
 * stay on **one line**, since a grouped number broken across three of them is
 * harder to read than the abbreviation it was opened to explain.
 *
 * A fixed 200 was the first attempt and wrapped at seventeen characters. There
 * is no number that both fits every balance and looks right on a short one, so
 * the cap is the screen and the box shrinks to whatever the figure needs.
 */
const TIP_WIDTH = WINDOW_WIDTH - SPACE.screen * 2;

export const styles = StyleSheet.create({
  /**
   * The box the balance note hangs off.
   *
   * `alignSelf: 'flex-start'` so it takes the pill's width rather than the
   * header slot's — the note is positioned against the pill's left edge, and a
   * stretched anchor would put it against the screen's.
   */
  anchor: { alignSelf: 'flex-start' },

  /**
   * The full-width slot the note is measured in, invisible and un-tappable.
   *
   * It exists because **an absolutely positioned view is measured against its
   * containing block, and `maxWidth` cannot widen one.** The note used to sit
   * directly on `anchor`, which is pill-width, so the text was laid out in
   * about 150dp and ellipsised at "13,000,000,…" — a `maxWidth` of the whole
   * screen capped nothing, because the available width was already smaller.
   *
   * An explicit `width` here is what hands the bubble inside the room it
   * needs; the bubble is `flex-start`, so it still shrinks to whatever the
   * figure measures rather than becoming a screen-wide slab over a four-digit
   * balance.
   *
   * `top: '100%'` rather than a number: the pill's height is the sum of a
   * gradient face, two paddings and a 2dp stroke, and a hard-coded offset here
   * would be a fourth copy of that arithmetic waiting to fall out of step.
   */
  tipSlot: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: s(8),
    width: TIP_WIDTH,
    zIndex: 40,
  },
  /**
   * Elevation as well as the slot's `zIndex`, because the two platforms order
   * overlapping views differently and this one hangs out of the header over the
   * screen below. `ScreenHeader`'s own `zIndex` is what lifts the whole header
   * above the scrolling body; these only order the note within it.
   */
  tip: {
    alignSelf: 'flex-start',
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: apothecary.line,
    backgroundColor: ui.toast,
    paddingHorizontal: s(14),
    paddingVertical: s(9),
    elevation: 12,
  },
  tipText: {
    fontFamily: POPPINS.medium,
    fontSize: s(13),
    color: colours.white,
  },

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

  /**
   * The readable half — coin and figure — as one press target.
   *
   * It carries the gap that used to sit between the coin and the number on
   * `pillFace`, so the pill's parts and spacing are unchanged and
   * `COIN_PILL_WIDTH` still adds up: two gaps of 6 either way, one inside this
   * and one between it and the plus.
   */
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
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
