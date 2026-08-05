import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
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
  neutralFace: {
    borderColor: apothecary.line,
    paddingVertical: s(14),
    paddingHorizontal: s(16),
  },
  primaryFace: {
    borderColor: ui.buttonEdge,
    paddingVertical: s(18),
    paddingHorizontal: s(20),
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

  disabled: { opacity: 0.42 },
});
