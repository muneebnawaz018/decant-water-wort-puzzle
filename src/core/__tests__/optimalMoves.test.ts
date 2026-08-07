import { DIFFICULTIES } from '@/game/difficulty';
import { generateLevel } from '@/game/waterGenerator';
import { moveLowerBound, optimalMoves } from '../solver';
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
      colourCount: 2,
      extraTubes: 1,
      tubes: [[0, 0], [1, 1], []],
    };
    expect(optimalMoves(solved)).toBe(0);
  });

  it('prunes hard on the worst boards the game generates', () => {
    // Twelve colours, capacity 5, one spare. If a change to the heuristic or
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
