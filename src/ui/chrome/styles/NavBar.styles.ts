import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/** Inset from the screen edge. The bar floats; it is not full-bleed. */
const NAV_MARGIN = s(14);

/**
 * How far `Root` holds the bar above the safe-area bottom edge.
 *
 * Exported because a screen reserving its own space has to add this on top of
 * the bar and the bump — it was a bare `s(10)` in `Root` and a second bare 10 in
 * Home's `navSlot`, two numbers that meant the same thing and could drift.
 */
export const NAV_OFFSET = s(10);

/**
 * The bar is clamped as well as inset. Its tabs are `flex: 1`, so on a tablet
 * an unclamped bar puts four destinations a hand's width apart and the row
 * stops reading as one control.
 */
const NAV_MAX_WIDTH = s(420);

export const NAV_RADIUS = s(22);

/**
 * The bar's own height, without safe-area inset: 12 + 10 padding around a 26
 * icon, a 5 gap and a 13 label line. Screens reserve this much at the bottom so
 * their last card does not hide under it.
 *
 * Scaled as one number rather than as its parts, so a screen's bottom tail
 * cannot drift from the bar it is clearing.
 */
export const NAV_BAR_HEIGHT = s(66);

/**
 * The raised Home button, and the bite taken out of the bar for it.
 *
 * The notch is the larger of the two, so the gold disc sits in a ring of
 * background rather than against the bar's own edge — that gap is what makes it
 * read as floating in front rather than glued on.
 */
const BUMP_SIZE = s(54);

/** The ring of background left visible between the disc and the bar's cut edge. */
const NOTCH_GAP = s(6);

/** Derived, so the ring stays even if the disc is resized. */
export const NOTCH_RADIUS = BUMP_SIZE / 2 + NOTCH_GAP;

/**
 * How far the bump's centre sits above the bar's top edge.
 *
 * Exported because a screen clearing the bar has to clear this too — the raised
 * button is the tallest part of the chrome, and a tail sized to the bar alone
 * lets the last card slide under it.
 *
 * **Lowering the disc is limited by the "Home" label, not by taste.** The notch
 * follows the disc down, and its lowest point is `NOTCH_CENTRE_Y + NOTCH_RADIUS`
 * — a hole in the bar's face. The label sits about 22 above the bar's bottom
 * edge, so once the bite reaches that far the word is rendered over background
 * rather than over the bar. At the current disc size the bite bottoms out at 41
 * of the bar's 66, which leaves the label clear. Take the rise much below this
 * and `BUMP_SIZE` has to come down with it.
 */
export const BUMP_RISE = s(19);

/**
 * Where the notch's centre sits relative to the bar's top edge, positive down.
 *
 * Derived, never typed in. The disc and the bite have to stay concentric or the
 * ring of background between them stops being even — and the disc's centre is
 * fixed by the rise, so the notch has to follow it. At the original rise of
 * `BUMP_SIZE / 2` this was exactly zero, which is why the bar was drawn with a
 * hardcoded `0` and why lowering the disc on its own would have thinned the gap
 * under it while leaving the sides alone.
 */
export const NOTCH_CENTRE_Y = BUMP_SIZE / 2 - BUMP_RISE;

/**
 * The drawn width of the bar, which the Skia face needs as a number.
 *
 * Measured rather than laid out: a `onLayout` pass would leave the face unpainted
 * for a frame every time the bar mounts, and the bar mounts on every navigation
 * between a screen that shows it and one that does not.
 */
export function navBarWidth(windowWidth: number, sideInset = 0): number {
  const available = windowWidth - sideInset - NAV_MARGIN * 2;
  return available < NAV_MAX_WIDTH ? available : NAV_MAX_WIDTH;
}

export const styles = StyleSheet.create({
  /**
   * `overflow: 'visible'` is load-bearing — the bump is absolutely positioned
   * above this box and Android clips a child that leaves its parent's bounds.
   */
  wrap: { alignSelf: 'center', overflow: 'visible' },
  face: { position: 'absolute', top: 0, left: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: NAV_BAR_HEIGHT,
    paddingTop: s(12),
    paddingHorizontal: s(6),
  },
  tab: { flex: 1, alignItems: 'center', gap: s(5) },
  /**
   * The gap the bump sits in. A fixed width rather than a flexed one: the tabs
   * either side must stay the same width as the outer pair, and a flexed spacer
   * would take a fifth share instead of the bump's own footprint.
   *
   * `alignSelf: 'stretch'` is what puts its label on the same baseline as the
   * others. The row aligns its children to `flex-start`, so a spacer sized by
   * its own content is 13dp tall at the top of the bar — which is exactly where
   * the bump is, and the label rendered underneath it, invisible.
   */
  spacer: {
    width: BUMP_SIZE + s(14),
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  spacerLabel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(10),
    color: apothecary.goldLight,
    includeFontPadding: false,
    marginBottom: s(8),
  },
  // A slot behind the icon rather than a tint on it: at 24dp a colour shift
  // alone is easy to miss, and the pill reads as "you are here" at a glance.
  iconSlot: {
    width: s(40),
    height: s(30),
    borderRadius: s(11),
    // Android drops a descendant's radius inside a hardware layer unless the
    // view clips itself; `overflow` makes the clip its own business. On iOS this
    // changes nothing.
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlotActive: { backgroundColor: alpha('gold', 0.16) },
  label: {
    fontFamily: POPPINS.medium,
    fontSize: s(10),
    color: apothecary.inkMuted,
    includeFontPadding: false,
  },
  labelActive: { fontFamily: POPPINS.semibold, color: apothecary.goldLight },

  /**
   * The raised Home button.
   *
   * Centred by `left: '50%'` and a half-width pull rather than by stretching
   * across the bar, so it stays on the notch's centre line whatever the bar
   * measures.
   */
  bump: {
    position: 'absolute',
    left: '50%',
    marginLeft: -BUMP_SIZE / 2,
    top: -BUMP_RISE,
    width: BUMP_SIZE,
    height: BUMP_SIZE,
    borderRadius: BUMP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Gold light, not a black shadow, and no offset — see `GlossButton`'s
    // `primaryShadow` for why a glow has to be radially even.
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 0,
        blurRadius: s(18),
        spreadDistance: s(2),
        color: ui.buttonGlowSoft,
      },
    ],
  },
  /**
   * The disc's face, and the layer the press scale is applied to.
   *
   * **It carries its own radius, and clips.** The round corner used to live
   * only on `bump`, which is the parent and does not scale — so a press shrank
   * this square inside a clip it no longer touched, and the gold disc turned
   * into a gold *square* for the length of the press. The clip has to travel
   * with whatever moves.
   */
  bumpFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BUMP_SIZE / 2,
    overflow: 'hidden',
  },
  /** The 2px inner highlight along the disc's top, the same one buttons carry. */
  bumpGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
});
