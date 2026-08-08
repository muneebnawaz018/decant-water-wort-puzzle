import type { PourMove, WaterState } from '@/core/types';
import { solve } from '@/core/solver';

/**
 * The pour a hint should point at, or null when the board cannot be won.
 *
 * ## Why this asks the solver
 *
 * The first version scanned for the first legal pour, top-left first, and
 * suggested that. It was not a hint — it was "here is *a* move", and on a
 * fragmented board the first legal pour is very often the one that wrecks it.
 * A player who trusts a hint that loses the level is worse off than one who was
 * never offered help, because they have no way to tell which kind they got.
 *
 * `solve` returns a full winning line, so its first move is guaranteed to lie
 * on a path to a solved board. Not the *shortest* path — `solve` is a plain
 * depth-first search and is explicitly not trying to be optimal — but on a
 * winning one, which is the property a hint has to have.
 *
 * Optimal was considered and is not affordable. `optimalMoves` returns a move
 * *count*, not a path, so the best next move would mean running IDA* once per
 * child board — the branching factor times up to 133ms, on Hermes, on the UI
 * thread. `solve` costs a fraction of that and answers the question asked.
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
  /** A pour on a winning line from the position given. */
  | { kind: 'move'; move: PourMove }
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
  const result = solve(board, { nodeBudget: HINT_NODE_BUDGET });
  const move = result.moves?.[0];
  if (move) return { kind: 'move', move };
  return result.exhaustedBudget ? { kind: 'unsure' } : { kind: 'stuck' };
}

/**
 * Ceiling on the search, so a hint can never stall the UI.
 *
 * This runs synchronously on the JS thread when the button is pressed, so the
 * only question that matters is the worst case, not the average.
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
