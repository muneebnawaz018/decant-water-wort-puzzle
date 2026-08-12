import { StyleSheet } from 'react-native';

import { HAIRLINE, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { COIN_PILL_WIDTH } from './CoinPill.styles';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    paddingHorizontal: SPACE.screen,
    paddingTop: s(12),
    paddingBottom: s(10),
    /**
     * Above the scrolling body beneath it.
     *
     * The header is the *earlier* sibling of the `ScrollView` in `ScrollPage`,
     * so by default every card on the page paints over anything the header
     * hangs below itself — which is where the coin pill's balance note goes.
     * Nothing else in the header overflows, so this changes no existing screen.
     */
    zIndex: 2,
  },
  /**
   * Centred on the header, not on the space left over beside the buttons.
   *
   * Absolute rather than a flexed middle column: the back button is always
   * there but the trailing slot is empty on Settings and a coin pill on Shop,
   * so a flexed title centres itself somewhere different on each screen. Taken
   * out of the flow it centres on the header, and the two buttons sit over it.
   *
   * The side padding is the button plus the row's gap, so a long title wraps or
   * truncates before it can run under either one.
   */
  titleSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: SPACE.screen + s(42) + s(14),
  },
  title: { ...text.screenTitle, textAlign: 'center' },
  /**
   * The slot for a header with a coin pill at one end and a button at the
   * other: **centred between the two, not on the header.**
   *
   * The two ends are different widths — a 94dp pill against a 42dp square — so
   * the two things that could be called centred are not the same place, and
   * only one of them looks it. Centred on the header, the title sits about 25dp
   * nearer the pill than the button, and every screen with a pill reads as
   * slightly misaligned even though the arithmetic is exact. What the eye
   * checks is the gap either side of the words.
   *
   * **It lands halfway between the two.** Both extremes were tried on a device
   * and both read as off: centred on the header the title crowds the pill,
   * centred in the gap it sits visibly right of everything else on the screen —
   * the grid and cards below are centred on the header, and the title stops
   * agreeing with them. Splitting the difference is not a fudge; it is the only
   * position that answers to both, because the header's own two ends disagree
   * about where the middle is.
   *
   * The right inset is still narrower than the left, which buys back width the
   * symmetric version spent on nothing — that is what lets a two-word title fit
   * on a 360dp phone. A longer one truncates rather than overlapping, via
   * `numberOfLines`.
   */
  titleSlotWide: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingLeft: SPACE.screen + COIN_PILL_WIDTH + s(8),
    paddingRight: SPACE.screen + (COIN_PILL_WIDTH + s(42)) / 2 + s(8),
  },
  /**
   * The back arrow's seat, held open on the screens that have no arrow.
   *
   * The same 42 square, so the header keeps its height and the title's absolute
   * padding — which is written in terms of that button — still describes the
   * space either side of it.
   */
  backSlot: {
    // A floor, not a fixed width: empty it holds the arrow's square open, and
    // with a coin pill in it, it grows to the pill.
    minWidth: s(42),
    height: s(42),
    justifyContent: 'center',
  },
  /** Pushes the trailing slot to the right end, now the title is out of flow. */
  filler: { flex: 1 },
  /**
   * A row, because the slot holds two things now.
   *
   * It was a bare box while the only trailing content was a coin pill. Once the
   * drawer handle joined it the default column direction stacked the pill on top
   * of the button, which grew the header and pushed both over the title.
   */
  trailing: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: s(10) },

  /**
   * The stroke, drawn as a padded background rather than as `borderWidth`.
   *
   * See `HAIRLINE` in `@/theme/apothecary` for why. Short version: on Android a
   * `LinearGradient` inside a bordered view lands a pixel short of the stroke
   * and leaves a sliver of a third colour at the corners.
   */
  button: {
    width: s(42),
    height: s(42),
    borderRadius: s(14),
    padding: HAIRLINE,
    backgroundColor: ui.edge,
    overflow: 'hidden',
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  /**
   * The gradient face, inset by the stroke it sits inside.
   *
   * `overflow: 'hidden'` is what keeps the sheen and the tap burst inside the
   * corners, and its absence is a bug that only shows on Android: a radius
   * masks this view's own background on both platforms, but only iOS extends
   * that mask to absolutely positioned children. The sheen is a square-cornered
   * white wash across the top half, so unclipped it hangs over both top corners
   * as a pale square — brightest at the top edge and gone by the middle, which
   * is exactly what it looked like. `ControlButton` sets this on both of its
   * views; this one was the copy that missed it.
   */
  buttonFace: {
    flex: 1,
    borderRadius: s(14) - HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Half the face, not a gradient stop — Android and iOS disagreed about a
  // three-stop `locations` list and washed the whole surface. See
  // `GlossButton.styles.ts`.
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  // Shadow off with it: Android does not fade `elevation` with `opacity`, so a
  // dimmed button kept a full-strength glow. See `GlossButton.styles.ts`.
  dimmed: { opacity: 0.42, elevation: 0, shadowOpacity: 0 },
});
