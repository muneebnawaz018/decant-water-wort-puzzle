import { createRng } from '@/core/rng';
import { fragmentation, moveLowerBound, solve } from '@/core/solver';
import type { WaterState } from '@/core/types';
import { applyPour, isSolved } from '@/core/waterCore';
import { paramsForLevel, tubeCount } from '../levelParams';
import {
  applyInverse,
  buildSolved,
  generateLevel,
  inverseMoves,
  isAcceptable,
  scramble,
} from '../waterGenerator';

function replay(state: WaterState, moves: { from: number; to: number }[]): WaterState {
  let current = state;
  for (const move of moves) {
    const applied = applyPour(current, move.from, move.to);
    if (!applied) throw new Error(`illegal move ${move.from}->${move.to}`);
    current = applied.state;
  }
  return current;
}

describe('levelParams', () => {
  it('follows the difficulty curve', () => {
    expect(paramsForLevel(1).colourCount).toBe(3);
    expect(paramsForLevel(6).colourCount).toBe(4);
    expect(paramsForLevel(51).colourCount).toBe(6);
    expect(paramsForLevel(201).extraTubes).toBe(1);
    expect(paramsForLevel(351).capacity).toBe(5);
  });

  it('drops back a row every 10th level as a breather', () => {
    expect(paramsForLevel(30).colourCount).toBeLessThan(paramsForLevel(31).colourCount);
    expect(paramsForLevel(10).colourCount).toBe(paramsForLevel(1).colourCount);
  });

  it('never asks for more colours than the theme has', () => {
    for (const level of [500, 501, 1000, 5000]) {
      expect(paramsForLevel(level).colourCount).toBeLessThanOrEqual(12);
    }
  });

  it('counts tubes as colours plus spares', () => {
    expect(tubeCount(paramsForLevel(1))).toBe(5);
  });
});

describe('buildSolved', () => {
  it('produces a solved board with the right shape', () => {
    const params = paramsForLevel(1);
    const state = buildSolved(params, createRng(1));

    expect(state.tubes).toHaveLength(tubeCount(params));
    expect(state.tubes.filter((tube) => tube.length === 0)).toHaveLength(params.extraTubes);
    expect(isSolved(state)).toBe(true);
  });
});

describe('inverseMoves', () => {
  it('only emits un-pours that a forward pour can reverse', () => {
    const state = scramble(buildSolved(paramsForLevel(21), createRng(7)), 12, createRng(9));

    for (const move of inverseMoves(state)) {
      const after = applyInverse(state, move);
      // The reverse is a forward pour from the destination back to the source.
      const back = applyPour(after, move.to, move.from);
      expect(back).not.toBeNull();
      expect(back!.move.count).toBe(move.count);
      expect(back!.state.tubes).toEqual(state.tubes);
    }
  });

  it('never stacks a colour onto its own kind', () => {
    const state = buildSolved(paramsForLevel(6), createRng(3));
    for (const move of inverseMoves(state)) {
      const src = state.tubes[move.from]!;
      const dst = state.tubes[move.to]!;
      // The conditional IS the property under test — an empty destination has
      // no top segment to clash with.
      // eslint-disable-next-line jest/no-conditional-expect
      if (dst.length > 0) expect(dst[dst.length - 1]).not.toBe(src[src.length - 1]);
    }
  });
});

describe('scramble', () => {
  it('leaves the board solvable', () => {
    for (let seed = 0; seed < 10; seed++) {
      const params = paramsForLevel(21);
      const rng = createRng(seed);
      const state = scramble(buildSolved(params, rng), params.scrambleSteps, rng);
      expect(solve(state).moves).not.toBeNull();
    }
  });

  it('preserves the segment count of every colour', () => {
    const params = paramsForLevel(51);
    const rng = createRng(42);
    const state = scramble(buildSolved(params, rng), params.scrambleSteps, rng);

    const counts = new Map<number, number>();
    for (const tube of state.tubes) {
      for (const colour of tube) counts.set(colour, (counts.get(colour) ?? 0) + 1);
    }
    expect(counts.size).toBe(params.colourCount);
    for (const count of counts.values()) expect(count).toBe(params.capacity);
  });
});

describe('solver', () => {
  it('returns a replayable solution', () => {
    const { state } = generateLevel(12);
    const result = solve(state);

    expect(result.moves).not.toBeNull();
    expect(isSolved(replay(state, result.moves!))).toBe(true);
  });

  it('scores a solved board as zero on both metrics', () => {
    const solved = buildSolved(paramsForLevel(1), createRng(1));
    expect(moveLowerBound(solved)).toBe(0);
    expect(fragmentation(solved)).toBe(0);
  });
});

describe('acceptance gate', () => {
  it('rejects a board that is already solved', () => {
    const solved = buildSolved(paramsForLevel(1), createRng(1));
    const report = isAcceptable(solved);

    expect(report.accepted).toBe(false);
    expect(report.reasons.join(' ')).toMatch(/already solved/);
  });

  it('rejects a barely-scrambled board as too easy', () => {
    const params = paramsForLevel(21);
    const rng = createRng(5);
    const state = scramble(buildSolved(params, rng), 1, rng);

    expect(isAcceptable(state).accepted).toBe(false);
  });
});

describe('generateLevel', () => {
  it('is deterministic for a level number', () => {
    expect(generateLevel(37).state.tubes).toEqual(generateLevel(37).state.tubes);
  });

  it('produces distinct boards for distinct levels', () => {
    expect(generateLevel(11).state.tubes).not.toEqual(generateLevel(12).state.tubes);
  });

  it('passes the gate and stays solvable across the curve', () => {
    for (const level of [1, 3, 8, 10, 25, 60, 120, 210]) {
      const { state, report, params } = generateLevel(level);

      expect(state.tubes).toHaveLength(tubeCount(params));
      expect(report.accepted).toBe(true);
      expect(report.fragmentation).toBeGreaterThanOrEqual(0.6);
      expect(report.solvedTubes).toBeLessThanOrEqual(1);
      expect(solve(state).moves).not.toBeNull();
    }
  });
});
