import { StyleSheet } from 'react-native';

import { SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { gridTile } from '@/theme/grid';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

const GAP = s(12);

/**
 * Height of a card's skin picture.
 *
 * Exported because Skia draws to a sized surface — `SkinPreview` takes numbers,
 * not a flex box — and a constant used by both the layout and the drawing
 * belongs with the layout.
 */
/**
 * Tall enough to show a vial at its true shape.
 *
 * `SkinPreview` derives tube width from this (the board's 3.8:1 aspect), so
 * this number is the whole size of the preview: at 74 the vials came out 19dp
 * wide and the glass detail a skin *is* — a neck, a shoulder — was a couple of
 * pixels. 110 puts them at 29dp, which is the width a real 13-tube board draws.
 */
export const PREVIEW_HEIGHT = s(110);

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
    height: PREVIEW_HEIGHT,
    // No padding: the preview draws its own margins into its box, and an inset
    // here would shrink the surface it measured itself against.
    justifyContent: 'center',
    borderRadius: s(12),
    // The tile's own inset, so the swatches, the name and the button are all
    // one distance apart and one distance from the card's edges.
    marginBottom: SPACE.tile,
    overflow: 'hidden',
    backgroundColor: ui.well,
  },
  tileName: { ...text.cardTitle, fontSize: s(13) },
  // What the glass is, under its name. Skins are shapes now, and a shape needs
  // a word — "Round flask" over an outline is easy to miss at card size.
  tileBlurb: { ...text.caption, fontSize: s(10), marginTop: s(2) },
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
