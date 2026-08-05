import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/**
 * The bar's own height, without safe-area inset: 13 + 13 padding, a 30 icon
 * slot, a 6 gap and a 10 label. Screens reserve this much space at the bottom
 * so their last card does not hide under it.
 *
 * Scaled as one number rather than as its parts, so it stays the sum of the
 * scaled paddings below and a screen's bottom tail cannot drift from the bar it
 * is clearing.
 */
export const NAV_BAR_HEIGHT = s(74);

export const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // The strip behind the bar stays full-width and opaque — that part is load
    // bearing, content scrolls under it. The bar itself is clamped: its buttons
    // are `flex: 1`, so at 950dp the six destinations sit a hand's width apart
    // and the row stops reading as one control.
    alignSelf: 'center',
    width: '100%',
    maxWidth: s(420),
    borderRadius: s(22),
    paddingVertical: s(13),
    paddingHorizontal: s(8),
    borderWidth: 1,
    borderColor: apothecary.line,
    overflow: 'hidden',
    shadowColor: ui.shadow,
    shadowOpacity: 0.4,
    shadowRadius: s(24),
    shadowOffset: { width: 0, height: s(10) },
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
  button: { flex: 1, alignItems: 'center', gap: s(6) },
  // A slot behind the icon rather than a tint on it: at 24px a colour shift
  // alone is easy to miss, and the pill reads as "you are here" at a glance.
  iconSlot: {
    width: s(44),
    height: s(30),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSlotActive: { backgroundColor: alpha('gold', 0.16) },
  label: {
    fontFamily: POPPINS.medium,
    fontSize: s(10),
    color: apothecary.inkMuted,
  },
  labelActive: { fontFamily: POPPINS.semibold, color: apothecary.goldLight },
});
