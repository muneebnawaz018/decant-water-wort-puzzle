import { DEFAULT_DIFFICULTY, DIFFICULTIES, type Difficulty } from '@/game/difficulty';
import { GENERATOR_VERSION } from '@/game/generatorVersion';
import { blockOf, levelsInBlock } from '@/game/stars';
import { readJsonOrNull, storage, writeJson } from './storage';

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

const KEY = 'progress.v4';
/**
 * Earlier shapes, newest first. Read once, carried forward, then **deleted** —
 * an old record left on disk is what a corrupt current record would silently
 * fall back to, and the v2 shape predates `paidBlocks`, so resurrecting it
 * would pay every milestone bonus a second time.
 */
const LEGACY_KEYS = ['progress.v3', 'progress.v2'] as const;

/**
 * What `progress.v4` actually holds: the per-mode records plus the generator
 * stamp they were written against.
 *
 * The stamp is the missing half of a guard the session record already had.
 * `session.v1` replays its moves and gives up when they no longer fit, but
 * `best` had no equivalent — repoint the generator and every move count keeps
 * describing a board that no longer exists, with nothing to notice. See
 * `GENERATOR_VERSION` for what counts as repointing.
 */
interface Stored {
  gen: number;
  modes: Partial<ProgressByDifficulty>;
}

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

function recordFrom(
  modes: Partial<ProgressByDifficulty> | undefined
): ProgressByDifficulty {
  const record = emptyRecord();
  for (const difficulty of DIFFICULTIES) {
    record[difficulty] = sanitise(modes?.[difficulty]);
  }
  return record;
}

/**
 * The record with every `best` dropped, for a generator that has moved on.
 *
 * Everything else survives on purpose. The levels *were* finished and the
 * stars *were* earned, whatever boards they are attached to now — taking
 * unlocks away over an internal change would punish the player for the app
 * updating. `best` is the one field that measures a specific board's layout,
 * so it is the one field that stops being true.
 */
function dropBests(record: ProgressByDifficulty): ProgressByDifficulty {
  const scrubbed = emptyRecord();
  for (const difficulty of DIFFICULTIES) {
    scrubbed[difficulty] = { ...record[difficulty], best: {} };
  }
  return scrubbed;
}

export function loadProgress(): ProgressByDifficulty {
  const stored = readJsonOrNull<Partial<Stored>>(KEY);

  if (stored !== null) {
    const record = recordFrom(stored.modes);
    // A record from before the boards moved. Keep what is still true of the
    // new ones, drop what is not, and re-stamp — the scrub must land exactly
    // once, not on every launch.
    if (typeof stored.gen === 'number' && stored.gen !== GENERATOR_VERSION) {
      const scrubbed = dropBests(record);
      saveProgress(scrubbed);
      return scrubbed;
    }
    return record;
  }

  // First run under v4: carry the newest legacy record forward. The v2 shape
  // predates `paidBlocks`, which starts empty and pays out the blocks the
  // player has already finished — generous rather than punishing, and the
  // alternative is marking them paid for a bonus that did not exist yet.
  //
  // Both records predate the generator stamp and are trusted as current:
  // nothing has shipped, so no legacy record can have been written against
  // other boards.
  let legacy: Partial<ProgressByDifficulty> | null = null;
  for (const key of LEGACY_KEYS) {
    legacy ??= readJsonOrNull<Partial<ProgressByDifficulty>>(key);
  }
  const record = recordFrom(legacy ?? undefined);
  // Written before the old keys go: a crash in between leaves both records
  // and the next launch simply migrates again. The other order leaves neither.
  if (legacy !== null) saveProgress(record);
  for (const key of LEGACY_KEYS) storage.remove(key);
  return record;
}

export function saveProgress(record: ProgressByDifficulty): void {
  const stored: Stored = { gen: GENERATOR_VERSION, modes: record };
  writeJson(KEY, stored);
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
      /**
       * Finishing a level moves the player on from it.
       *
       * It used to hold, on the theory that only opening a level decides where
       * you are — so solving one and then backing out of the win screen left
       * Home's Continue card pointing at the board you had just finished.
       * Pressing *Next* was the only thing that advanced it, which made the
       * record depend on which of two exits the player took.
       *
       * `Math.max` rather than `level + 1`, so replaying an early level does
       * not drag the player backwards: finishing 3 while sitting on 10 leaves
       * them on 10.
       *
       * Note this is the *last opened* marker, not where the game sends the
       * player — that is `firstUnsolved`, which is derived from `stars` and
       * cannot be talked into pointing at a level already finished.
       */
      currentLevel: Math.max(current.currentLevel, level + 1),
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

/**
 * The lowest level this mode has not finished — where the player actually is.
 *
 * **The frontier, not the last thing opened.** `currentLevel` answers "what did
 * you open most recently", which is the wrong question for Home: replay level 3
 * from the Stages grid and it would offer to continue level 3 forever, having
 * quietly moved the player back thirty levels.
 *
 * Scanned from 1 rather than derived from `furthestLevel`, so a gap cannot hide
 * behind the high-water mark. Gaps should not happen — the grid only unlocks up
 * to the frontier — but a record survives app versions, and answering "you are
 * on 40" to someone who never finished 6 is worse than the scan costing a few
 * dozen lookups.
 *
 * Stars are the test of completion. A level with no stars was never finished;
 * every finished one has at least one, because there is no fail state.
 */
export function firstUnsolved(progress: Progress): number {
  for (let level = 1; level < progress.furthestLevel; level++) {
    if (!progress.stars[level]) return level;
  }
  return progress.furthestLevel;
}

/**
 * The highest level reached in any mode — one number for the whole player.
 *
 * The daily brew scales against it and the skin unlocks read it, and both use
 * the max across modes for the same reason: anything keyed to "how far you
 * are" must not change its answer because you switched tabs. Someone who has
 * pushed Hard to 200 has reached 200, whatever Easy says.
 */
export function furthestAcrossModes(record: ProgressByDifficulty): number {
  return DIFFICULTIES.reduce(
    (best, mode) => Math.max(best, progressFor(record, mode).furthestLevel),
    1
  );
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
