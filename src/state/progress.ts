import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from '@/game/difficulty';
import { blockOf, levelsInBlock } from '@/game/stars';
import { readJson, writeJson } from './storage';

export interface Progress {
  /** Highest level reached. Levels above this are not yet unlocked. */
  furthestLevel: number;
  /** Level the player is on right now. */
  currentLevel: number;
  /** Fewest moves used per completed level, keyed by level number. */
  best: Record<number, number>;
  /** Best star rating per completed level, 1 to 3. */
  stars: Record<number, number>;
  /**
   * Milestone blocks already paid, one-based.
   *
   * Has to be stored rather than derived: whether a block is *complete* can be
   * read off `stars`, but whether its bonus has been handed over cannot, and
   * paying it twice is exactly what a replay would do.
   */
  paidBlocks: number[];
}

/** One record per difficulty — modes do not share unlocks or bests. */
export type ProgressByDifficulty = Record<Difficulty, Progress>;

const KEY = 'progress.v3';
/** The v2 record, before milestone bonuses. Read once to carry progress over. */
const LEGACY_KEY = 'progress.v2';

function emptyProgress(): Progress {
  return { furthestLevel: 1, currentLevel: 1, best: {}, stars: {}, paidBlocks: [] };
}

function sanitise(stored: Partial<Progress> | undefined): Progress {
  if (!stored) return emptyProgress();
  return {
    furthestLevel: Math.max(1, Math.floor(stored.furthestLevel ?? 1)),
    currentLevel: Math.max(1, Math.floor(stored.currentLevel ?? 1)),
    best: stored.best ?? {},
    stars: stored.stars ?? {},
    paidBlocks: Array.isArray(stored.paidBlocks)
      ? stored.paidBlocks.filter((n) => Number.isInteger(n) && n > 0)
      : [],
  };
}

export function emptyRecord(): ProgressByDifficulty {
  return {
    gentle: emptyProgress(),
    classic: emptyProgress(),
    fiendish: emptyProgress(),
  };
}

export function loadProgress(): ProgressByDifficulty {
  // Milestone bonuses added `paidBlocks`, so the key moved. A player's levels
  // and stars carry across; `paidBlocks` starts empty, which pays out the
  // blocks they have already finished. Generous rather than punishing, and the
  // alternative is marking them paid for a bonus that did not exist yet.
  const stored = readJson<Partial<ProgressByDifficulty>>(KEY, {
    ...readJson<Partial<ProgressByDifficulty>>(LEGACY_KEY, {}),
  });
  const record = emptyRecord();
  for (const difficulty of DIFFICULTIES) {
    record[difficulty] = sanitise(stored[difficulty]);
  }
  return record;
}

export function saveProgress(record: ProgressByDifficulty): void {
  writeJson(KEY, record);
}

export function progressFor(
  record: ProgressByDifficulty,
  difficulty: Difficulty = DEFAULT_DIFFICULTY
): Progress {
  return record[difficulty] ?? emptyProgress();
}

/** Folds a completed level into one mode's record, keeping the better score. */
export function recordCompletion(
  record: ProgressByDifficulty,
  difficulty: Difficulty,
  level: number,
  moves: number,
  stars = 0
): ProgressByDifficulty {
  const current = progressFor(record, difficulty);
  const previous = current.best[level];
  const previousStars = current.stars[level] ?? 0;

  return {
    ...record,
    [difficulty]: {
      furthestLevel: Math.max(current.furthestLevel, level + 1),
      currentLevel: current.currentLevel,
      best: {
        ...current.best,
        [level]: previous === undefined ? moves : Math.min(previous, moves),
      },
      // A replay never takes stars away — only a better run adds them.
      stars: { ...current.stars, [level]: Math.max(previousStars, stars) },
      paidBlocks: current.paidBlocks,
    },
  };
}

export function setCurrentLevel(
  record: ProgressByDifficulty,
  difficulty: Difficulty,
  level: number
): ProgressByDifficulty {
  return {
    ...record,
    [difficulty]: { ...progressFor(record, difficulty), currentLevel: level },
  };
}

/** Every level in the block has been finished at least once. */
function isBlockComplete(progress: Progress, block: number): boolean {
  return levelsInBlock(block).every((level) => (progress.stars[level] ?? 0) > 0);
}

/** Stars banked across a block, 0 to 30. */
export function starsInBlock(progress: Progress, block: number): number {
  return levelsInBlock(block).reduce(
    (total, level) => total + (progress.stars[level] ?? 0),
    0
  );
}

/**
 * The block a level belongs to, if finishing that level has just completed it
 * and the bonus has not been paid. Null otherwise.
 */
export function unpaidBlockFor(progress: Progress, level: number): number | null {
  const block = blockOf(level);
  if (progress.paidBlocks.includes(block)) return null;
  if (!isBlockComplete(progress, block)) return null;
  return block;
}

/** Marks a block's bonus as handed over, so a replay cannot claim it again. */
export function markBlockPaid(
  record: ProgressByDifficulty,
  difficulty: Difficulty,
  block: number
): ProgressByDifficulty {
  const current = progressFor(record, difficulty);
  if (current.paidBlocks.includes(block)) return record;

  return {
    ...record,
    [difficulty]: { ...current, paidBlocks: [...current.paidBlocks, block] },
  };
}
