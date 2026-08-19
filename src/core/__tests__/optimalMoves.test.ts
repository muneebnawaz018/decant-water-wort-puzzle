import { DIFFICULTIES } from '@/game/difficulty';
import { generateLevel } from '@/game/waterGenerator';
import { moveLowerBound, optimalLine, optimalMoves } from '../solver';
import type { WaterState } from '../types';
import { applyPour, canPour, isSolved } from '../waterCore';

/**
 * Shortest solution by breadth-first search, over every legal pour with no
 * pruning at all.
 *
 * Deliberately naive. It is the reference `optimalMoves` is checked against,
 * so it must not share the symmetry reductions in `orderedMoves` — if one of
 * those ever stops being safe, this is what notices.
 */
function bfsOptimal(start: WaterState): number {
  const key = (state: WaterState) =>
    state.tubes
      .map((tube) => tube.join(','))
      .sort()
      .join('|');

  let frontier = [start];
  const seen = new Set([key(start)]);

  for (let depth = 0; depth < 40; depth++) {
    const next: WaterState[] = [];
    for (const state of frontier) {
      if (isSolved(state)) return depth;
      for (let from = 0; from < state.tubes.length; from++) {
        for (let to = 0; to < state.tubes.length; to++) {
          if (!canPour(state, from, to)) continue;
          const applied = applyPour(state, from, to)!.state;
          const k = key(applied);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push(applied);
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return -1;
}

describe('optimalMoves', () => {
  it('agrees with an exhaustive search on every board it can be checked against', () => {
    // Capped at 40 levels: BFS is only affordable on the small boards, which
    // is the entire reason IDA* exists here.
    for (let level = 1; level <= 40; level++) {
      const { state } = generateLevel(level, 'classic');
      expect(optimalMoves(state)).toBe(bfsOptimal(state));
    }
  }, 120_000);

  it('never falls below the lower bound, and usually sits above it', () => {
    let above = 0;

    for (const mode of DIFFICULTIES) {
      for (let level = 1; level <= 400; level += 7) {
        const { state } = generateLevel(level, mode);
        const exact = optimalMoves(state);
        const bound = moveLowerBound(state);

        expect(exact).not.toBeNull();
        expect(exact!).toBeGreaterThanOrEqual(bound);
        if (exact! > bound) above++;
      }
    }

    // The whole reason for this function. Grading three stars against the
    // bound made them unreachable on every one of these.
    expect(above).toBeGreaterThan(0);
  }, 300_000);

  it('is deterministic — par is part of what a level means', () => {
    const { state } = generateLevel(120, 'fiendish');
    expect(optimalMoves(state)).toBe(optimalMoves(state));
  });

  it('gives up rather than hang when the budget runs out', () => {
    const { state } = generateLevel(700, 'fiendish');
    expect(optimalMoves(state, { nodeBudget: 5 })).toBeNull();
  });

  it('costs nothing on a board that is already solved', () => {
    const solved: WaterState = {
      capacity: 2,
      colorCount: 2,
      extraTubes: 1,
      tubes: [[0, 0], [1, 1], []],
    };
    expect(optimalMoves(solved)).toBe(0);
  });

  /**
   * The line, not just the count — what the hint follows. `optimalMoves` is a
   * wrapper over this, so the count tests above already exercise the search;
   * these pin what the wrapper throws away.
   */
  describe('optimalLine', () => {
    it('returns a line that replays to solved in exactly the optimal count', () => {
      for (const [level, mode] of [
        [12, 'classic'],
        [120, 'fiendish'],
        [301, 'gentle'],
      ] as const) {
        const { state } = generateLevel(level, mode);
        const line = optimalLine(state);

        expect(line.moves).not.toBeNull();
        expect(line.moves!.length).toBe(optimalMoves(state));

        let position = state;
        for (const move of line.moves!) {
          expect(canPour(position, move.from, move.to)).toBe(true);
          position = applyPour(position, move.from, move.to)!.state;
        }
        expect(isSolved(position)).toBe(true);
      }
    }, 60_000);

    it('answers a solved board with an empty line, not a null', () => {
      const solved: WaterState = {
        capacity: 2,
        colorCount: 2,
        extraTubes: 1,
        tubes: [[0, 0], [1, 1], []],
      };
      expect(optimalLine(solved)).toEqual({ moves: [], exhaustedBudget: false });
    });

    it('tells an exhausted budget apart from a proven dead end', () => {
      const { state } = generateLevel(700, 'fiendish');
      expect(optimalLine(state, { nodeBudget: 5 })).toEqual({
        moves: null,
        exhaustedBudget: true,
      });

      // Two colors interleaved with no working space: no pour is legal, so
      // the search proves the position dead without spending its budget.
      const dead: WaterState = {
        capacity: 2,
        colorCount: 2,
        extraTubes: 0,
        tubes: [
          [0, 1],
          [1, 0],
        ],
      };
      expect(optimalLine(dead)).toEqual({ moves: null, exhaustedBudget: false });
    });
  });

  it('prunes hard on the worst boards the game generates', () => {
    // Twelve colors, capacity 5, one spare. If a change to the heuristic or
    // to move ordering ever weakens the pruning, this is where it shows.
    //
    // Counted in nodes, not milliseconds. This began as a wall-clock assertion
    // and it flaked in the commit hook — the gate runs jest beside five other
    // checks across eight workers, so the same boards that take 2ms alone took
    // over 50ms under contention. A timing test measures the machine's spare
    // capacity as much as the code, and the thing actually worth guarding here
    // is search work, which is deterministic.
    //
    // Measured worst over levels 501–540 in classic and fiendish: 4,364 nodes.
    // A 10x margin — a regression alarm, not a benchmark.
    for (let level = 501; level <= 540; level++) {
      expect(
        optimalMoves(generateLevel(level, 'fiendish').state, { nodeBudget: 50_000 })
      ).not.toBeNull();
    }
  }, 120_000);
});
