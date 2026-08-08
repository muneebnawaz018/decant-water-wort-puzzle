import { createRng } from '@/core/rng';
import { solve } from '@/core/solver';
import type { WaterState } from '@/core/types';
import { applyPour, canPour, isSolved } from '@/core/waterCore';
import { DIFFICULTIES } from '@/game/difficulty';
import { HINT_NODE_BUDGET, suggestPour } from '@/game/hint';
import { generateLevel } from '@/game/waterGenerator';

/** Every legal pour from a position, for walking a board into a mess. */
function legalMoves(board: WaterState): Array<[number, number]> {
  const moves: Array<[number, number]> = [];
  for (let from = 0; from < board.tubes.length; from++) {
    for (let to = 0; to < board.tubes.length; to++) {
      if (from !== to && canPour(board, from, to)) moves.push([from, to]);
    }
  }
  return moves;
}

describe('suggestPour', () => {
  it('suggests a legal pour on a freshly generated board', () => {
    for (const mode of DIFFICULTIES) {
      for (let level = 1; level <= 20; level++) {
        const board = generateLevel(level, mode).state;
        const search = suggestPour(board);

        expect(search.kind).toBe('move');
        if (search.kind !== 'move') continue;
        expect(canPour(board, search.move.from, search.move.to)).toBe(true);
      }
    }
  });

  /**
   * The property the old first-legal-pour hint could not offer, and the whole
   * reason this asks the solver: the move it names has to keep the board
   * winnable. A hint that loses the level is worse than no hint, because the
   * player has no way to tell which kind they were given.
   */
  it('only ever names a move that leaves the board solvable', () => {
    const rng = createRng(11);

    for (const mode of DIFFICULTIES) {
      for (let level = 40; level <= 70; level += 3) {
        let board = generateLevel(level, mode).state;

        // Walk in with random legal play, taking the hint at every position it
        // offers one. Random rather than solver-guided: a player's board is not
        // a solver's, and the positions that matter here are the untidy ones.
        for (let step = 0; step < 20 && !isSolved(board); step++) {
          const search = suggestPour(board);
          if (search.kind !== 'move') break;

          const after = applyPour(board, search.move.from, search.move.to);
          expect(after).not.toBeNull();
          // Still winnable after taking the advice — solved counts as winnable.
          expect(isSolved(after!.state) || suggestPour(after!.state).kind === 'move').toBe(
            true
          );

          const options = legalMoves(board);
          if (options.length === 0) break;
          const [from, to] = options[rng.int(options.length)]!;
          board = applyPour(board, from, to)!.state;
        }
      }
    }
  });

  /**
   * Two positions in five reached by random play have no winning line at all,
   * measured over the hardest boards the generator makes. There is no fail
   * state to announce that, so the hint is the only thing that can — and the
   * screen turns this null into "undo, or add a vial".
   */
  it('returns null on a board that cannot be won', () => {
    const rng = createRng(3);

    // Found first, asserted after. The search has to happen in a loop and the
    // assertions must not, or a run that never finds a stuck board passes by
    // never checking anything.
    const stuck = ((): WaterState | null => {
      for (let level = 501; level <= 560; level++) {
        let board = generateLevel(level, 'fiendish').state;

        for (let step = 0; step < 30 && !isSolved(board); step++) {
          if (suggestPour(board).kind === 'stuck') return board;

          const options = legalMoves(board);
          if (options.length === 0) break;
          const [from, to] = options[rng.int(options.length)]!;
          board = applyPour(board, from, to)!.state;
        }
      }
      return null;
    })();

    expect(stuck).not.toBeNull();
    // Not the search giving up on budget — the position really has no solution,
    // and the full-budget solver agrees.
    expect(solve(stuck!).moves).toBeNull();
  });

  /**
   * The budget exists so a press can never stall the UI, and it is only worth
   * anything if it is far above what the game actually asks for. Measured worst
   * case over random play on 12-colour boards was 520 nodes.
   */
  it('stays far inside its node budget on the hardest boards', () => {
    const rng = createRng(5);
    let worst = 0;

    for (let level = 501; level <= 540; level++) {
      let board = generateLevel(level, 'fiendish').state;

      for (let step = 0; step < 15 && !isSolved(board); step++) {
        worst = Math.max(
          worst,
          solve(board, { nodeBudget: HINT_NODE_BUDGET }).nodesVisited
        );

        const options = legalMoves(board);
        if (options.length === 0) break;
        const [from, to] = options[rng.int(options.length)]!;
        board = applyPour(board, from, to)!.state;
      }
    }

    expect(worst).toBeLessThan(HINT_NODE_BUDGET / 10);
  });

  it('has nothing to suggest on a solved board', () => {
    const board = generateLevel(1, 'classic').state;
    const solvedBoard = solve(board).moves!.reduce(
      (state, move) => applyPour(state, move.from, move.to)!.state,
      board
    );

    expect(isSolved(solvedBoard)).toBe(true);
    expect(suggestPour(solvedBoard).kind).toBe('stuck');
  });
});
