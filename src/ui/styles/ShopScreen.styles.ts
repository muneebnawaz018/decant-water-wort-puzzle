import { StyleSheet } from 'react-native';

import { SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { gridTile } from '@/theme/grid';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

const GAP = s(12);

export const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: SPACE.section },
  // `'48%'` on a phone, a real width on a tablet. Two-across held at any size,
  // an iPad got 490dp cards carrying a 66dp swatch strip — a skin preview
  // stretched into a letterbox, which is the one part of the card worth
  // previewing.
  tileSlot: gridTile({
    sidePadding: SPACE.screen,
    gap: GAP,
    minWidth: s(150),
    columns: 2,
    phoneWidth: '48%',
  }),
  tile: { padding: SPACE.tile, alignItems: 'center' },
  preview: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: s(66),
    gap: s(5),
    padding: s(8),
    borderRadius: s(12),
    // The tile's own inset, so the swatches, the name and the button are all
    // one distance apart and one distance from the card's edges.
    marginBottom: SPACE.tile,
    overflow: 'hidden',
    backgroundColor: ui.well,
  },
  swatch: {
    flex: 1,
    borderRadius: s(6),
    shadowOpacity: 0.5,
    shadowRadius: s(8),
    shadowOffset: { width: 0, height: 0 },
  },
  tileName: { ...text.cardTitle, fontSize: s(13) },
  // Matches the tile's own padding, so the button sits the same distance from
  // the card's bottom edge as it does from the name above it.
  buy: { alignSelf: 'stretch', marginTop: SPACE.tile },

  extra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingHorizontal: SPACE.panel,
    paddingVertical: s(13),
  },
  extraDivider: { borderBottomWidth: 1, borderBottomColor: ui.divider },
  extraLabel: { ...text.rowLabel, flex: 1 },
  extraBuy: { minWidth: s(88) },
});
