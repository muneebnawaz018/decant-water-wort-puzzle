import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';

/** Spec §4.2: the shelf is narrower than the screen, and the vials sit on it. */
export const SHELF_WIDTH = 214;
export const SHELF_HEIGHT = 11;

/**
 * The vials sit *inside* the shelf's width, not over it — the prototype draws
 * a 206px shelf under three 42px vials, so the shelf reads as furniture the
 * rack stands on rather than a bar stuck to their feet.
 */
export const VIAL_WIDTH = 176;

/**
 * The rack's height is fixed rather than flexed.
 *
 * Given `flex: 1` it swallowed every spare pixel on the screen, which pushed
 * the wordmark and the cards down and left a dead band above the vials. The
 * prototype gives the rack its natural height and lets the *column* centre in
 * whatever is left, so the space above and below the whole lockup matches.
 */
export const RACK_HEIGHT = 150;

export const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 20 },

  vialArea: { height: RACK_HEIGHT, alignItems: 'center' },
  vialBox: { width: VIAL_WIDTH, height: RACK_HEIGHT - SHELF_HEIGHT },

  shelf: {
    width: SHELF_WIDTH,
    height: SHELF_HEIGHT,
    borderRadius: 6,
    shadowColor: ui.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  shelfGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderRadius: 6,
    backgroundColor: ui.buttonGloss,
  },

  title: { alignItems: 'center', gap: 6 },
  tagline: {
    fontFamily: POPPINS.regular,
    fontSize: 13,
    letterSpacing: 0.4,
    color: apothecary.inkMuted,
  },
});
