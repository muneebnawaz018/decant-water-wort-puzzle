import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
export const styles = StyleSheet.create({
  shadow: {
    borderRadius: SPACE.buttonRadius,
    shadowColor: ui.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  primaryShadow: {
    borderRadius: SPACE.buttonRadius,
    shadowColor: ui.shadow,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  face: {
    borderRadius: SPACE.buttonRadius,
    overflow: 'hidden',
    borderWidth: 1,
  },
  neutralFace: {
    borderColor: apothecary.line,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryFace: {
    borderColor: ui.buttonEdge,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  compactFace: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 11 },
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
    gap: 10,
  },

  label: { fontFamily: POPPINS.medium, fontSize: 15, color: apothecary.ink },
  primaryLabel: {
    fontFamily: POPPINS.bold,
    fontSize: 18,
    letterSpacing: 0.9,
    color: colours.white,
    textShadowColor: ui.buttonTextShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  compactLabel: { fontSize: 12.5, letterSpacing: 0.2 },

  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: ui.line,
  },
  ghostLabel: {
    fontFamily: POPPINS.semibold,
    fontSize: 14,
    color: apothecary.ink,
  },

  disabled: { opacity: 0.42 },
});
