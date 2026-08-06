import { StyleSheet } from 'react-native';

import { HAIRLINE, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    paddingHorizontal: SPACE.screen,
    paddingTop: s(12),
    paddingBottom: s(10),
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
  /** Pushes the trailing slot to the right end, now the title is out of flow. */
  filler: { flex: 1 },
  trailing: { minWidth: 0 },

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
