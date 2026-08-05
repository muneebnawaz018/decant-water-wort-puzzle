import { solve } from '@/core/solver';
import { DIFFICULTIES } from '../difficulty';
import { paramsForLevel, MAX_COLOURS } from '../levelParams';
import { generateLevel } from '../waterGenerator';

describe('difficulty modes', () => {
  it('spends the lever doc §5 cares about — spare tubes', () => {
    const gentle = paramsForLevel(60, 'gentle');
    const classic = paramsForLevel(60, 'classic');
    const fiendish = paramsForLevel(60, 'fiendish');

    expect(gentle.extraTubes).toBeGreaterThan(classic.extraTubes);
    expect(fiendish.extraTubes).toBeLessThan(classic.extraTubes);
    expect(fiendish.colourCount).toBeGreaterThan(classic.colourCount);
  });

  it('never leaves a board without a spare tube', () => {
    for (const level of [1, 250, 400, 900]) {
      for (const mode of DIFFICULTIES) {
        expect(paramsForLevel(level, mode).extraTubes).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('stays inside the palette the theme can render', () => {
    for (const level of [500, 501, 700, 2000]) {
      for (const mode of DIFFICULTIES) {
        expect(paramsForLevel(level, mode).colourCount).toBeLessThanOrEqual(MAX_COLOURS);
      }
    }
  });

  it('produces a different board per mode for the same level', () => {
    const gentle = generateLevel(21, 'gentle').state.tubes;
    const classic = generateLevel(21, 'classic').state.tubes;
    const fiendish = generateLevel(21, 'fiendish').state.tubes;

    expect(gentle).not.toEqual(classic);
    expect(classic).not.toEqual(fiendish);
  });

  it('stays solvable in every mode', () => {
    for (const level of [1, 12, 45, 120]) {
      for (const mode of DIFFICULTIES) {
        const { state } = generateLevel(level, mode);
        expect(solve(state).moves).not.toBeNull();
      }
    }
  });
});

describe('determinism', () => {
  /**
   * The promise the whole design rests on: no board is ever stored, so level N
   * has to rebuild identically on a fresh install, another device, or a later
   * version. If this test fails, every player's saved progress points at
   * different puzzles than it used to.
   */
  it('rebuilds an identical board for a level and mode, every time', () => {
    for (const level of [1, 7, 30, 99, 250]) {
      for (const mode of DIFFICULTIES) {
        const first = generateLevel(level, mode);
        const second = generateLevel(level, mode);

        expect(second.state.tubes).toEqual(first.state.tubes);
        expect(second.seed).toBe(first.seed);
        expect(second.params).toEqual(first.params);
      }
    }
  });

  it('pins the board for level 30 against a recorded fingerprint', () => {
    // Not arbitrary: this is the value the generator produced when the seeding
    // scheme was frozen. A change here means saved progress now points at a
    // different puzzle, and needs a deliberate migration — not a re-recording.
    const fingerprint = generateLevel(30, 'classic')
      .state.tubes.map((tube) => tube.join(''))
      .join('|');

    expect(fingerprint).toBe('30|2221|10|3010||3231');
  });

  it('does not drift when levels are generated out of order', () => {
    const forwards = [1, 2, 3].map((n) => generateLevel(n, 'classic').state.tubes);
    const backwards = [3, 2, 1].map((n) => generateLevel(n, 'classic').state.tubes);

    expect(backwards.reverse()).toEqual(forwards);
  });
});
