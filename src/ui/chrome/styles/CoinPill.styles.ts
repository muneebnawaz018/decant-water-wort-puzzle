import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
export const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: ui.goldEdge,
    paddingLeft: 8,
    paddingRight: 15,
    paddingVertical: 8,
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  coin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  value: {
    fontFamily: POPPINS.bold,
    fontSize: 15,
    color: apothecary.ink,
  },
});
