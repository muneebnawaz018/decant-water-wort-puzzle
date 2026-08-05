import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
/** Spec §4.3 shows a four-across grid. */
export const COLUMNS = 4;
const GAP = 14;

export const styles = StyleSheet.create({
  root: { flex: 1 },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACE.screen,
    paddingBottom: 14,
  },
  tabPress: { flex: 1 },
  tab: {
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
  },
  tabActive: { borderColor: ui.buttonGloss },
  tabText: {
    fontFamily: POPPINS.semibold,
    fontSize: 13,
    color: apothecary.inkMuted,
  },
  tabTextActive: {
    fontFamily: POPPINS.semibold,
    fontSize: 13,
    color: ui.onGold,
  },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.screen,
    paddingBottom: 12,
  },
  pageLabel: {
    fontFamily: POPPINS.semibold,
    fontSize: 14,
    color: apothecary.inkMuted,
  },

  grid: { paddingHorizontal: SPACE.screen },
  row: { gap: GAP, marginBottom: GAP },
  tileSlot: { flex: 1 },
  tile: {
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: apothecary.line,
    shadowColor: ui.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tileLocked: { opacity: 0.55 },
  tileNumber: {
    fontFamily: POPPINS.semibold,
    fontSize: 18,
    color: apothecary.ink,
  },
  tileNumberLocked: { fontSize: 13, color: apothecary.inkMuted },

  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 21,
    borderWidth: 3,
  },

  stars: { flexDirection: 'row', gap: 3, height: 7 },
  star: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ui.emptyStar,
  },
  starFilled: {
    backgroundColor: apothecary.gold,
    shadowColor: apothecary.gold,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  lockNotice: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: apothecary.line,
    backgroundColor: ui.toast,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  lockText: {
    fontFamily: POPPINS.medium,
    fontSize: 12,
    color: apothecary.inkMuted,
  },
});
