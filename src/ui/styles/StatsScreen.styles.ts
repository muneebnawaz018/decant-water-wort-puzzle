import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { gridTile } from '@/theme/grid';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

const GAP = s(12);

export const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginBottom: SPACE.section },
  tileSlot: gridTile({
    sidePadding: SPACE.screen,
    gap: GAP,
    minWidth: s(150),
    columns: 2,
    phoneWidth: '48%',
  }),
  tile: { padding: SPACE.tile },
  tileValue: text.figure,
  tileLabel: { ...text.caption, fontSize: s(11), marginTop: s(6) },

  /** One card per difficulty. */
  // Cards inside the group sit a tile gap apart, the same 12 the grid above
  // uses. The last one closes the group, so it takes `section` instead — the
  // distance every other screen puts between a finished block and the next
  // heading.
  // Padding is the inner box; the gap between cards is the outer one. Margin on
  // `contentStyle` lands inside the gloss gradient, where it insets the content
  // instead of separating the cards.
  modeCard: { padding: SPACE.panel },
  modeCardBox: { marginBottom: GAP },
  modeCardLast: { marginBottom: SPACE.section },
  modeHead: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  // The mode's accent, so the three cards are told apart before they are read.
  modeDot: { width: s(9), height: s(9), borderRadius: s(5) },
  modeName: { ...text.cardTitle, flex: 1 },
  modeCount: text.meta,
  bar: {
    height: s(7),
    borderRadius: s(4),
    overflow: 'hidden',
    marginTop: s(10),
    backgroundColor: ui.wellDeep,
  },
  barFill: { height: '100%', borderRadius: s(4) },

  /** Stars / perfect / pours, side by side under the bar. */
  modeStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: s(12) },
  /**
   * The three sit against the card's edges, not in equal columns.
   *
   * Equal columns were the first attempt and they look uneven: each stat is a
   * different width, so centring them inside their thirds leaves the outer two
   * floating short of the card's edges while the middle one drifts. Pinning the
   * outer two to the edges and letting `space-between` place the middle is what
   * makes the row read as evenly spread — and it lines the first stat up with
   * the mode's name and the last with its count, both directly above.
   */
  modeStat: { alignItems: 'center' },
  modeStatFirst: { alignItems: 'flex-start' },
  modeStatLast: { alignItems: 'flex-end' },
  modeStatValue: { ...text.cardTitle, color: apothecary.goldLight },
  modeStatLabel: { ...text.caption, fontSize: s(10.5), marginTop: s(2) },

  /** Lifetime totals: a plain label/value list. */
  lifetime: { paddingHorizontal: SPACE.panel },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Matches `SettingRow` — these are the same thing, a labelled row in a
    // full-width panel, and they were 16/11 here against 15/13 there.
    paddingVertical: s(13),
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: ui.divider },
  rowLabel: text.rowLabel,
  rowValue: { ...text.rowLabel, color: apothecary.goldLight },
});
