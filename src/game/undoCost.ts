/**
 * What an undo costs, and which undos are already paid for.
 *
 * Pure and React-free, like everything in `src/core` and for the same reason:
 * the rule decides whether a player is charged, and it should be provable
 * without a store, a screen or a wallet.
 *
 * The rule is here; the price is in `economy.ts` with every other number.
 */
import type { Difficulty } from './difficulty';
import { FREE_UNDOS, PRICES } from './economy';

/**
 * Coins per undo, from the economy's own table.
 *
 * Re-exported under the name the board code uses rather than read inline, so
 * there is still one import to follow and one place the price lives.
 *
 * Redo is free, deliberately. The charge is for *changing your mind about the
 * board*; taking back a move you already paid to take back is not a second
 * decision, and billing it would make the pair feel like a meter running.
 */
export const UNDO_COST = PRICES.undo;

/**
 * Free undos this mode allows per level.
 *
 * The one place `Difficulty` and the economy's table meet. Typed as a full
 * record of the union, so adding a mode without pricing its allowance is a
 * build error rather than a silent zero — which would make the new mode the
 * harshest in the game by accident.
 */
export function freeUndosFor(mode: Difficulty): number {
  return (FREE_UNDOS satisfies Record<Difficulty, number>)[mode];
}

/**
 * What this undo costs, given what has been paid and what is still free.
 *
 * Three answers, in order:
 *
 * 1. **Nothing, because this move was already paid for.** Undo, redo, undo
 *    again is one decision revisited.
 * 2. **Nothing, because the level still owes free undos.** `freeUsed` is how
 *    many of the allowance have gone.
 * 3. **`PRICES.undo`.**
 *
 * Returned as a pair rather than a number so the caller can tell case 2 from
 * case 1 — one of them spends an allowance and the other does not, and the
 * screen says different things about them.
 */
export function undoCharge(
  paid: readonly number[],
  depth: number,
  freeUsed: number,
  mode: Difficulty
): { coins: number; usesAllowance: boolean } {
  if (isUndoPaid(paid, depth)) return { coins: 0, usesAllowance: false };
  if (freeUsed < freeUndosFor(mode)) return { coins: 0, usesAllowance: true };
  return { coins: PRICES.undo, usesAllowance: false };
}

/**
 * Whether undoing the move at `depth` has already been paid for.
 *
 * `depth` is the move's index in `history` — undoing a five-move board charges
 * for depth 4, then 3, and so on down.
 *
 * The set exists because undo and redo are reversible and the charge is not.
 * Undo move 4, redo it, undo it again: that is one decision revisited, and the
 * second undo is free. Play a *different* move at depth 4 and it is a new move
 * that happens to sit at the same index — `forgetFrom` is what draws that line.
 */
export function isUndoPaid(paid: readonly number[], depth: number): boolean {
  return paid.includes(depth);
}

/** The paid set with `depth` added, kept sorted and free of duplicates. */
export function withUndoPaid(paid: readonly number[], depth: number): number[] {
  if (paid.includes(depth)) return [...paid];
  return [...paid, depth].sort((a, b) => a - b);
}

/**
 * Drop every mark at or above `depth`, for when a new move is played there.
 *
 * A fresh pour discards the redo stack, so the moves those marks referred to no
 * longer exist. Keeping them would hand the player a free undo on a move they
 * have not paid for — undo once, redo, play something else, undo again for
 * nothing. Marks *below* the new move survive: those moves are untouched, and
 * were genuinely paid for.
 */
export function forgetFrom(paid: readonly number[], depth: number): number[] {
  return paid.filter((d) => d < depth);
}

/** Validates a paid set read back from storage. */
export function isPaidSet(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((d) => Number.isInteger(d) && (d as number) >= 0)
  );
}
