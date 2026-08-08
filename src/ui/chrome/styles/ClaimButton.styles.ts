import { StyleSheet } from 'react-native';

import { apothecary, HAIRLINE, SPACE } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/**
 * The card radius, not the button one.
 *
 * This control now sits inside the reward track as a two-wide tile, so it has
 * to corner like the tiles beside it. At `buttonRadius` it read as a button
 * that had wandered into a grid.
 */
const RADIUS = SPACE.cardRadius;

export const styles = StyleSheet.create({
  /**
   * Passed down every layer of the control when it is filling a slot.
   *
   * All of them, because each is a plain `View` wrapping the next: growing only
   * the outermost leaves the gradient face at its content height inside a
   * full-height shadow, which looks like the border has come away from the fill.
   */
  grow: { flex: 1 },
  /**
   * Waiting throws no light — but it keeps its drop shadow, so it still sits on
   * the page rather than in it. The old version zeroed both and the button
   * looked printed on the background.
   */
  restShadow: {
    borderRadius: RADIUS,
    shadowColor: ui.shadow,
    shadowOpacity: 0.3,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  /** Ready spills gold, the same glow every lit button in the app carries. */
  readyShadow: {
    borderRadius: RADIUS,
    shadowColor: ui.buttonGlow,
    shadowOpacity: 0.45,
    shadowRadius: s(18),
    shadowOffset: { width: 0, height: s(6) },
    elevation: 8,
  },

  // Stroke as a padded background rather than a border — see `HAIRLINE`.
  face: { borderRadius: RADIUS, padding: HAIRLINE, overflow: 'hidden' },
  restEdge: { backgroundColor: alpha('gold', 0.45) },
  readyEdge: { backgroundColor: ui.buttonEdge },

  fill: {
    flex: 1,
    borderRadius: RADIUS - HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(13),
    paddingHorizontal: s(10),
    overflow: 'hidden',
  },

  /**
   * The waiting layout: a mark, then the caption over the clock.
   *
   * A row rather than a centred stack, because the clock has to stay the widest
   * thing in the control and a stack would centre a 36dp mark above it with
   * nothing beside it — which spends the height this control does not have.
   */
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  /**
   * The mark's box.
   *
   * Sized in dp rather than left to flex: `LottieView` measures itself to the
   * composition's own size when its style gives it no resolved width, and this
   * composition is 200×200 — the same trap `useTapBurst.styles` records, where
   * a player inflated a 42dp button to three times its size on Android.
   */
  brew: { width: s(34), height: s(34) },
  /** Left-aligned under the mark, so the caption and the clock share an edge. */
  waitText: { flexShrink: 1 },
  /**
   * The caption, small and above the numbers.
   *
   * Uppercase and tracked, which the inline version could not be: on one line
   * with the clock it read as a tracked caption that had collided with a
   * number. Given its own line it is doing the job captions do everywhere else
   * in this app — the eyebrow over a value.
   */
  waitCaption: {
    fontFamily: POPPINS.bold,
    fontSize: s(9),
    letterSpacing: s(0.8),
    color: alpha('goldLight', 0.65),
    includeFontPadding: false,
    marginBottom: s(1),
  },

  /**
   * The clock, and the claim.
   *
   * The tracking came down as the size went up: 0.8 at 17 was set to give a
   * short label some presence, and at 26 it only pulls a running countdown's
   * digits apart. Tracking is a ratio of the glyph, not a constant.
   */
  /**
   * Down from 26, because the control is no longer the full width of the page.
   *
   * It shares the track's last row with day seven now, so it has two thirds of
   * a row rather than all of it — about 230dp on the narrowest phone. At 26 the
   * two longest strings this ever holds, `Claim 150 coins` and a running
   * `19:39:28`, both ran past that. The ratio to the caption is kept, so the
   * hierarchy the three earlier attempts landed on survives the resize.
   */
  label: {
    fontFamily: POPPINS.bold,
    fontSize: s(21),
    letterSpacing: s(0.2),
  },
  /** Gold on the panel surface: a live clock, not a greyed-out control. */
  restLabel: { color: apothecary.goldLight },
  /** Dark ink on the lit face. White on gold measures 1.7:1. */
  readyLabel: { color: ui.onGold },
});
