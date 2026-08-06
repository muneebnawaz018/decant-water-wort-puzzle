import { StyleSheet } from 'react-native';

import { apothecary, GRADIENT_BORDER_FILL, SPACE } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
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
  primaryShadow: {
    borderRadius: SPACE.buttonRadius,
    shadowColor: ui.shadow,
    shadowOpacity: 0.32,
    shadowRadius: s(18),
    shadowOffset: { width: 0, height: s(8) },
    elevation: 8,
  },
  face: {
    borderRadius: SPACE.buttonRadius,
    overflow: 'hidden',
    borderWidth: 1,
  },
  // The border fill goes on the variants, not on `face`, because the two run
  // different gradients — one purple, one green. A single fill would close the
  // Android ring on one and paint a purple halo inside the other.
  neutralFace: {
    borderColor: apothecary.line,
    backgroundColor: GRADIENT_BORDER_FILL,
    paddingVertical: s(14),
    paddingHorizontal: s(16),
  },
  primaryFace: {
    borderColor: ui.buttonEdge,
    backgroundColor: colours.green,
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
  dialogFace: {
    paddingVertical: s(13),
    paddingHorizontal: s(18),
    borderRadius: s(12),
  },
  compactFace: {
    paddingVertical: s(9),
    paddingHorizontal: s(14),
    borderRadius: s(11),
  },
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
    color: colours.white,
    textShadowColor: ui.buttonTextShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

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
    backgroundColor: ui.line,
  },
  ghostLabel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(14),
    color: apothecary.ink,
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

  disabled: { opacity: 0.42 },
});
