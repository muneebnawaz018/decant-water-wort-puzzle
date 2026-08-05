import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';

/**
 * The bar's own height, without safe-area inset: 13 + 13 padding, a 30 icon
 * slot, a 6 gap and a 10 label. Screens reserve this much space at the bottom
 * so their last card does not hide under it.
 */
export const NAV_BAR_HEIGHT = 74;

export const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: apothecary.line,
    overflow: 'hidden',
    shadowColor: ui.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: ui.line,
  },
  button: { flex: 1, alignItems: 'center', gap: 6 },
  // A slot behind the icon rather than a tint on it: at 24px a colour shift
  // alone is easy to miss, and the pill reads as "you are here" at a glance.
  iconSlot: {
    width: 44,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlotActive: { backgroundColor: alpha('gold', 0.16) },
  label: {
    fontFamily: POPPINS.medium,
    fontSize: 10,
    color: apothecary.inkMuted,
  },
  labelActive: { fontFamily: POPPINS.semibold, color: apothecary.goldLight },
});
