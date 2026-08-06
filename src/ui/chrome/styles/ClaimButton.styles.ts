import { StyleSheet } from 'react-native';

import { apothecary, HAIRLINE, SPACE } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

const RADIUS = SPACE.buttonRadius;

export const styles = StyleSheet.create({
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
    paddingVertical: s(14),
    overflow: 'hidden',
  },

  /**
   * The words in front of the time, well under it.
   *
   * Three versions bracket this one. Uppercase at two thirds the size read as a
   * tracked caption that had collided with a clock rather than as a sentence;
   * matching the clock exactly fixed that and cost the hierarchy, since "Next
   * in" and the numbers were then equally loud; one step apart was a difference
   * nobody looking at the screen could name.
   *
   * What makes the small version work where the first attempt did not is that
   * it stayed sentence case and stayed in the same family. Uppercase and
   * tracking are what turned it into a separate object; size alone does not.
   * So the gap is wide enough to be obvious — the numbers are nearly twice the
   * label — and the line still reads as one phrase.
   */
  caption: {
    fontFamily: POPPINS.medium,
    fontSize: s(14),
    letterSpacing: s(0.2),
  },
  restCaption: { color: alpha('goldLight', 0.7) },
  readyCaption: { color: alpha('onGold', 0.75) },

  /**
   * The clock, and the claim.
   *
   * The tracking came down as the size went up: 0.8 at 17 was set to give a
   * short label some presence, and at 26 it only pulls a running countdown's
   * digits apart. Tracking is a ratio of the glyph, not a constant.
   */
  label: {
    fontFamily: POPPINS.bold,
    fontSize: s(26),
    letterSpacing: s(0.2),
  },
  /** Gold on the panel surface: a live clock, not a greyed-out control. */
  restLabel: { color: apothecary.goldLight },
  /** Dark ink on the lit face. White on gold measures 1.7:1. */
  readyLabel: { color: ui.onGold },
});
