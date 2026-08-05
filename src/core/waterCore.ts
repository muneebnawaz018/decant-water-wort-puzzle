import type { Colour, PourMove, WaterState } from './types';

export function topOf(tube: Colour[]): Colour | undefined {
  return tube[tube.length - 1];
}

/** Length of the run of identical segments at the top of a tube. */
export function topRun(tube: Colour[]): number {
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

/** Applies a pour and returns a new state plus the move. Null when illegal. */
export function applyPour(
  state: WaterState,
  from: number,
  to: number
): { state: WaterState; move: PourMove } | null {
  const count = pourCount(state, from, to);
  if (count === 0) return null;

  const tubes = state.tubes.map((tube) => tube.slice());
  const moved = tubes[from]!.splice(tubes[from]!.length - count, count);
  tubes[to]!.push(...moved);

  return { state: { ...state, tubes }, move: { from, to, count } };
}

/** Reverses a previously applied move. Used by undo. */
export function undoPour(state: WaterState, move: PourMove): WaterState {
  const tubes = state.tubes.map((tube) => tube.slice());
  const moved = tubes[move.to]!.splice(tubes[move.to]!.length - move.count, move.count);
  tubes[move.from]!.push(...moved);
  return { ...state, tubes };
}

export function isTubeComplete(tube: Colour[], capacity: number): boolean {
  return tube.length === capacity && topRun(tube) === capacity;
}

export function isSolved(state: WaterState): boolean {
  return state.tubes.every(
    (tube) => tube.length === 0 || isTubeComplete(tube, state.capacity)
  );
}
