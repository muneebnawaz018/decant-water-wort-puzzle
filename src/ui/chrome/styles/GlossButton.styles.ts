import { StyleSheet } from 'react-native';

import { apothecary, HAIRLINE, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  shadow: {
    borderRadius: SPACE.buttonRadius,
    shadowColor: ui.shadow,
    shadowOpacity: 0.3,
    shadowRadius: s(16),
    shadowOffset: { width: 0, height: s(7) },
    elevation: 6,
  },
  /**
   * A gold glow, not a black shadow.
   *
   * On a dark ground a black shadow under a lit button only darkens the purple
   * beneath it, so the button sits in a hole and the whole screen reads flat.
   * Spilling the button's own colour instead makes it the light source, which
   * is most of what "glossy" means here.
   */
  primaryShadow: {
    borderRadius: SPACE.buttonRadius,
    shadowColor: ui.buttonGlow,
    shadowOpacity: 0.45,
    shadowRadius: s(18),
    shadowOffset: { width: 0, height: s(6) },
    elevation: 8,
  },
  /**
   * The stroke. A padded background, not a `borderWidth` — see `HAIRLINE`.
   *
   * Its colour is per variant because the two faces are different colours: the
   * neutral one edges a purple panel, the primary a gold one. One stroke colour
   * would ring the other in the wrong hue.
   */
  face: {
    borderRadius: SPACE.buttonRadius,
    padding: HAIRLINE,
    overflow: 'hidden',
  },
  neutralStroke: { backgroundColor: ui.edge },
  primaryStroke: { backgroundColor: ui.buttonEdgeOpaque },

  /** The gradient inside the stroke. Radius steps in by the stroke's width. */
  fill: { borderRadius: SPACE.buttonRadius - HAIRLINE },
  neutralFill: {
    paddingVertical: s(14),
    paddingHorizontal: s(16),
  },
  primaryFill: {
    paddingVertical: s(18),
    paddingHorizontal: s(20),
  },
  /**
   * Between the full face and the compact one.
   *
   * The primary face is 18pt of padding around an 18pt label, roughly 60dp
   * tall. That is Home's Play button — the one thing on the screen you are
   * meant to press — and a dialog that inherited it made its own dismissal the
   * largest element on screen. Compact was the other extreme: at 34dp a
   * "Close" reads as an afterthought and sits under the 44pt tap target.
   *
   * This lands at about 47dp: clearly secondary to a Play button, clearly a
   * real button.
   */
  dialogFace: { borderRadius: s(12) },
  dialogFill: {
    paddingVertical: s(13),
    paddingHorizontal: s(18),
    borderRadius: s(12) - HAIRLINE,
  },
  compactFace: { borderRadius: s(11) },
  compactFill: {
    paddingVertical: s(9),
    paddingHorizontal: s(14),
    borderRadius: s(11) - HAIRLINE,
  },
  /**
   * The top half of the face, clipped by its `overflow: 'hidden'` and radius.
   *
   * Height rather than a gradient stop. This was a full-height layer with
   * `locations={[0, 0.5, 0.52]}`, which iOS drew as a bright top half and
   * Android drew across the whole button — a gold face came out tan and its
   * dark label read as grey. A box that stops halfway cannot be interpreted
   * two ways.
   */
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: ui.buttonGloss,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
  },

  label: {
    fontFamily: POPPINS.medium,
    fontSize: s(15),
    color: apothecary.ink,
  },
  primaryLabel: {
    fontFamily: POPPINS.bold,
    fontSize: s(18),
    letterSpacing: s(0.9),
    // Dark ink, because the face is now light. White on gold fails contrast
    // outright — it measured 1.7:1 against the middle stop.
    color: ui.onGold,
    textShadowColor: ui.buttonTextShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  // Muted ink on the panel surface. The lit face takes dark ink, which is
  // unreadable the moment the face stops being bright.
  primaryLabelOff: { color: ui.buttonLabelOff, textShadowColor: 'transparent' },

  dialogLabel: { fontSize: s(15), letterSpacing: s(0.2) },
  compactLabel: { fontSize: s(12.5), letterSpacing: s(0.2) },

  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    paddingVertical: s(12),
    paddingHorizontal: s(16),
    borderRadius: s(13),
    // Clips the tap burst to the button's shape. The lit variants get this from
    // `face`; the ghost has no face to inherit it from.
    overflow: 'hidden',
    /**
     * A wash, not a slab.
     *
     * `ui.line` is the hairline colour and it is nearly opaque, so a pair of
     * ghosts under a gold primary read as two grey blocks — heavier than the
     * button they are secondary to, and the only cool-grey surfaces in a warm
     * gold-on-purple screen. `ui.ghost` is half the alpha, so the panel below
     * shows through and the button reads as a tint on the card.
     */
    backgroundColor: ui.ghost,
  },
  ghostLabel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(14),
    // Gold, matching the icon beside it and the primary above. Plain ink made
    // a ghost look disabled next to a lit button.
    color: apothecary.goldLight,
  },
  /**
   * Ghost at the smaller sizes. These exist so the two buttons in a dialog
   * match: the primary shrinks and a ghost that ignored the size would sit
   * visibly taller beside it.
   *
   * Each is a point over its primary counterpart because the ghost carries no
   * shadow — without that, the flat one reads as the smaller of the pair.
   */
  dialogGhost: { paddingVertical: s(14), paddingHorizontal: s(18) },
  compactGhost: { paddingVertical: s(10), paddingHorizontal: s(14) },
  smallGhostLabel: { fontSize: s(12.5) },

  /**
   * Dimmed, and unlit with it.
   *
   * `opacity` alone was not enough on Android. It fades a view's own pixels but
   * not its `elevation` — the platform composites that shadow separately — so a
   * disabled gold button kept a full-strength glow behind a 42% face and came
   * out brighter than the same button on iOS, where `shadowOpacity` fades with
   * everything else. The countdown on Daily was the visible case: gold on
   * Android, brown on iOS, from one style.
   *
   * Zeroing both shadow properties makes the two platforms agree, and it is
   * also just right: a control that cannot be pressed should not still be
   * throwing light.
   */
  disabled: { opacity: 0.42, elevation: 0, shadowOpacity: 0 },
  /**
   * For the primary variant, which does not fade at all — it swaps to an opaque
   * off ramp instead, so both platforms draw the same pixels. All this has to
   * do is stop the glow.
   */
  unlit: { elevation: 0, shadowOpacity: 0 },
});
