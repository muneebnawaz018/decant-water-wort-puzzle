import type { PourMove, WaterState } from '@/core/types';
import { optimalLine, solve } from '@/core/solver';
import { applyPour } from '@/core/waterCore';

/**
 * The pour a hint should point at, or null when the board cannot be won.
 *
 * ## The hint is the perfect line
 *
 * `optimalLine` is asked first: IDA* over the position, returning the provably
 * shortest winning line. A hint that costs coins has to be worth trusting all
 * the way down — the DFS line it used to hand out was a *winning* line but ran
 * ~20% over the optimum (median 1.20x, worst 1.94x), which meant a player who
 * followed every hint faithfully still could not rate three stars. Advice that
 * caps the score of the person taking it is not advice.
 *
 * The old objection — "IDA* returns a count, not a path" — was answered by
 * teaching it to keep the path, which it already had on its stack. One search
 * per plan, not one per child board, and the plan is cached position by
 * position in `hintLine`, so the expensive call happens when the player walks
 * off the plan, not on every press.
 *
 * ## The fallback is honest and free
 *
 * A board that exhausts the optimal budget falls back to `solve` — the same
 * good-but-not-shortest DFS line as before, delivered with `optimal: false`.
 * The caller charges nothing for it: a paid hint promises the perfect answer,
 * and an answer the search could not perfect is not sold as one.
 *
 * ## Null means stuck, and it is worth saying so
 *
 * A water sort board can be played into a position with no winning line at all.
 * There is no fail state, so nothing stops a player reaching one and nothing
 * tells them they have — they keep pouring at a puzzle that cannot be finished.
 * Measured over 1,407 positions reached by random legal play on the hardest
 * boards the generator makes, **560 of them had no solution**. That is not an
 * edge case, it is two positions in five.
 *
 * The old hint could not detect this and cheerfully suggested a pour anyway.
 * This one returns null, and the screen turns that into "undo, or add a vial" —
 * which is the single most useful thing the button can say.
 */
export type HintSearch =
  /**
   * A pour on a winning line, and the rest of that line with it.
   *
   * `line` maps every position along the way to the move that leaves it, keyed
   * by `positionKey`. The caller keeps it and answers from it, which is what
   * makes consecutive hints agree with each other — see `suggestPour`.
   * `optimal` is whether that line is the provably shortest one, which decides
   * whether it may be charged for.
   */
  | { kind: 'move'; move: PourMove; line: Record<string, PourMove>; optimal: boolean }
  /** The search finished and no winning line exists. Certain, not a guess. */
  | { kind: 'stuck' }
  /**
   * The node budget ran out before the search finished either way.
   *
   * Distinct from `stuck` because the two must be told apart the moment a hint
   * costs coins: "no way to win" on a board the search merely gave up on is a
   * fake answer, and a fake answer that was paid for is worse. Nobody is
   * charged for this outcome, and the screen says "couldn't find one" rather
   * than "there is none".
   */
  | { kind: 'unsure' };

export function suggestPour(board: WaterState): HintSearch {
  const exact = optimalLine(board, { nodeBudget: HINT_OPTIMAL_BUDGET });
  // An already-solved board answers with an empty line — nothing to point at,
  // which is the same news as `stuck`: no pour worth suggesting exists.
  if (exact.moves && exact.moves.length > 0) {
    return {
      kind: 'move',
      move: exact.moves[0]!,
      line: lineMap(board, exact.moves),
      optimal: true,
    };
  }
  // Budget intact and no line: proof there is nothing to find, at any price.
  if (!exact.exhaustedBudget) return { kind: 'stuck' };

  // The optimal search gave up, so fall back to any winning line. Still real
  // advice — every move on it reaches a solved board — just not sold as
  // perfect, and not billed.
  const result = solve(board, { nodeBudget: HINT_NODE_BUDGET });
  const first = result.moves?.[0];
  if (!first) return result.exhaustedBudget ? { kind: 'unsure' } : { kind: 'stuck' };

  return { kind: 'move', move: first, line: lineMap(board, result.moves!), optimal: false };
}

/**
 * A line as position → move, which is the shape consecutive hints answer from.
 *
 * The whole line, not just its head — and this is load-bearing. Returning only
 * the first move meant every press ran its own search, and two searches from
 * adjacent positions do not have to agree; measured on level 1,000,000, two of
 * the three modes cycled inside four moves and never reached solved. With a
 * paid hint that is a button charging for a loop.
 *
 * Handing back the line fixes it by construction: the caller answers every
 * position on it from the same walk, so the advice is one plan followed to the
 * end. A player who pours something else simply falls off the line, and the
 * next press plans again from wherever they now are.
 */
export function lineMap(
  board: WaterState,
  moves: readonly PourMove[]
): Record<string, PourMove> {
  const line: Record<string, PourMove> = {};
  let position = board;
  for (const move of moves) {
    line[positionKey(position)] = move;
    position = applyPour(position, move.from, move.to)!.state;
  }
  return line;
}

/**
 * Ceiling on the optimal search.
 *
 * This runs synchronously on the JS thread when the button is pressed, so the
 * only question that matters is the worst case, not the average. IDA* over the
 * generator's own boards closes in a few dozen nodes most of the time — over
 * 800 endgame boards the median was 1ms and the p95 11ms on a laptop — but the
 * worst single board took 133ms, and Hermes on a phone is several times
 * slower. The budget is what turns "several times 133ms" into a fallback
 * instead of a freeze: a position that will not close inside it drops to the
 * DFS line below, free of charge.
 *
 * Mostly the expensive call never happens at the button at all. The level's
 * whole optimal line is computed off the load path alongside par and seeded
 * into `hintLine`, so a press only searches after the player has walked off
 * the plan — from a position closer to solved than the start was.
 */
const HINT_OPTIMAL_BUDGET = 400_000;

/**
 * Ceiling on the fallback search, so a hint can never stall the UI.
 *
 * Measured over those same 1,407 positions — random legal play, 12 colours,
 * capacity 5, one spare, which is the hardest the generator goes: median 21
 * nodes, 95th percentile 123, worst 520. Unsolvable positions are *cheaper*
 * than solvable ones rather than more expensive, because the search exhausts
 * the whole space instead of walking to a goal.
 *
 * 20,000 is roughly 38x the worst case measured. Deliberately far above it: the
 * numbers come from a laptop and Hermes on a mid-range phone is several times
 * slower, so the margin is protecting against a board nobody has generated yet,
 * not against the ones that have been.
 *
 * Exhausting the budget reports `unsure`, never `stuck` — the search gave up,
 * which is not the same news as proving there is nothing to find, and the
 * player is not charged for it either way.
 */
export const HINT_NODE_BUDGET = 20_000;

/**
 * A board position as a storable key, for remembering hint purchases.
 *
 * An answer is bought for a *position*, not for a moment: undo the hinted pour
 * and the position it was bought for is back, and so is the answer — the
 * player has already seen it, so delivering it again must be free. `heldHint`
 * cannot carry that, because it is display state and clears whenever the board
 * changes; this key is what survives the round trip. Same design as
 * `paidUndos`, with the position standing in for the depth.
 *
 * The tubes are the whole position — capacity and the spare vial are already
 * expressed in them — and the solver is deterministic, so one position always
 * yields one answer and the key never pays for a different hint than the one
 * that was delivered.
 */
export function positionKey(board: WaterState): string {
  return board.tubes.map((tube) => tube.join(',')).join('|');
}
