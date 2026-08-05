import { computeLayout, hitTest, rowSizes, rowsForTubeCount, segmentRect } from '../layout';

const BOX = { width: 360, height: 520, capacity: 4 };

describe('rowsForTubeCount', () => {
  it('follows the layout rules in doc §6', () => {
    expect(rowsForTubeCount(4)).toBe(1);
    expect(rowsForTubeCount(5)).toBe(2);
    expect(rowsForTubeCount(12)).toBe(2);
    expect(rowsForTubeCount(13)).toBe(3);
  });
});

describe('rowSizes', () => {
  it('accounts for every tube', () => {
    for (let count = 1; count <= 16; count++) {
      const rows = rowsForTubeCount(count);
      const sizes = rowSizes(count, rows);
      expect(sizes).toHaveLength(rows);
      expect(sizes.reduce((total, size) => total + size, 0)).toBe(count);
    }
  });

  it('puts any short row on top so the rack sits bottom-heavy', () => {
    expect(rowSizes(5, 2)).toEqual([2, 3]);
    expect(rowSizes(13, 3)).toEqual([4, 4, 5]);
  });
});

describe('computeLayout', () => {
  it('places every tube inside the box', () => {
    for (const tubeCount of [3, 5, 8, 11, 14]) {
      const layout = computeLayout({ ...BOX, tubeCount });

      expect(layout.tubes).toHaveLength(tubeCount);
      for (const tube of layout.tubes) {
        expect(tube.x).toBeGreaterThanOrEqual(0);
        expect(tube.y).toBeGreaterThanOrEqual(0);
        expect(tube.x + tube.width).toBeLessThanOrEqual(BOX.width + 0.001);
        expect(tube.y + tube.height).toBeLessThanOrEqual(BOX.height + 0.001);
      }
    }
  });

  it('never overlaps two tubes in the same row', () => {
    const layout = computeLayout({ ...BOX, tubeCount: 11 });
    const rows = new Map<number, typeof layout.tubes>();
    for (const tube of layout.tubes) {
      const row = rows.get(tube.y) ?? [];
      row.push(tube);
      rows.set(tube.y, row);
    }

    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]!.x).toBeGreaterThanOrEqual(
          sorted[i - 1]!.x + sorted[i - 1]!.width
        );
      }
    }
  });

  it('divides the tube evenly into segments', () => {
    const layout = computeLayout({ ...BOX, tubeCount: 6, capacity: 5 });
    expect(layout.segmentHeight * 5).toBeCloseTo(layout.tubes[0]!.height);
  });

  it('shrinks tubes as the board gets busier', () => {
    const few = computeLayout({ ...BOX, tubeCount: 5 });
    const many = computeLayout({ ...BOX, tubeCount: 14 });
    expect(many.tubes[0]!.width).toBeLessThan(few.tubes[0]!.width);
  });
});

describe('hitTest', () => {
  it('finds the tube under a touch', () => {
    const layout = computeLayout({ ...BOX, tubeCount: 6 });
    const tube = layout.tubes[3]!;

    expect(hitTest(layout, tube.x + tube.width / 2, tube.y + tube.height / 2)).toBe(3);
  });

  it('returns -1 for a touch on empty bench', () => {
    const layout = computeLayout({ ...BOX, tubeCount: 6 });
    expect(hitTest(layout, -50, -50)).toBe(-1);
  });

  it('forgives a near miss, because glass is a thin target', () => {
    const layout = computeLayout({ ...BOX, tubeCount: 6 });
    const tube = layout.tubes[0]!;
    expect(hitTest(layout, tube.x - 6, tube.y + tube.height / 2)).toBe(0);
  });
});

describe('segmentRect', () => {
  it('stacks segments upward from the bottom of the tube', () => {
    const layout = computeLayout({ ...BOX, tubeCount: 6 });
    const tube = layout.tubes[0]!;

    const bottom = segmentRect(layout, 0, 0);
    const above = segmentRect(layout, 0, 1);

    expect(bottom.y + bottom.height).toBeCloseTo(tube.y + tube.height);
    expect(above.y).toBeCloseTo(bottom.y - layout.segmentHeight);
  });
});
