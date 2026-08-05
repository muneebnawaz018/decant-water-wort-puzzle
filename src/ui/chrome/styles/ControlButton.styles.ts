import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  slot: { alignItems: 'center', gap: s(5), width: s(64) },
  disabled: { opacity: 0.4 },
  button: {
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
    overflow: 'hidden',
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(8),
    shadowOffset: { width: 0, height: s(4) },
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
    fontSize: s(11),
    color: apothecary.inkMuted,
  },
});
