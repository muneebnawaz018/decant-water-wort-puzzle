import { optimalLine } from '@/core/solver';
import type { PourMove, WaterState } from '@/core/types';
import { lineMap } from '@/game/hint';

/** One entry of the plan the hints follow — see `hintLine` on the game state. */
export interface PlannedHint {
  move: PourMove;
  /** Whether the line this came from is the provably shortest. Decides billing. */
  optimal: boolean;
}

/** What one completed search produced. */
export interface ParPlan {
  /** The exact fewest pours that finish the board. */
  par: number;
  /** Every position on that winning line, ready to answer a hint from. */
  plan: Record<string, PlannedHint>;
}

/**
 * Runs the exact-par search off the level-load path, and hands back the line.
 *
 * Extracted from `gameStore` because it is the only place in the app where a
 * solver runs outside a direct player action, and the rules about *when* it may
 * write its answer are the interesting part — not the writing itself. Here they
 * can be read, and tested, without standing a store up around them.
 *
 * The store keeps the part that is genuinely its own: what to do with the
 * result. This module owns the deferral, the search and the staleness checks.
 *
 * @param board       the generated board, which is what par measures
 * @param isCurrent   whether the answer still belongs to what is on screen
 * @param apply       called only if a usable answer arrived in time
 */
export function schedulePar(
  board: WaterState,
  isCurrent: () => boolean,
  apply: (result: ParPlan) => void
): void {
  setTimeout(() => {
    // The player may have moved on while this was queued.
    if (!isCurrent()) return;

    const exact = optimalLine(board);
    // Null means the node cap was hit. Keep the bound: a level nobody can
    // three-star is better than one where everybody does.
    if (exact.moves === null) return;
    // Checked again: the search itself takes real time, and the board it was
    // measuring can have been left during it.
    if (!isCurrent()) return;

    // One search, two answers: the line's length is par, and the line itself
    // seeds the hint plan, so the first press on an untouched board costs no
    // search at all.
    const plan: Record<string, PlannedHint> = {};
    for (const [key, move] of Object.entries(lineMap(board, exact.moves))) {
      plan[key] = { move, optimal: true };
    }

    apply({ par: exact.moves.length, plan });
  }, 0);
}
