import { solve } from '@/core/solver';
import { blockOf, levelsInBlock, milestoneBonus, MILESTONE_SIZE } from '@/game/stars';
import { useEconomyStore } from '../economyStore';
import { useGameStore } from '../gameStore';
import { progressFor, starsInBlock } from '../progress';
import { clearSession } from '../session';

const store = () => useGameStore.getState();
const coins = () => useEconomyStore.getState().coins;
const progress = () => progressFor(store().record, store().difficulty);

/** Plays a level from start to finish using the solver's own solution. */
function clear(level: number): void {
  store().loadLevel(level);
  for (const move of solve(store().board).moves ?? []) {
    store().tapTube(move.from);
    store().tapTube(move.to);
  }
  expect(store().solved).toBe(true);
}

beforeEach(() => {
  clearSession();
  useGameStore.setState({ record: { ...store().record, classic: emptyish() } });
  useEconomyStore.setState({ coins: 0, streak: 0, lastClaimAt: null, owned: [] });
});

function emptyish() {
  return { furthestLevel: 1, currentLevel: 1, best: {}, stars: {}, paidBlocks: [] };
}

describe('milestoneBonus', () => {
  it('pays nothing for a block with no stars in it', () => {
    expect(milestoneBonus(1, 0)).toBe(0);
  });

  it('pays more per star early than late', () => {
    // Same performance, later block: the bonus has to stop being the main
    // income or the economy pays for elapsed time rather than for playing.
    expect(milestoneBonus(1, 30)).toBeGreaterThan(milestoneBonus(9, 30));
  });

  it('flattens out rather than decaying to nothing', () => {
    // A player 500 levels in still gets something for a block.
    expect(milestoneBonus(50, 30)).toBe(milestoneBonus(9, 30));
    expect(milestoneBonus(500, 30)).toBeGreaterThan(0);
  });

  it('never rises with the block number', () => {
    for (let block = 1; block < 60; block++) {
      expect(milestoneBonus(block + 1, 30)).toBeLessThanOrEqual(milestoneBonus(block, 30));
    }
  });

  it('rewards a block cleared well over one scraped through', () => {
    expect(milestoneBonus(3, 30)).toBeGreaterThan(milestoneBonus(3, 10));
  });

  it('caps at a full block of three-star runs', () => {
    expect(milestoneBonus(1, 999)).toBe(milestoneBonus(1, 30));
  });
});

describe('block arithmetic', () => {
  it('puts the first ten levels in block one', () => {
    expect(blockOf(1)).toBe(1);
    expect(blockOf(10)).toBe(1);
    expect(blockOf(11)).toBe(2);
    expect(levelsInBlock(1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('paying the milestone', () => {
  it('pays nothing until the last level of the block is done', () => {
    for (let level = 1; level < MILESTONE_SIZE; level++) clear(level);

    expect(progress().paidBlocks).toEqual([]);
    const beforeLastLevel = coins();

    clear(MILESTONE_SIZE);
    const stars = starsInBlock(progress(), 1);

    expect(progress().paidBlocks).toEqual([1]);
    // The level's own coins plus the block bonus.
    expect(coins()).toBeGreaterThan(beforeLastLevel + milestoneBonus(1, stars) - 1);
  }, 60_000);

  it('will not pay the same block twice', () => {
    for (let level = 1; level <= MILESTONE_SIZE; level++) clear(level);
    const afterFirstPayout = coins();

    // Replaying a finished level still pays its own coins, never the bonus.
    clear(MILESTONE_SIZE);
    const replayGain = coins() - afterFirstPayout;

    expect(progress().paidBlocks).toEqual([1]);
    expect(replayGain).toBeLessThan(milestoneBonus(1, 30));
  }, 60_000);

  it('pays a block finished out of order, on the level that completes it', () => {
    // Level 10 first, then the rest. The bonus lands on whichever level is
    // last, not on the highest-numbered one.
    clear(MILESTONE_SIZE);
    expect(progress().paidBlocks).toEqual([]);

    for (let level = 1; level < MILESTONE_SIZE; level++) clear(level);
    expect(progress().paidBlocks).toEqual([1]);
  }, 60_000);
});
