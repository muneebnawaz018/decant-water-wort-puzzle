import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s, v } from '@/theme/scale';

/** Spec §4.2: the shelf is narrower than the screen, and the vials sit on it. */
const SHELF_WIDTH = s(214);
export const SHELF_HEIGHT = s(11);

/**
 * The vials sit *inside* the shelf's width, not over it — the prototype draws
 * a 206px shelf under three 42px vials, so the shelf reads as furniture the
 * rack stands on rather than a bar stuck to their feet.
 */
export const VIAL_WIDTH = s(176);

/**
 * The rack's height: `v()`, not `s()`.
 *
 * Not flexed. Given `flex: 1` it swallowed every spare pixel on the screen,
 * which pushed the wordmark and the cards down and left a dead band above the
 * vials. The prototype gives the rack its natural height and lets the *column*
 * centre in whatever is left, so the space above and below the lockup matches.
 * `AmbientVials` also takes its height as a number, since Skia draws to a sized
 * surface — there is no flexed height to hand it.
 *
 * Fixed at 150 it was the single biggest reason Home overflowed a short phone:
 * the column is a fixed budget end to end — top bar, rack, wordmark, tagline,
 * two cards, Play, the nav slot — and the rack is a quarter of it. It is also
 * the right block to give up, being the only decorative one. Everything else is
 * a control or type that cannot shrink without becoming unusable.
 */
export const RACK_HEIGHT = v(150);

export const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: v(20) },

  vialArea: { height: RACK_HEIGHT, alignItems: 'center' },
  vialBox: { width: VIAL_WIDTH, height: RACK_HEIGHT - SHELF_HEIGHT },

  shelf: {
    width: SHELF_WIDTH,
    height: SHELF_HEIGHT,
    borderRadius: s(6),
    shadowColor: ui.shadow,
    shadowOpacity: 0.4,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  shelfGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderRadius: s(6),
    backgroundColor: ui.buttonGloss,
  },

  title: { alignItems: 'center', gap: v(6) },
  tagline: {
    fontFamily: POPPINS.regular,
    fontSize: s(13),
    letterSpacing: s(0.4),
    color: apothecary.inkMuted,
  },
});
