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
 *
 * **`join` stays, and that is a measured decision rather than an untouched
 * line.** This is the hottest allocation in the search — IDA* builds one key
 * per node — so the obvious saving is one character per segment instead of a
 * comma-joined number, halving the string. It was tried and it is **2.4x
 * slower**: 60 boards from levels 501-560 went from 18ms to 44ms, and level
 * generation with them from 377ms to 788ms.
 *
 * The reason is that `join` is a single engine-level operation returning a flat
 * string, where building one with `+=` in a loop leaves a tree of cons-strings
 * that has to be flattened again the moment the key is hashed or compared —
 * which is the only thing ever done with it. A shorter string built the slow
 * way loses to a longer string built the fast way.
 *
 * Do not re-optimise this without running the numbers again.
 */
function stateKey(state: WaterState): string {
  return state.tubes
    .map((tube) => tube.join(','))
    .sort()
    .join('|');
}

/**
 * Total pours needed at minimum: every run above the first in each color has
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
  return Math.max(0, runs - state.colorCount);
}

/**
 * How broken up the board is, on 0..1. 0 is solved, 1 is every segment sitting
 * on a different color. Scale-free, so it compares across level sizes.
 */
export function fragmentation(state: WaterState): number {
  const segments = state.colorCount * state.capacity;
  const ceiling = segments - state.colorCount;
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
    const wholeTubeIsOneColor = topRun(src) === src.length;
    let emptyUsed = false;

    for (let to = 0; to < state.tubes.length; to++) {
      if (!canPour(state, from, to)) continue;
      const dst = state.tubes[to]!;

      if (dst.length === 0) {
        if (wholeTubeIsOneColor) continue;
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
 * Depth-first search for any solution. Not optimal, and not trying to be — the
 * acceptance gate only needs to know a board can be finished. `optimalMoves`
 * is the one that answers "in how few".
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

/**
 * The exact fewest pours that finish this board, or null if the search gave up
 * on budget.
 *
 * IDA* with `moveLowerBound` as the heuristic. That bound never overestimates —
 * every color run above the first has to be poured at least once — which is
 * what makes the result provably optimal rather than merely good.
 *
 * This exists because star ratings were graded against the bound itself, and a
 * bound is not a target. Measured over levels 1–40, it sat below the true
 * optimum on 22 of them, so three stars was unreachable there no matter how
 * well the level was played.
 *
 * Affordable despite the state space, which is the surprise: pruning on the
 * heuristic closes most boards in a few dozen nodes. Over all 800 boards in
 * levels 501–900 across classic and fiendish — 12 colors, capacity 5, one
 * spare, the worst the game can produce — the median was 1ms, the 95th
 * percentile 11ms, the worst single board 133ms, and none hit the cap.
 *
 * Still worth keeping off the level-load path. Hermes on a mid-range phone is
 * several times slower than the machine those numbers came from, and par is
 * not needed until a level is solved.
 */
export function optimalMoves(state: WaterState, options: SolveOptions = {}): number | null {
  return optimalLine(state, options).moves?.length ?? null;
}

/**
 * The shortest winning line itself, not just its length.
 *
 * Same IDA* as `optimalMoves` — this *is* `optimalMoves`; the count is the
 * line's length — but the path is kept as the search walks, because the hint
 * needs the moves and not merely their number. The path costs nothing extra to
 * record: it is the recursion stack, pushed and popped as the walk goes, and
 * the first round that reaches a solved board leaves the whole shortest line
 * sitting in it.
 *
 * `exhaustedBudget` is the same distinction `solve` draws, and it matters for
 * the same reason: `moves: null` with the budget intact is proof the board
 * cannot be finished, while `moves: null` on an exhausted budget is only the
 * search giving up. A hint charges money on the first and must not on the
 * second.
 */
export function optimalLine(
  state: WaterState,
  options: SolveOptions = {}
): { moves: PourMove[] | null; exhaustedBudget: boolean } {
  const nodeBudget = options.nodeBudget ?? 2_000_000;
  let nodesVisited = 0;
  let bound = moveLowerBound(state);
  const path: PourMove[] = [];

  // Each round searches everything reachable within `bound` pours, then raises
  // the bound to the cheapest thing it had to turn away. The first round that
  // reaches a solved board has found the shortest one.
  for (;;) {
    let nextBound = Infinity;
    // Depth matters here, unlike in `solve`: the same board reached in fewer
    // pours is a different prospect, so the key carries the cost to reach it.
    const seen = new Set<string>();

    const walk = (current: WaterState, cost: number): boolean => {
      if (nodesVisited >= nodeBudget) return false;
      nodesVisited++;

      const estimate = cost + moveLowerBound(current);
      if (estimate > bound) {
        if (estimate < nextBound) nextBound = estimate;
        return false;
      }
      if (isSolved(current)) return true;

      const key = `${stateKey(current)}#${cost}`;
      if (seen.has(key)) return false;
      seen.add(key);

      for (const candidate of orderedMoves(current)) {
        const applied = applyPour(current, candidate.from, candidate.to);
        if (!applied) continue;
        path.push(applied.move);
        if (walk(applied.state, cost + 1)) return true;
        path.pop();
        if (nodesVisited >= nodeBudget) return false;
      }
      return false;
    };

    if (walk(state, 0)) return { moves: [...path], exhaustedBudget: false };
    if (nodesVisited >= nodeBudget) return { moves: null, exhaustedBudget: true };
    // Nothing left to raise the bound to: the board cannot be finished.
    if (nextBound === Infinity) return { moves: null, exhaustedBudget: false };
    bound = nextBound;
    path.length = 0;
  }
}
