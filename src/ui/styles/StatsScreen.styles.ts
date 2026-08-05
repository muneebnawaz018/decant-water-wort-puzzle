import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  tileSlot: { width: '48%', flexGrow: 1 },
  tile: { padding: 16 },
  tileValue: text.figure,
  tileLabel: { ...text.caption, fontSize: 11, marginTop: 3 },

  progressCard: { padding: 16 },
  progressSpacing: { marginTop: 12 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressName: { ...text.meta, color: apothecary.ink },
  progressValue: text.meta,
  bar: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: ui.wellDeep,
  },
  barFill: { height: '100%', borderRadius: 4 },
});
