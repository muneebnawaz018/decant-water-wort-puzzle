export interface TubeRect {
  /** Left edge of the tube body. */
  x: number;
  /** Top edge of the tube body. */
  y: number;
  width: number;
  height: number;
}

export interface BoardLayout {
  tubes: TubeRect[];
  /** Height of one liquid segment. */
  segmentHeight: number;
  /** Corner radius for the tube body. */
  radius: number;
  rows: number;
}

export interface LayoutInput {
  tubeCount: number;
  capacity: number;
  /** Space the board may occupy, already inset for the HUD and safe areas. */
  width: number;
  height: number;
  /** Gap between tubes within a row, and between rows. */
  gap?: number;
}

/** Row counts, doc §6. Past 12 tubes two rows get too cramped to tap. */
export function rowsForTubeCount(tubeCount: number): number {
  if (tubeCount <= 4) return 1;
  if (tubeCount <= 12) return 2;
  return 3;
}

/**
 * Splits tubes across rows, filling the lower rows first so any short row sits
 * at the top. A bottom-heavy rack reads as resting on the bench.
 */
export function rowSizes(tubeCount: number, rows: number): number[] {
  const base = Math.floor(tubeCount / rows);
  const remainder = tubeCount % rows;
  const sizes: number[] = [];
  for (let row = 0; row < rows; row++) {
    // Rows are filled top-down, so the extras go to the later (lower) rows.
    sizes.push(base + (row >= rows - remainder ? 1 : 0));
  }
  return sizes;
}

/**
 * Places every tube inside the given box. Pure — no React, no Skia — so tube
 * geometry can be unit-tested and reused by hit-testing and the pour arc.
 */
export function computeLayout(input: LayoutInput): BoardLayout {
  const { tubeCount, capacity, width, height } = input;
  const gap = input.gap ?? Math.max(8, width * 0.025);

  const rows = rowsForTubeCount(tubeCount);
  const sizes = rowSizes(tubeCount, rows);
  const widest = Math.max(...sizes);

  // Rows need more air than neighbours in a row, or the rack reads as a grid.
  const rowGap = gap * 2.2;
  const rowHeight = (height - rowGap * (rows - 1)) / rows;
  const cellWidth = (width - gap * (widest - 1)) / widest;

  // A vial is narrow. Segments sit a touch wider than tall — push past about
  // 1.2 and the tubes read as pills rather than glassware.
  const SEGMENT_ASPECT = 1.05;
  const heightLimited = rowHeight * 0.88;
  const widthLimited = cellWidth * 0.72;

  const tubeWidth = Math.min(widthLimited, (heightLimited / capacity) * SEGMENT_ASPECT);
  const tubeHeight = (tubeWidth * capacity) / SEGMENT_ASPECT;
  const segmentHeight = tubeHeight / capacity;

  // Tube height is usually capped by width, so the rows are shorter than their
  // share of the box. Centre the stack, or the spare space pools between rows.
  const stackHeight = rows * tubeHeight + (rows - 1) * rowGap;
  const offsetY = Math.max(0, (height - stackHeight) / 2);

  const tubes: TubeRect[] = [];
  let placed = 0;

  for (let row = 0; row < rows; row++) {
    const count = sizes[row]!;
    const rowWidth = count * tubeWidth + (count - 1) * gap;
    const startX = (width - rowWidth) / 2;
    const y = offsetY + row * (tubeHeight + rowGap);

    for (let column = 0; column < count; column++) {
      tubes.push({
        x: startX + column * (tubeWidth + gap),
        y,
        width: tubeWidth,
        height: tubeHeight,
      });
      placed++;
      if (placed === tubeCount) break;
    }
  }

  return { tubes, segmentHeight, radius: tubeWidth * 0.16, rows };
}

/**
 * Tube under a touch, or -1. The box is padded outward because a glass tube is
 * a narrow target and players aim at the liquid, not the rim.
 */
export function hitTest(layout: BoardLayout, x: number, y: number, slop = 12): number {
  for (let index = 0; index < layout.tubes.length; index++) {
    const tube = layout.tubes[index]!;
    if (
      x >= tube.x - slop &&
      x <= tube.x + tube.width + slop &&
      y >= tube.y - slop &&
      y <= tube.y + tube.height + slop
    ) {
      return index;
    }
  }
  return -1;
}

/** Rect of the nth segment from the bottom of a tube. */
export function segmentRect(
  layout: BoardLayout,
  tubeIndex: number,
  segmentIndex: number
): TubeRect {
  const tube = layout.tubes[tubeIndex]!;
  return {
    x: tube.x,
    y: tube.y + tube.height - (segmentIndex + 1) * layout.segmentHeight,
    width: tube.width,
    height: layout.segmentHeight,
  };
}
