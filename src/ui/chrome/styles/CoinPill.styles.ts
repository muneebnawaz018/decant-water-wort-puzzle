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
    // Stroke as a padded background — see `HAIRLINE`. Two points here, not one:
    // the coin pill's gold edge is the one deliberately heavy stroke in the
    // chrome.
    padding: s(2),
    backgroundColor: ui.goldEdgeOpaque,
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  pillFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    borderRadius: s(16) - s(2),
    paddingLeft: s(8),
    paddingRight: s(15),
    paddingVertical: s(8),
    overflow: 'hidden',
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
