import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from '@/game/difficulty';
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
}

/** One record per difficulty — modes do not share unlocks or bests. */
export type ProgressByDifficulty = Record<Difficulty, Progress>;

const KEY = 'progress.v2';

function emptyProgress(): Progress {
  return { furthestLevel: 1, currentLevel: 1, best: {}, stars: {} };
}

function sanitise(stored: Partial<Progress> | undefined): Progress {
  if (!stored) return emptyProgress();
  return {
    furthestLevel: Math.max(1, Math.floor(stored.furthestLevel ?? 1)),
    currentLevel: Math.max(1, Math.floor(stored.currentLevel ?? 1)),
    best: stored.best ?? {},
    stars: stored.stars ?? {},
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
  const stored = readJson<Partial<ProgressByDifficulty>>(KEY, {});
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
