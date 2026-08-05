/**
 * Star rating, from the prototype's rule: par or better is three stars, up to
 * half again is two, anything that finishes is one.
 *
 * Par is the solver's move lower bound, not a hand-authored number. It is
 * already computed while generating the level, it is deterministic, and it
 * scales with the board instead of assuming capacity 4 the way the prototype's
 * `colours * 2` did.
 *
 * The floor matters: there is no fail state (doc §4), so a finished level
 * always pays at least one star. Zero stars would read as a loss.
 */
export function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.5)) return 2;
  return 1;
}

/** Coins paid for a completion, by star count. */
export function coinsFor(stars: number): number {
  return stars * 20;
}
