import type { PourMove, WaterState } from './types';
import { applyPour, canPour, isSolved, topOf, topRun } from './waterCore';

export interface SolveOptions {
  /** Hard ceiling on explored states. Guards against pathological boards. */
  nodeBudget?: number;
}

export interface SolveResult {
  /** A solution, not necessarily the shortest one. Null when none was found. */
  moves: PourMove[] | null;
  /** True when the search gave up on budget rather than proving unsolvability. */
  exhaustedBudget: boolean;
  nodesVisited: number;
}

/**
 * Canonical key for a board. Tube order carries no meaning, so equivalent
 * boards that differ only by tube position collapse to the same key.
 */
function stateKey(state: WaterState): string {
  return state.tubes
    .map((tube) => tube.join(','))
    .sort()
    .join('|');
}

/**
 * Total pours needed at minimum: every run above the first in each colour has
 * to be poured at least once to merge it. Cheap, and a true lower bound.
 */
export function moveLowerBound(state: WaterState): number {
  let runs = 0;
  for (const tube of state.tubes) {
    if (tube.length === 0) continue;
    let count = 1;
    for (let i = 1; i < tube.length; i++) {
      if (tube[i] !== tube[i - 1]) count++;
    }
    runs += count;
  }
  return Math.max(0, runs - state.colourCount);
}

/**
 * How broken up the board is, on 0..1. 0 is solved, 1 is every segment sitting
 * on a different colour. Scale-free, so it compares across level sizes.
 */
export function fragmentation(state: WaterState): number {
  const segments = state.colourCount * state.capacity;
  const ceiling = segments - state.colourCount;
  if (ceiling <= 0) return 0;
  return moveLowerBound(state) / ceiling;
}

function orderedMoves(state: WaterState): PourMove[] {
  const preferred: PourMove[] = [];
  const rest: PourMove[] = [];

  for (let from = 0; from < state.tubes.length; from++) {
    const src = state.tubes[from]!;
    if (src.length === 0) continue;
    // Pouring a whole uniform tube into an empty one achieves nothing.
    const wholeTubeIsOneColour = topRun(src) === src.length;
    let emptyUsed = false;

    for (let to = 0; to < state.tubes.length; to++) {
      if (!canPour(state, from, to)) continue;
      const dst = state.tubes[to]!;

      if (dst.length === 0) {
        if (wholeTubeIsOneColour) continue;
        // Empty tubes are interchangeable; trying more than one just fans out.
        if (emptyUsed) continue;
        emptyUsed = true;
        rest.push({ from, to, count: 0 });
        continue;
      }

      const move = { from, to, count: 0 };
      // Prefer pours that finish a tube or empty the source outright.
      const space = state.capacity - dst.length;
      if (space >= topRun(src) || topOf(dst) === topOf(src)) preferred.push(move);
      else rest.push(move);
    }
  }

  return [...preferred, ...rest];
}

/**
 * Depth-first search for any solution. Not optimal — proving optimality on a
 * 12-colour board is far too expensive — but it settles solvability, which is
 * what the acceptance gate actually needs.
 */
export function solve(state: WaterState, options: SolveOptions = {}): SolveResult {
  const nodeBudget = options.nodeBudget ?? 200_000;
  const seen = new Set<string>([stateKey(state)]);
  const path: PourMove[] = [];
  let nodesVisited = 0;
  let exhaustedBudget = false;

  const walk = (current: WaterState): boolean => {
    if (isSolved(current)) return true;
    if (nodesVisited >= nodeBudget) {
      exhaustedBudget = true;
      return false;
    }

    for (const candidate of orderedMoves(current)) {
      const applied = applyPour(current, candidate.from, candidate.to);
      if (!applied) continue;

      const key = stateKey(applied.state);
      if (seen.has(key)) continue;
      seen.add(key);
      nodesVisited++;

      path.push(applied.move);
      if (walk(applied.state)) return true;
      path.pop();

      if (exhaustedBudget) return false;
    }

    return false;
  };

  const solved = walk(state);
  return { moves: solved ? [...path] : null, exhaustedBudget, nodesVisited };
}
