import { applyPour, canPour, isSolved, topRun, undoPour } from '../waterCore';
import type { WaterState } from '../types';

const state = (tubes: number[][], capacity = 4): WaterState => ({
  tubes,
  capacity,
  colorCount: 2,
  extraTubes: 1,
});

describe('waterCore', () => {
  it('counts the top run', () => {
    expect(topRun([0, 1, 1, 1])).toBe(3);
    expect(topRun([])).toBe(0);
  });

  it('rejects pours onto a mismatched top', () => {
    expect(canPour(state([[0], [1]]), 0, 1)).toBe(false);
  });

  it('rejects pours into a full tube', () => {
    expect(canPour(state([[0], [0, 0, 0, 0]]), 0, 1)).toBe(false);
  });

  it('moves the whole matching run, capped by free space', () => {
    const result = applyPour(
      state([
        [1, 0, 0, 0],
        [0, 0],
      ]),
      0,
      1
    );
    expect(result?.move).toEqual({ from: 0, to: 1, count: 2 });
    expect(result?.state.tubes).toEqual([
      [1, 0],
      [0, 0, 0, 0],
    ]);
  });

  it('undo restores the previous board exactly', () => {
    const before = state([[1, 0, 0], [0]]);
    const result = applyPour(before, 0, 1)!;
    expect(undoPour(result.state, result.move)).toEqual(before);
  });

  it('detects a solved board', () => {
    expect(isSolved(state([[0, 0, 0, 0], [], [1, 1, 1, 1]]))).toBe(true);
    expect(isSolved(state([[0, 0, 0, 1], [], [1, 1, 1, 0]]))).toBe(false);
  });
});
