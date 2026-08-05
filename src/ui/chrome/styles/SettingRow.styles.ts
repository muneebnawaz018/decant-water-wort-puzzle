import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  groupTitle: { ...text.eyebrow, marginBottom: 8, marginLeft: 4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: ui.divider },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.well,
  },
  rowLabel: { ...text.rowLabel, flex: 1 },
  chevron: { fontSize: 18, color: apothecary.inkMuted },

  track: {
    width: 46,
    height: 27,
    borderRadius: 14,
    padding: 3,
    backgroundColor: ui.disabledTrack,
  },
  trackOn: { backgroundColor: apothecary.accent },
  knob: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colours.white,
    shadowColor: ui.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    backgroundColor: ui.well,
  },
  segment: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: POPPINS.semibold,
    fontSize: 12,
    color: apothecary.inkMuted,
  },
  segmentTextOn: {
    fontFamily: POPPINS.semibold,
    fontSize: 12,
    color: ui.onGold,
  },
});
