import { columnsFor, isTablet, WINDOW_WIDTH } from './scale';

interface GridTile {
  /** The screen's side padding, so the available width can be worked out. */
  sidePadding: number;
  /** Gap between tiles in a row. */
  gap: number;
  /** Narrowest a tile may get before the grid drops a column. */
  minWidth: number;
  /** Columns on a phone, and the floor on a tablet. */
  columns: number;
  /** What the phone stylesheet already used, returned unchanged on phones. */
  phoneWidth: `${number}%`;
}

/**
 * Sizing for one tile in a `flexWrap` grid.
 *
 * The wrapping grids in this app were written as `width: '48%', flexGrow: 1`,
 * which is two across at every size — right on a phone and wrong on a tablet,
 * where it makes half-screen cards holding phone-sized content. A percentage
 * cannot express "as many as fit", because the gaps are in dp and RN has no
 * `calc`, so the column count is derived first and the width falls out of it.
 *
 * `flexGrow` goes with it, and that pairing is the point. At two columns an
 * even count always fills its rows, so a growing tile never has room to grow
 * into. At three it does: the shop's four skins put one card alone on the last
 * row and `flexGrow: 1` stretched it to the full width, so "Meadow glass" came
 * out three times the size of the skin above it. An explicit width has to come
 * with an explicit refusal to grow.
 *
 * Phones get `phoneWidth` and their `flexGrow` back verbatim rather than a
 * computed equivalent, so this file cannot change what a phone already renders.
 */
export const gridTile = ({
  sidePadding,
  gap,
  minWidth,
  columns,
  phoneWidth,
}: GridTile): { width: number | `${number}%`; flexGrow: number } => {
  if (!isTablet) return { width: phoneWidth, flexGrow: 1 };

  const available = WINDOW_WIDTH - sidePadding * 2;
  const fitted = columnsFor(available, minWidth, gap, columns);
  return { width: (available - gap * (fitted - 1)) / fitted, flexGrow: 0 };
};
