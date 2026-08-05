import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
export const styles = StyleSheet.create({
  slot: { alignItems: 'center', gap: 5, width: 64 },
  disabled: { opacity: 0.4 },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
    overflow: 'hidden',
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: ui.line,
  },
  label: {
    fontFamily: POPPINS.semibold,
    fontSize: 11,
    color: apothecary.inkMuted,
  },
});
