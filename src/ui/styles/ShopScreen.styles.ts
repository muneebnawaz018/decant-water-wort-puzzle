import { StyleSheet } from 'react-native';

import { ui } from '@/theme/colors';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  groupTitle: { ...text.eyebrow, marginBottom: 8, marginLeft: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  tileSlot: { width: '48%', flexGrow: 1 },
  tile: { padding: 12, alignItems: 'center' },
  preview: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 66,
    gap: 5,
    padding: 8,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: ui.well,
  },
  swatch: {
    flex: 1,
    borderRadius: 6,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tileName: { ...text.cardTitle, fontSize: 13 },
  buy: { alignSelf: 'stretch', marginTop: 9 },

  extra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  extraDivider: { borderBottomWidth: 1, borderBottomColor: ui.divider },
  extraLabel: { ...text.rowLabel, flex: 1 },
  extraBuy: { minWidth: 88 },
});
