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
 * How far the bump's center sits above the bar's top edge.
 *
 * Exported because a screen clearing the bar has to clear this too — the raised
 * button is the tallest part of the chrome, and a tail sized to the bar alone
 * lets the last card slide under it.
 *
 * **Lowering the disc is limited by the "Home" label, not by taste.** The notch
 * follows the disc down, and its lowest point is `NOTCH_CENTER_Y + NOTCH_RADIUS`
 * — a hole in the bar's face. The label sits about 22 above the bar's bottom
 * edge, so once the bite reaches that far the word is rendered over background
 * rather than over the bar. At the current disc size the bite bottoms out at 41
 * of the bar's 66, which leaves the label clear. Take the rise much below this
 * and `BUMP_SIZE` has to come down with it.
 */
export const BUMP_RISE = s(19);

/**
 * Where the notch's center sits relative to the bar's top edge, positive down.
 *
 * Derived, never typed in. The disc and the bite have to stay concentric or the
 * ring of background between them stops being even — and the disc's center is
 * fixed by the rise, so the notch has to follow it. At the original rise of
 * `BUMP_SIZE / 2` this was exactly zero, which is why the bar was drawn with a
 * hardcoded `0` and why lowering the disc on its own would have thinned the gap
 * under it while leaving the sides alone.
 */
export const NOTCH_CENTER_Y = BUMP_SIZE / 2 - BUMP_RISE;

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

/** The unread dot. Small enough to be a mark, not a badge with a number in it. */
const NOTICE_SIZE = s(11);

/**
 * The halo the dot pushes out.
 *
 * Twice the mark, which is as far as it can go before it reaches the icon's own
 * edge and starts reading as a second shape rather than as the dot's echo.
 */
const NOTICE_HALO = NOTICE_SIZE * 2.6;

/**
 * How far the mark sits outside the icon slot's top-right corner.
 *
 * Clear of it, not on it. Hung inside, the dot sat on the active tab's gold
 * chip and the two rounded shapes read as one badge with a bite out of it —
 * and the chip is the "you are here" mark, so anything overlapping it is
 * competing with the thing it is drawn over.
 */
const NOTICE_NUDGE = s(5);

/**
 * The halo's scale at the start of a pulse: exactly the dot's size.
 *
 * Exported because the animation needs it and the ratio is a fact about the two
 * boxes, not a number to pick. Start it any smaller and the ring spends the
 * bright half of its life hidden behind the mark it is supposed to be leaving.
 */
export const NOTICE_HALO_START = NOTICE_SIZE / NOTICE_HALO;

/**
 * Where the mark's center sits, measured from the tab's own center line.
 *
 * Half the 40dp icon slot puts it on the slot's right edge; the nudge carries
 * it clear. One number for both layers, so the ring cannot drift off the dot.
 */
const NOTICE_CENTER_X = s(40) / 2 - NOTICE_SIZE / 2 + NOTICE_NUDGE;

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
  // A slot behind the icon rather than a tint on it: at 24dp a color shift
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

  /**
   * The unread dot, hung on the icon's top-right corner.
   *
   * A sibling of the icon slot rather than a child of it. `iconSlot` clips to
   * its own radius — Android needs that or it drops the descendant's rounding
   * inside a hardware layer — so a dot placed inside would have its outer half
   * cut off by the very clip that exists for the active tab's chip.
   *
   * **`marginLeft` with no `left`, which is the part worth knowing.** An
   * absolutely positioned child with neither edge set is laid out where its
   * parent's alignment would have put it — centered here — and the margin then
   * nudges it from there. So this is an offset from the tab's center line, not
   * from its left edge: half the 40dp slot, less the dot's own radius, lands it
   * on the icon's corner. Anchoring to the tab instead would put it a fifth of
   * the bar's width away, which is nowhere near the icon it is flagging.
   */
  notice: {
    position: 'absolute',
    top: -NOTICE_NUDGE,
    /*
      `left: '50%'` and pull back half the width — the same form the Home bump
      uses, and it is the only one that places these predictably.

      A bare `marginLeft` on an absolutely positioned child does *not* offset it
      by that amount here. With no `left`, the child is laid out where the
      parent's `alignItems: 'center'` puts it, and centering happens inside the
      box the margin has already eaten — so a margin of N moves the center by
      N/2, and by a different amount for each layer because the dot and the halo
      are different widths. That is what left the ring sitting up and to the
      left of the mark instead of around it.
    */
    left: '50%',
    marginLeft: NOTICE_CENTER_X - NOTICE_SIZE / 2,
    width: NOTICE_SIZE,
    height: NOTICE_SIZE,
    borderRadius: NOTICE_SIZE / 2,
    backgroundColor: ui.notice,
    // The bar's own face, so the dot reads as floating above the tab instead of
    // painted onto the icon it is flagging.
    borderWidth: s(2),
    borderColor: ui.noticeRing,
  },

  /**
   * The pulse: a ring of the dot's own color expanding out of it and fading.
   *
   * A sibling of the dot, not a child of it. Android clips a view that grows
   * past its parent's bounds once the parent has a background and a radius —
   * the same clip `wrap` documents for the Home bump — so a halo nested inside
   * the mark would have its outer half cut off exactly as it became visible.
   *
   * Both are absolutely positioned off the tab's center line and offset the
   * same way, which is what keeps them concentric: the halo's own extra radius
   * is pulled back from the dot's offset rather than stated as a second number.
   */
  noticeHalo: {
    position: 'absolute',
    // Concentric with the dot: both are placed from the same center, each
    // pulling back its own half-width. See `notice` for why `left` is required.
    top: -NOTICE_NUDGE + NOTICE_SIZE / 2 - NOTICE_HALO / 2,
    left: '50%',
    marginLeft: NOTICE_CENTER_X - NOTICE_HALO / 2,
    width: NOTICE_HALO,
    height: NOTICE_HALO,
    borderRadius: NOTICE_HALO / 2,
    backgroundColor: ui.notice,
  },
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
   * Centered by `left: '50%'` and a half-width pull rather than by stretching
   * across the bar, so it stays on the notch's center line whatever the bar
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
