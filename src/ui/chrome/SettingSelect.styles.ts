import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

/**
 * The menu's own width.
 *
 * Sized to its contents rather than to the row that opens it — a menu of three
 * one-word options does not need to be as wide as the panel behind it, and a
 * short list in a wide box reads as something that failed to load.
 */
export const MENU_WIDTH = s(148);
/** The note beside an `i`. Wide enough for a sentence over two or three lines. */
export const TIP_WIDTH = s(208);
/** Between the control and the layer it opens. */
export const MENU_GAP = s(6);
/** The closest either layer is allowed to come to a screen edge. */
export const MENU_MARGIN = s(12);

export const styles = StyleSheet.create({
  /**
   * The value, sitting where a switch would.
   *
   * `rowLabel` rather than `body`, because it is the row's second piece of
   * label-weight text and not a sentence about it — matching the switch's
   * optical weight on the rows above and below.
   */
  value: { ...text.rowLabel, color: apothecary.goldLight },

  /**
   * Fills the modal window and takes the press that closes the menu.
   *
   * Untinted on purpose. A scrim would dim the whole drawer to show three
   * options, which reads as a dialog rather than as a menu — and the drawer
   * behind it is the context the choice is being made in.
   */
  backdrop: { flex: 1 },

  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    paddingVertical: s(5),
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.panel,
    // The one place a shadow is warranted: the menu floats over content it is
    // not part of, and without a lift it reads as a panel that grew rather than
    // one laid on top.
    shadowColor: alpha('black', 1),
    shadowOpacity: 0.4,
    shadowRadius: s(18),
    shadowOffset: { width: 0, height: s(8) },
    elevation: 12,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    paddingLeft: s(13),
    paddingRight: s(11),
  },
  /**
   * The name, sized to the word rather than to the row.
   *
   * `flexShrink` and not `flex: 1`, which is the whole difference: a growing
   * label fills the menu and pushes the `i` out to the right edge, where it
   * reads as a second column of the list. Shrink-to-fit leaves the glyph
   * against the last letter, so it belongs to the word it explains.
   *
   * Its own `Pressable` rather than the option itself being one, because the
   * `i` is a second, different action — a button nested in a button gives the
   * outer one the press across most of the area and swallows the inner one at
   * the edges.
   */
  optionPress: { flexShrink: 1, paddingVertical: s(9) },
  /**
   * The rest of the row, and it selects too.
   *
   * Without this the tappable part of an option would be the width of its name
   * — "Easy" is four characters — and the empty space beside it, which looks
   * exactly as pressable, would do nothing. It carries the tick to the right
   * edge on the way.
   */
  optionRest: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: s(9),
  },
  optionLabel: { ...text.body, color: apothecary.ink },
  optionLabelOn: { color: apothecary.goldLight },
  /**
   * A fixed slot at the right edge, whether or not there is a tick to draw.
   *
   * Without it the `i` shifts sideways as the selection moves down the list —
   * every row re-laying out because one glyph appeared somewhere else.
   */
  tick: { width: s(14), alignItems: 'flex-end' },

  /**
   * The note an `i` raises, pinned under it.
   *
   * `pointerEvents` is off on the view itself, so the next press anywhere —
   * including on the note — reaches the backdrop and dismisses it. A tooltip
   * that has to be closed on its own terms is a dialog wearing a smaller box.
   */
  tip: {
    position: 'absolute',
    width: TIP_WIDTH,
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: ui.line,
    backgroundColor: ui.toast,
    shadowColor: alpha('black', 1),
    shadowOpacity: 0.4,
    shadowRadius: s(16),
    shadowOffset: { width: 0, height: s(6) },
    elevation: 14,
  },
  tipText: { ...text.caption, color: apothecary.ink },
});
