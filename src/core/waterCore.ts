import type { Color, PourMove, WaterState } from './types';

export function topOf(tube: Color[]): Color | undefined {
  return tube[tube.length - 1];
}

/** Length of the run of identical segments at the top of a tube. */
export function topRun(tube: Color[]): number {
  const top = topOf(tube);
  if (top === undefined) return 0;
  let run = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === top; i--) run++;
  return run;
}

export function canPour(state: WaterState, from: number, to: number): boolean {
  if (from === to) return false;
  const src = state.tubes[from];
  const dst = state.tubes[to];
  if (!src || !dst) return false;
  if (src.length === 0) return false;
  if (dst.length >= state.capacity) return false;
  return dst.length === 0 || topOf(dst) === topOf(src);
}

/** How many segments a pour would actually move. 0 means the pour is illegal. */
function pourCount(state: WaterState, from: number, to: number): number {
  if (!canPour(state, from, to)) return 0;
  const space = state.capacity - state.tubes[to]!.length;
  return Math.min(topRun(state.tubes[from]!), space);
}

/**
 * Moves `count` segments off the top of `from` onto `to`, returning fresh
 * tubes and leaving every other tube shared with `state`.
 *
 * **This exists to say the pour once.** `applyPour`, `undoPour` and the
 * generator's `applyInverse` each held their own copy of the same four lines,
 * and a pour and an un-pour are the same operation with the ends swapped —
 * which is exactly what `undoPour` now says.
 *
 * A pour touches two tubes, so it copies two rather than deep-copying the
 * board. **That is not a speed-up and should not be sold as one**: measured
 * over 60 boards from levels 501-560 it is inside the noise, because twelve
 * short arrays were never what the search was spending its time on. It is
 * fewer allocations for the same result, and it costs nothing.
 *
 * Sharing the untouched arrays is safe because nothing in this codebase
 * mutates a tube it did not itself create — `gameStore`'s spare vial already
 * grows the board with `[...board.tubes, []]` on that assumption. Hold it if a
 * new writer appears: mutating a tube in place would now be visible through
 * every earlier state still sharing it.
 */
function pour(state: WaterState, from: number, to: number, count: number): WaterState {
  const source = state.tubes[from]!;
  const destination = state.tubes[to]!;
  const cut = source.length - count;

  const tubes = state.tubes.slice();
  tubes[from] = source.slice(0, cut);
  tubes[to] = [...destination, ...source.slice(cut)];

  return { ...state, tubes };
}

/** Applies a pour and returns a new state plus the move. Null when illegal. */
export function applyPour(
  state: WaterState,
  from: number,
  to: number
): { state: WaterState; move: PourMove } | null {
  const count = pourCount(state, from, to);
  if (count === 0) return null;

  return { state: pour(state, from, to, count), move: { from, to, count } };
}

/** Reverses a previously applied move. Used by undo. */
export function undoPour(state: WaterState, move: PourMove): WaterState {
  return pour(state, move.to, move.from, move.count);
}

export function isTubeComplete(tube: Color[], capacity: number): boolean {
  return tube.length === capacity && topRun(tube) === capacity;
}

export function isSolved(state: WaterState): boolean {
  return state.tubes.every(
    (tube) => tube.length === 0 || isTubeComplete(tube, state.capacity)
  );
}
