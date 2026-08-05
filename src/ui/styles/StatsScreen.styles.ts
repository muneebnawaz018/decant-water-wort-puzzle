import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { gridTile } from '@/theme/grid';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

const GAP = s(12);

export const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: s(14) },
  tileSlot: gridTile({
    sidePadding: SPACE.screen,
    gap: GAP,
    minWidth: s(150),
    columns: 2,
    phoneWidth: '48%',
  }),
  tile: { padding: s(16) },
  tileValue: text.figure,
  tileLabel: { ...text.caption, fontSize: s(11), marginTop: s(3) },

  progressCard: { padding: s(16) },
  progressSpacing: { marginTop: s(12) },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: s(6),
  },
  progressName: { ...text.meta, color: apothecary.ink },
  progressValue: text.meta,
  bar: {
    height: s(7),
    borderRadius: s(4),
    overflow: 'hidden',
    backgroundColor: ui.wellDeep,
  },
  barFill: { height: '100%', borderRadius: s(4) },
});
