import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { columnsFor, s, WINDOW_WIDTH } from '@/theme/scale';

const GAP = s(14);

/**
 * Spec §4.3 shows a four-across grid, and on a phone that is exactly what this
 * is — `columnsFor` returns the fallback unchanged below the tablet threshold.
 *
 * Above it, four is the wrong answer. The tiles are `flex: 1` with
 * `aspectRatio: 1`, so on a 1024pt iPad a four-column grid produces 230dp
 * squares each holding one level number: the grid grows, the content in it does
 * not, and a screen whose whole job is showing many levels at once ends up
 * showing sixteen. Deriving the count from a phone-sized tile spends the extra
 * width on more levels instead.
 */
export const COLUMNS = columnsFor(WINDOW_WIDTH - SPACE.screen * 2, s(76), GAP, 4);

export const styles = StyleSheet.create({
  root: { flex: 1 },

  tabs: {
    flexDirection: 'row',
    gap: s(8),
    paddingHorizontal: SPACE.screen,
    paddingBottom: s(14),
  },
  tabPress: { flex: 1 },
  tab: {
    paddingVertical: s(11),
    borderRadius: s(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
  },
  tabActive: { borderColor: ui.buttonGloss },
  tabText: {
    fontFamily: POPPINS.semibold,
    fontSize: s(13),
    color: apothecary.inkMuted,
  },
  tabTextActive: {
    fontFamily: POPPINS.semibold,
    fontSize: s(13),
    color: ui.onGold,
  },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.screen,
    paddingBottom: s(12),
  },
  pageLabel: {
    fontFamily: POPPINS.semibold,
    fontSize: s(14),
    color: apothecary.inkMuted,
  },

  grid: { paddingHorizontal: SPACE.screen },
  row: { gap: GAP, marginBottom: GAP },
  tileSlot: { flex: 1 },
  tile: {
    aspectRatio: 1,
    borderRadius: s(18),
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(4),
    borderWidth: 1,
    borderColor: apothecary.line,
    shadowColor: ui.shadow,
    shadowOpacity: 0.3,
    shadowRadius: s(6),
    shadowOffset: { width: 0, height: s(4) },
    elevation: 4,
  },
  tileLocked: { opacity: 0.55 },
  tileNumber: {
    fontFamily: POPPINS.semibold,
    fontSize: s(18),
    color: apothecary.ink,
  },
  tileNumberLocked: { fontSize: s(13), color: apothecary.inkMuted },

  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: s(21),
    borderWidth: 3,
  },

  stars: { flexDirection: 'row', gap: s(3), height: s(7) },
  star: {
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    backgroundColor: ui.emptyStar,
  },
  starFilled: {
    backgroundColor: apothecary.gold,
    shadowColor: apothecary.gold,
    shadowOpacity: 0.9,
    shadowRadius: s(6),
    shadowOffset: { width: 0, height: 0 },
  },

  lockNotice: {
    position: 'absolute',
    bottom: s(30),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    borderRadius: s(20),
    borderWidth: 1,
    borderColor: apothecary.line,
    backgroundColor: ui.toast,
    paddingHorizontal: s(16),
    paddingVertical: s(9),
  },
  lockText: {
    fontFamily: POPPINS.medium,
    fontSize: s(12),
    color: apothecary.inkMuted,
  },
});
