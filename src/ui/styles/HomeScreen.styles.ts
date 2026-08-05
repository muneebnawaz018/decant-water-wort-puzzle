import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
export const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SPACE.screen },

  // The 8/10 that used to be added to the safe-area insets inline. Kept on the
  // bar itself so the screen frame is the same shape as every other screen's.
  topbar: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
    backgroundColor: apothecary.surface,
  },
  navSlot: { marginBottom: 10 },
  iconButtonOff: { opacity: 0.42 },

  // Hero sits at the top of the column; the cards are pushed to the bottom by
  // `stack`'s auto margin, so all the slack falls between the two groups
  // instead of padding the screen top.
  body: { flex: 1, gap: SPACE.block },
  heroSlot: { alignSelf: 'stretch', marginTop: 28 },
  stack: { marginTop: 'auto', marginBottom: 'auto', gap: 28 },

  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: POPPINS.bold, fontSize: 18, color: ui.onGold },
  continueInfo: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: POPPINS.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: apothecary.inkMuted,
  },
  continueLevel: {
    fontFamily: POPPINS.semibold,
    fontSize: 16,
    color: apothecary.ink,
    marginTop: 2,
    marginBottom: 8,
  },
  bar: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: ui.wellDeep,
  },
  barFill: { height: '100%', borderRadius: 4 },
  goChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.accentWash,
  },

  chips: { flexDirection: 'row', gap: 12 },
  chipPress: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
  chipIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { flex: 1, minWidth: 0 },
  chipTitle: {
    fontFamily: POPPINS.semibold,
    fontSize: 12.5,
    color: apothecary.ink,
  },
  chipDetail: {
    fontFamily: POPPINS.regular,
    fontSize: 10.5,
    color: apothecary.inkMuted,
  },
});
