import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    borderRadius: s(16),
    borderWidth: s(2),
    borderColor: ui.goldEdge,
    paddingLeft: s(8),
    paddingRight: s(15),
    paddingVertical: s(8),
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  coin: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    overflow: 'hidden',
  },
  value: {
    fontFamily: POPPINS.bold,
    fontSize: s(15),
    color: apothecary.ink,
  },
});
