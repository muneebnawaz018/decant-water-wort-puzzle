import { EARNINGS } from './economy';

/**
 * Efficiency a run needs for three stars, as `par / moves`.
 *
 * 85% leaves roughly one move in seven over the optimum. On a 20-move board
 * that is 23 moves; on a 7-move board it is 8.
 */
const THREE_STAR_EFFICIENCY = 0.85;

/**
 * Three stars regardless of ratio when the run is within this many moves of
 * par.
 *
 * Percentages compress on small numbers: five moves on a four-move board is
 * 80%, which would fail the ratio on exactly the levels people are learning
 * with. The override keeps the early game from being the strictest part of it.
 */
const NEAR_PAR_MOVES = 1;

/**
 * Efficiency a run needs for two stars. 50% is double par — the safety net for
 * a player who wandered into a loop or backtracked their way out of a knot but
 * did finish.
 */
const TWO_STAR_EFFICIENCY = 0.5;

/**
 * Star rating, on efficiency rather than an exact move target.
 *
 * `par / moves`: at or above 85% is three stars, at or above 50% is two,
 * anything that finishes is one. Scaling with the board is the point — a
 * 40-move puzzle has more places to lose a move than a 7-move one, and a fixed
 * allowance would be generous on one and punishing on the other.
 *
 * Par is the true fewest pours that finish the board — `optimalMoves`, IDA*
 * over the generator's own output. Not hand-authored, deterministic, and it
 * scales with the board instead of assuming capacity 4 the way the prototype's
 * `colours * 2` did.
 *
 * It used to be `moveLowerBound`, and that was a bug worth remembering. A
 * lower bound is not a target: measured against an exhaustive search it sat
 * below the real optimum on 22 of levels 1–40 and on 25% of levels 501–900, so
 * three stars was unreachable there however well the level was played. `par`
 * still holds the bound for the moment between a level loading and the search
 * finishing — wrong in the same direction as before, and gone long before
 * anyone can solve a board.
 *
 * Three stars is deliberately not a demand for optimal play. With par exact,
 * `moves <= par` would ask the player to solve the whole board in their head
 * before touching it, which turns a colour sorter into an optimisation puzzle.
 * The cushion is not there to cover exploration — an undone pour leaves no
 * trace, since `moves` is `history.length` and undo drops the move from it —
 * it is there so that playing well is enough without playing perfectly.
 *
 * One star has no lower limit, and that is the design: there is no fail state
 * (doc §4), so five hundred pours on a fifteen-move board is still a win.
 *
 * **Hints do not cap the rating.** A ceiling per paid hint was tried and taken
 * out again when hints became the provably shortest line: perfect advice that
 * lowers the score of the player taking it teaches them not to take it, and
 * the economy already prices the lesson — a fully-hinted board costs more in
 * hints than its stars pay back, so the rating can afford to be honest about
 * the line that was played.
 */
export function starsFor(moves: number, par: number): number {
  return efficiencyStars(moves, par);
}

function efficiencyStars(moves: number, par: number): number {
  if (moves <= par + NEAR_PAR_MOVES) return 3;

  const efficiency = par / moves;
  if (efficiency >= THREE_STAR_EFFICIENCY) return 3;
  // Below par 3 the near-par override already reaches past the two-star ratio
  // and that band would vanish. No generated board is that small — the
  // acceptance gate has a move floor — but a rating with a missing rung is the
  // kind of thing that only surfaces once something else changes.
  if (efficiency >= TWO_STAR_EFFICIENCY || moves <= par + NEAR_PAR_MOVES + 1) return 2;
  return 1;
}

/** Coins a run is worth outright, by star count. The rate is in `economy.ts`. */
export function coinsFor(stars: number): number {
  return stars * EARNINGS.coinsPerStar;
}

/**
 * Coins for finishing a level, given the best it had been finished in before.
 *
 * **A level is paid for once, and improving on it pays the difference.** A first
 * clear at two stars pays 40; coming back and three-starring it pays the 20 that
 * was left on the table; replaying it again pays nothing.
 *
 * The alternative — paying the full rate on every solve — was what this replaced
 * and it was an unbounded faucet, not a rounding error. The gentle mode's early
 * boards are seven moves long and rate three stars in seconds, so a player could
 * mint 60 coins on a loop by pressing replay, with no cheating involved. That
 * makes every price in the game notional, including what an undo costs.
 *
 * Paying nothing at all for a replay was the simpler fix and is worse: a player
 * who comes back and turns a scraped one-star into a clean three deserves the
 * difference, and that is the only reason to replay a level with no fail state.
 *
 * `previousStars` is 0 for a level never finished, which makes the first clear
 * fall out of the same expression rather than needing a case of its own.
 */
export function coinsForImprovement(stars: number, previousStars: number): number {
  const gained = Math.max(0, Math.floor(stars) - Math.max(0, Math.floor(previousStars)));
  return coinsFor(gained);
}

/** Levels in a milestone block. Ten, matching the Stages grid's rhythm. */
export const MILESTONE_SIZE = 10;

/** Most stars a block can hold. */
const MILESTONE_MAX_STARS = MILESTONE_SIZE * 3;

/**
 * Coins for finishing a block of ten levels, paid on the stars earned in it.
 *
 * Two things are being balanced. The reward has to be worth noticing early,
 * when a player has nothing saved and the levels are short — and it has to
 * stay a bonus later rather than becoming the main source of income, or the
 * economy ends up paying for elapsed time instead of for playing well.
 *
 * So the rate per star tapers, from `milestoneTopRate` down to
 * `milestoneFloorRate` a step every `milestoneTaper` blocks. At the numbers in
 * `economy.ts` that is block one paying up to 120 and block seven onward up to
 * 30 — roughly one extra level's worth on top of the ten levels' own payouts.
 *
 * Driven by stars rather than by levels finished, so a block cleared carefully
 * pays more than a block scraped through. There is no fail state, so every
 * completed block pays something.
 *
 * `block` is one-based: levels 1-10 are block 1.
 */
export function milestoneBonus(block: number, stars: number): number {
  const earned = Math.max(0, Math.min(MILESTONE_MAX_STARS, Math.floor(stars)));
  if (earned === 0) return 0;

  const steps = Math.floor(Math.max(0, block - 1) / EARNINGS.milestoneTaper);
  const rate = Math.max(EARNINGS.milestoneFloorRate, EARNINGS.milestoneTopRate - steps);
  return earned * rate;
}

/** The block a level belongs to, one-based. */
export function blockOf(level: number): number {
  return Math.floor((level - 1) / MILESTONE_SIZE) + 1;
}

/** The levels in a block, low to high. */
export function levelsInBlock(block: number): number[] {
  const first = (block - 1) * MILESTONE_SIZE + 1;
  return Array.from({ length: MILESTONE_SIZE }, (_, i) => first + i);
}
