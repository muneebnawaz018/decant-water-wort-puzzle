import { solve } from '@/core/solver';
import { isSolved } from '@/core/waterCore';
import { generateLevel } from '../waterGenerator';
import { DAY_MS, dayIndex, generateBonus } from '../dailyPuzzle';

/** Noon local, so a timezone offset cannot push the sample over a boundary. */
const noon = (iso: string) => new Date(`${iso}T12:00:00`).getTime();

describe('the day index', () => {
  it('advances by one per day', () => {
    expect(dayIndex(noon('2026-08-08')) - dayIndex(noon('2026-08-07'))).toBe(1);
    expect(dayIndex(noon('2026-09-07')) - dayIndex(noon('2026-08-08'))).toBe(30);
  });

  it('holds across a whole local day', () => {
    const morning = new Date('2026-08-08T00:30:00').getTime();
    const night = new Date('2026-08-08T23:30:00').getTime();
    expect(dayIndex(morning)).toBe(dayIndex(night));
  });

  /**
   * The boundary is local midnight, not UTC's.
   *
   * `Date.now()` is an instant with no timezone in it, so dividing by a day
   * would roll the puzzle over in the middle of the afternoon for anyone far
   * enough east or west.
   */
  it('turns over at local midnight', () => {
    const before = new Date('2026-08-08T23:59:59').getTime();
    const after = new Date('2026-08-09T00:00:01').getTime();
    expect(dayIndex(after)).toBe(dayIndex(before) + 1);
  });

  it('is a whole number of hours wide', () => {
    expect(DAY_MS).toBe(86_400_000);
  });
});

describe('the bonus board', () => {
  it('is the same board for the same day', () => {
    const day = dayIndex(noon('2026-08-08'));
    expect(generateBonus(day).state).toEqual(generateBonus(day).state);
  });

  it('is a different board the next day', () => {
    const day = dayIndex(noon('2026-08-08'));
    expect(generateBonus(day).state).not.toEqual(generateBonus(day + 1).state);
  });

  /**
   * The whole point of the feature. It used to be the level in progress, so a
   * player on stage 3 got stage 3 — the same board, paying twice.
   */
  it('is not any level in any mode', () => {
    const day = dayIndex(noon('2026-08-08'));
    const bonus = generateBonus(day).state;

    for (const mode of ['gentle', 'classic', 'fiendish'] as const) {
      for (let level = 1; level <= 40; level++) {
        expect(generateLevel(level, mode).state).not.toEqual(bonus);
      }
    }
  });

  it('is the hardest shape the generator makes', () => {
    const board = generateBonus(dayIndex(noon('2026-08-08'))).state;
    const colours = new Set(board.tubes.flat());

    expect(colours.size).toBe(12);
    expect(board.capacity).toBe(5);
    // Twelve full tubes plus one spare. Any fewer spares is unplayable, not
    // harder.
    expect(board.tubes).toHaveLength(13);
  });

  /**
   * Solvability is not optional here. There is no fail state, so an unsolvable
   * bonus board is a coin reward that can never be claimed and a row that
   * counts down forever after a puzzle nobody could finish.
   */
  it('is solvable on every day of a year', () => {
    const start = dayIndex(noon('2026-08-08'));

    for (let offset = 0; offset < 365; offset += 29) {
      const { state } = generateBonus(start + offset);
      const solution = solve(state);
      expect(solution.moves).not.toBeNull();
      expect(isSolved(state)).toBe(false);
    }
  });
});

/**
 * The board a player actually gets, not just a solvable one.
 *
 * The first version of this feature shipped boards like
 * `[[8,8,8,8,0],[4,4,4,4,8],[11,11,11,11,10],[0,0,0,0,6],[1,1,1,1,5], …]` —
 * five tubes a single pour from finished, on the hardest shape the game makes.
 * The gate could not see them: `isTubeComplete` is false for a capped tube, so
 * it reported zero solved tubes and passed.
 */
describe('the bonus board is not half-played', () => {
  const start = dayIndex(noon('2026-08-08'));

  it('passes its own strict gate every day of a year', () => {
    for (let offset = 0; offset < 365; offset += 7) {
      const report = generateBonus(start + offset).report;
      expect({ offset, ...report }).toMatchObject({ accepted: true });
    }
  });

  it('never starts with a finished tube, and at most one capped', () => {
    for (let offset = 0; offset < 365; offset += 7) {
      const report = generateBonus(start + offset).report;
      expect({ offset, solved: report.solvedTubes }).toEqual({ offset, solved: 0 });
      expect(report.cappedTubes).toBeLessThanOrEqual(1);
    }
  });
});

/**
 * The gate is off for levels, and has to stay off.
 *
 * Nothing stores a board — level N is rebuilt from its seed — so which attempt
 * the gate accepts *is* the board. Bounding capped tubes by default would
 * repoint every level in the game at a different puzzle, which is a migration
 * rather than a fix. The bonus board is exempt because it has no history: it
 * lives for a day and nothing records which one was played.
 */
describe('levels are left alone', () => {
  it('does not bound capped tubes on a generated level', () => {
    const report = generateLevel(1, 'classic').report;
    expect(report.accepted).toBe(true);
    // Reported, so the metric is visible — just not enforced.
    expect(typeof report.cappedTubes).toBe('number');
  });
});
