import { moveLowerBound, optimalMoves } from '@/core/solver';
import { generateLevel } from '@/game/waterGenerator';
import { starsFor } from '@/game/stars';
import { useGameStore } from '../gameStore';

const store = () => useGameStore.getState();

/** Lets the deferred par computation run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A level whose lower bound sits at least `gap` below the true optimum.
 *
 * `gap` matters: the three-star band allows one move over par, so only a gap
 * of two or more is enough to make three stars unreachable on the unrefined
 * bound. Searched rather than hard-coded, so a change to the generator moves
 * the test instead of breaking it.
 */
function levelWithAGap(gap = 1): number {
  for (let level = 2; level <= 300; level++) {
    const { state } = generateLevel(level, 'classic');
    if (optimalMoves(state)! - moveLowerBound(state) >= gap) return level;
  }
  throw new Error(`no level found with a gap of ${gap} — the bound got better`);
}

describe('par', () => {
  it('starts at the lower bound so a rating is always available', () => {
    store().loadLevel(12);
    expect(store().par).toBe(moveLowerBound(generateLevel(12, 'classic').state));
  });

  it('settles on the true optimum a moment later', async () => {
    const level = levelWithAGap();
    const exact = optimalMoves(generateLevel(level, 'classic').state)!;

    store().loadLevel(level);
    expect(store().par).toBeLessThan(exact);

    await settle();
    expect(store().par).toBe(exact);
  });

  it('shows a number a player can actually hit', async () => {
    // The Complete screen prints "par N" beside the move count. The bound is
    // not reachable — no sequence of pours finishes in that many — so leaving
    // it there would put a figure on screen that nothing can match.
    const level = levelWithAGap(2);
    const exact = optimalMoves(generateLevel(level, 'classic').state)!;

    store().loadLevel(level);
    expect(store().par).toBeLessThan(exact);

    await settle();
    expect(store().par).toBe(exact);
  });

  it('pays three stars for optimal play on every level, once settled', async () => {
    for (const level of [3, 17, 40, 61, 90]) {
      const exact = optimalMoves(generateLevel(level, 'classic').state)!;
      store().loadLevel(level);
      await settle();
      expect(starsFor(exact, store().par)).toBe(3);
    }
  }, 30_000);

  it('drops a result the player has already moved past', async () => {
    const level = levelWithAGap();
    store().loadLevel(level);
    // Second load lands before the first computation resolves.
    store().loadLevel(level + 1);

    await settle();
    expect(store().par).toBe(optimalMoves(generateLevel(level + 1, 'classic').state));
  });

  it('measures the generated board, not the one with a spare vial in it', async () => {
    const level = levelWithAGap();
    store().loadLevel(level);
    store().addTube();

    await settle();
    // A spare vial makes a level easier to finish but is not a different
    // puzzle. Par has to mean the same thing either way.
    expect(store().par).toBe(optimalMoves(generateLevel(level, 'classic').state));
  });
});
