import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
export const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },

  vialSlot: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: alpha('aqua', 0.5),
  },
  vial: {
    width: 54,
    height: 150,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: ui.glassEdge,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    backgroundColor: alpha('white', 0.06),
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  liquidSlot: { width: '100%' },
  // The glass highlight from spec §3 — one bright stripe, not a gradient sheen.
  shine: {
    position: 'absolute',
    top: 10,
    left: 8,
    width: 9,
    height: 90,
    borderRadius: 6,
    backgroundColor: ui.glassShine,
  },

  tagline: {
    fontFamily: POPPINS.semibold,
    fontSize: 16,
    letterSpacing: 0.6,
    color: apothecary.inkMuted,
  },
  hint: {
    position: 'absolute',
    bottom: 70,
    fontFamily: POPPINS.bold,
    fontSize: 12,
    letterSpacing: 3,
    color: apothecary.gold,
  },
});
