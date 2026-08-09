import { StyleSheet } from 'react-native';

import { apothecary, HAIRLINE, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
/**
 * Half a dialog button's drawn height, so both variants come out as pills.
 *
 * A constant rather than a literal in three places: the ghost variant is a
 * separate branch in `GlossButton` and shares none of the lit face's styles, so
 * a hand-written radius there drifts the moment this one is changed.
 */
const DIALOG_RADIUS = s(21);

export const styles = StyleSheet.create({
  shadow: {
    borderRadius: SPACE.buttonRadius,
    boxShadow: [{ offsetX: 0, offsetY: s(7), blurRadius: s(16), color: ui.shadowSoft }],
  },
  /**
   * A gold glow, not a black shadow.
   *
   * On a dark ground a black shadow under a lit button only darkens the purple
   * beneath it, so the button sits in a hole and the whole screen reads flat.
   * Spilling the button's own colour instead makes it the light source, which
   * is most of what "glossy" means here.
   *
   * **`boxShadow`, not `shadow*` plus `elevation`.** That pairing draws this on
   * iOS and cannot draw it on Android: `elevation` renders a system shadow the
   * platform colours itself, so the gold was simply missing there and a lit
   * button sat flat against the purple — the one place the effect matters most.
   * `boxShadow` is honoured by both under the new architecture, from one
   * declaration. Its alpha comes from the colour, since `shadowOpacity` is
   * iOS-only and would reintroduce the same split.
   *
   * **No offset, unlike the neutral shadow above.** A drop shadow is cast by a
   * light somewhere else and belongs below the thing casting it; a glow is the
   * object emitting, and light leaves it in every direction equally. Offset by
   * 6 it read as a gold shadow pooling under the button rather than the button
   * being lit. The spread makes up the reach the offset was providing.
   */
  primaryShadow: {
    borderRadius: SPACE.buttonRadius,
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
   * This lands at about 40dp drawn. Under the 44pt minimum tap target, which
   * is why `GlossButton` gives the smaller sizes a `hitSlop` — the touch area
   * stays over the minimum while the face reads as secondary to a Play button.
   * Shrink the face further and the slop has to grow with it.
   *
   * `paddingHorizontal` sets no width here. Both dialog callers size the button
   * from outside — `flex: 1` for a pair, a `minWidth` floor for a lone one — so
   * it only decides the room a label longer than that floor gets, and editing
   * it looks like nothing happening. Width lives in `Overlays.styles.ts`.
   *
   * **Fully rounded, not a soft rectangle.** At 40dp tall a radius of half that
   * is a pill, which is what every other small control in this app already is —
   * the coin pill, the nav bar, the round board buttons. At 12 these were the
   * only squared-off things on screen and read as a different design system
   * wandering into the card.
   */
  dialogFace: { borderRadius: DIALOG_RADIUS },
  dialogFill: {
    paddingVertical: s(10),
    paddingHorizontal: s(16),
    borderRadius: DIALOG_RADIUS - HAIRLINE,
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

  /**
   * `includeFontPadding: false` on every label, and it is not cosmetic.
   *
   * Android pads a Text by the font's own ascent and descent metrics, which
   * Poppins declares asymmetrically — the extra sits mostly above the glyphs,
   * so a label centred by flexbox draws visibly low on Android and correctly on
   * iOS, from one stylesheet. Turning it off measures the glyphs instead.
   *
   * `textAlign: 'center'` covers the other half: `letterSpacing` is applied
   * after the last character too, so a left-aligned label carries one trailing
   * space's worth of dead width and sits off-centre by half of it.
   */
  label: {
    fontFamily: POPPINS.medium,
    fontSize: s(15),
    color: apothecary.ink,
    includeFontPadding: false,
    textAlign: 'center',
  },
  primaryLabel: {
    fontFamily: POPPINS.bold,
    fontSize: s(18),
    letterSpacing: s(0.9),
    includeFontPadding: false,
    textAlign: 'center',
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

  dialogLabel: { fontSize: s(13.5), letterSpacing: s(0.2) },
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
    includeFontPadding: false,
    textAlign: 'center',
  },
  /**
   * Ghost at the smaller sizes. These exist so the two buttons in a dialog
   * match: the primary shrinks and a ghost that ignored the size would sit
   * visibly taller beside it.
   *
   * Each is a point over its primary counterpart because the ghost carries no
   * shadow — without that, the flat one reads as the smaller of the pair.
   */
  dialogGhost: {
    paddingVertical: s(11),
    paddingHorizontal: s(16),
    borderRadius: DIALOG_RADIUS,
    /**
     * Tighter than the 8 the larger ghosts use.
     *
     * A trailing glyph belongs to the label, and at dialog size 8dp let it
     * drift into no-man's-land between the words and the button's own edge —
     * it read as a second element sharing the button rather than as part of
     * the phrase. The label's own trailing letter-space adds to the gap too,
     * so the drawn distance is always a little more than the number here.
     */
    gap: s(5),
  },
  dialogGhostLabel: { fontSize: s(13.5) },
  compactGhost: { paddingVertical: s(10), paddingHorizontal: s(14) },
  smallGhostLabel: { fontSize: s(12.5) },

  /**
   * Dimmed, and unlit with it.
   *
   * `opacity` alone was not enough on Android. It fades a view's own pixels but
   * not its `elevation` — the platform composited that shadow separately — so a
   * disabled gold button kept a full-strength glow behind a 42% face and came
   * out brighter than the same button on iOS, where `shadowOpacity` fades with
   * everything else. The countdown on Daily was the visible case: gold on
   * Android, brown on iOS, from one style.
   *
   * Dropping the shadow outright still says the right thing — a control that
   * cannot be pressed should not throw light — and now says it once. `boxShadow`
   * is a normal style property on both platforms, so an empty list clears it
   * everywhere, where the old form needed one override per platform.
   */
  disabled: { opacity: 0.42, boxShadow: [] },
  /**
   * For the primary variant, which does not fade at all — it swaps to an opaque
   * off ramp instead, so both platforms draw the same pixels. All this has to
   * do is stop the glow.
   */
  unlit: { boxShadow: [] },
});
