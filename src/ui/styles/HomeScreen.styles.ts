import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
import { NAV_BAR_HEIGHT } from '../chrome/styles/NavBar.styles';

export const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SPACE.screen },

  // The 8/10 that used to be added to the safe-area insets inline. Kept on the
  // bar itself so the screen frame is the same shape as every other screen's.
  topbar: {
    marginTop: s(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: s(12),
  },
  // Clears the bar that Root floats over every screen.
  navSlot: { height: NAV_BAR_HEIGHT + 10 },

  // Hero sits at the top of the column; the cards are pushed to the bottom by
  // `stack`'s auto margin, so all the slack falls between the two groups
  // instead of padding the screen top.
  body: { flex: 1, gap: SPACE.block },
  heroSlot: { alignSelf: 'stretch', marginTop: s(28) },
  stack: { marginTop: 'auto', marginBottom: 'auto', gap: s(28) },

  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    padding: s(14),
  },
  badge: {
    width: s(46),
    height: s(46),
    borderRadius: s(14),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: POPPINS.bold, fontSize: s(18), color: ui.onGold },
  continueInfo: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: POPPINS.semibold,
    fontSize: s(10),
    letterSpacing: s(0.8),
    textTransform: 'uppercase',
    color: apothecary.inkMuted,
  },
  continueLevel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(16),
    color: apothecary.ink,
    marginTop: s(2),
    marginBottom: s(8),
  },
  bar: {
    height: s(6),
    borderRadius: s(4),
    overflow: 'hidden',
    backgroundColor: ui.wellDeep,
  },
  barFill: { height: '100%', borderRadius: s(4) },
  goChip: {
    width: s(34),
    height: s(34),
    borderRadius: s(17),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.accentWash,
  },

  chips: { flexDirection: 'row', gap: s(12) },
  chipPress: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: s(10), padding: s(11) },
  chipIcon: {
    width: s(36),
    height: s(36),
    borderRadius: s(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { flex: 1, minWidth: 0 },
  chipTitle: {
    fontFamily: POPPINS.semibold,
    fontSize: s(12.5),
    color: apothecary.ink,
  },
  chipDetail: {
    fontFamily: POPPINS.regular,
    fontSize: s(10.5),
    color: apothecary.inkMuted,
  },
});
