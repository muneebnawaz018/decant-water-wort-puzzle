import { solve } from '@/core/solver';
import { DIFFICULTIES } from '../difficulty';
import { GENERATOR_VERSION } from '../generatorVersion';
import { generationForLevel, paramsForLevel, MAX_COLOURS } from '../levelParams';
import { generateLevel } from '../waterGenerator';

describe('difficulty modes', () => {
  /**
   * Each curve owns its table, so the old "fiendish = classic ± 1" arithmetic
   * is gone — what must hold instead is an ordering: at any level, fiendish is
   * a strictly harder shape than classic and gentle a no-harder one. "Harder"
   * here is the pair of levers doc §5 names — more colours, or fewer spares —
   * never traded against each other.
   */
  it('orders the modes at every level', () => {
    for (const level of [1, 15, 60, 120, 260, 420, 700, 701, 1500]) {
      const classic = paramsForLevel(level, 'classic');
      const fiendish = paramsForLevel(level, 'fiendish');

      // Fiendish leads classic: at least one dial harder, none easier. The
      // dial can be scramble — at the shared 12-colour ceiling it and the
      // gate ramp are what remain — but colours and spares never trail.
      expect(fiendish.colourCount).toBeGreaterThanOrEqual(classic.colourCount);
      expect(fiendish.extraTubes).toBeLessThanOrEqual(classic.extraTubes);
      expect(
        fiendish.colourCount > classic.colourCount ||
          fiendish.extraTubes < classic.extraTubes ||
          fiendish.capacity > classic.capacity ||
          fiendish.scrambleSteps > classic.scrambleSteps
      ).toBe(true);
    }

    // Gentle trails classic on both levers through the shared climb. Past
    // classic's rotation the comparison stops meaning anything — gentle's 11
    // colours at capacity 4 with two spares is still the softer board than
    // classic's 10 at capacity 5 with one — so the promise test below is what
    // covers the endgame.
    for (const level of [1, 15, 60, 120, 260, 420]) {
      const gentle = paramsForLevel(level, 'gentle');
      const classic = paramsForLevel(level, 'classic');
      expect(gentle.colourCount).toBeLessThanOrEqual(classic.colourCount);
      expect(gentle.extraTubes).toBeGreaterThanOrEqual(classic.extraTubes);
    }
  });

  it('keeps the mode promises the curves are built on', () => {
    for (const level of [1, 90, 250, 600, 1000, 5000]) {
      // Gentle never drops below two spares and never leaves capacity 4 —
      // the relaxation promise, held structurally.
      expect(paramsForLevel(level, 'gentle').extraTubes).toBeGreaterThanOrEqual(2);
      expect(paramsForLevel(level, 'gentle').capacity).toBe(4);
    }
    // Fiendish starts with two spares — the spare-tube lever is the game's
    // big one, and the old modifier design burned it at level 1.
    expect(paramsForLevel(1, 'fiendish').extraTubes).toBe(2);
    // …and spends it at 101, a hundred levels before classic's 201.
    expect(paramsForLevel(101, 'fiendish').extraTubes).toBe(1);
    expect(paramsForLevel(199, 'classic').extraTubes).toBe(2);
    expect(paramsForLevel(201, 'classic').extraTubes).toBe(1);
  });

  it('gives fiendish a fixed 12-colour endgame, clear of the clamp', () => {
    // The old +1-then-clamp produced 11, 12, 12 — a third of fiendish's
    // endgame was classic's exact shape on a different seed.
    for (const level of [521, 522, 523, 999, 1001]) {
      expect(paramsForLevel(level, 'fiendish').colourCount).toBe(12);
    }
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

/**
 * The growth dial past the shape ceiling. Colours cap at 12, capacity at 5,
 * spares floor at 1 and the scramble saturates, so what keeps climbing after a
 * curve tops out is selection pressure — `generateLevel` keeps the hardest
 * board of a sample that grows with the level.
 */
describe('the difficulty ramp', () => {
  it('raises selection pressure with level, in every mode', () => {
    for (const mode of DIFFICULTIES) {
      const samples = [1, 101, 501, 1501, 5001].map(
        (level) => generationForLevel(level, mode).sampleSize!
      );
      for (let i = 1; i < samples.length; i++) {
        expect(samples[i]!).toBeGreaterThanOrEqual(samples[i - 1]!);
      }
      // And it actually moves, rather than being flat and monotone by default.
      expect(samples[samples.length - 1]!).toBeGreaterThan(samples[0]!);
    }
  });

  it('spends the pressure where each mode wants it', () => {
    // Hard reaches deepest into the tail, Easy barely reaches at all — the
    // relaxation promise applies to how hard the generator digs, not just to
    // the shape it digs in.
    const at = (mode: Parameters<typeof generationForLevel>[1]) =>
      generationForLevel(2001, mode).sampleSize!;
    expect(at('fiendish')).toBeGreaterThan(at('classic'));
    expect(at('classic')).toBeGreaterThan(at('gentle'));
  });

  /**
   * The ramp used to stop at 32× each mode's start — best-of-24 by fiendish
   * 1280, every level past it statistically identical. The caps now sit where
   * roughly level one million lands, so the late game keeps climbing for as
   * long as anyone can conceivably play. The mid-game values are pinned
   * byte-for-byte: the cap is deliberately decoupled from the slope, because
   * a steeper slope would silently repoint every level above `start`.
   */
  it('keeps growing to about level one million, without moving the mid-game', () => {
    // Unchanged below the old plateau — the exact values the old ramp gave.
    expect(generationForLevel(501, 'fiendish').sampleSize).toBe(20);
    expect(generationForLevel(1281, 'fiendish').sampleSize).toBe(24);
    expect(generationForLevel(801, 'classic').sampleSize).toBe(15);
    expect(generationForLevel(1601, 'gentle').sampleSize).toBe(8);

    // Past the old plateau the ramp keeps climbing instead of stopping…
    expect(generationForLevel(5001, 'fiendish').sampleSize).toBe(30);

    // …until the cap, which lands at roughly a million in every mode.
    expect(generationForLevel(1_000_001, 'gentle').sampleSize).toBe(16);
    expect(generationForLevel(1_000_001, 'classic').sampleSize).toBe(40);
    expect(generationForLevel(1_000_001, 'fiendish').sampleSize).toBe(55);
    expect(generationForLevel(2_000_001, 'fiendish').sampleSize).toBe(56);
  });

  /**
   * Every level the gate is asked for, it can deliver.
   *
   * **There is no difficulty floor at all, and that is the design.** One was
   * tried and removed: it rejected 27 of 30 boards at classic 201, because
   * capacity-4 boards land on their median nearly every time and a bar above
   * that median is a bar almost nothing clears. A rejected board is not a
   * harder board — it is a level that falls back to whatever the fallback
   * ranking liked. Reaching upward is `sampleSize`'s job, and this game has no
   * fail state and no timer, so a board that falls together easily is a short
   * pleasant one rather than a defect. The stars already say what a run was
   * worth.
   */
  it('accepts a board at every level, in every mode', () => {
    for (const mode of DIFFICULTIES) {
      for (const level of [1, 55, 201, 501, 905, 1501, 5001]) {
        const { report } = generateLevel(level, mode);
        expect({ mode, level, accepted: report.accepted }).toEqual({
          mode,
          level,
          accepted: true,
        });
      }
    }
  }, 120_000);

  /**
   * No floor still must not mean a board that is over before it starts. The
   * guard is selection rather than rejection — the hardest of the sample — and
   * this pins that it is enough on the smallest boards in the game, which are
   * where a trivial one could actually appear.
   */
  it('never opens on a board that is nearly solved already', () => {
    for (const mode of DIFFICULTIES) {
      for (let level = 1; level <= 12; level++) {
        const { report } = generateLevel(level, mode);
        expect({ mode, level, tooEasy: report.lowerBound < 5 }).toEqual({
          mode,
          level,
          tooEasy: false,
        });
      }
    }
  });

  it('relaxes on a breather', () => {
    // An easier row, no selection pressure, and slack on the look.
    const breather = generationForLevel(1310, 'fiendish');
    const normal = generationForLevel(1311, 'fiendish');
    expect(breather.sampleSize!).toBeLessThan(normal.sampleSize!);
    expect(breather.maxLongRunMass!).toBeGreaterThan(normal.maxLongRunMass!);
  });
});

/**
 * The complaint this rewrite answers: "almost all vials have similar colour
 * patterns". They did, and it was structural — a uniform reverse walk
 * preserves whatever sits under the run it lifts, so the long runs a solved
 * board starts with survived the scramble. A real level-905 board carried a
 * 3-run in 6.4 of 13 tubes with a third of its segments stacked.
 */
describe('boards do not start half-sorted', () => {
  const stacked = (state: { tubes: readonly (readonly number[])[] }) => {
    let tubes = 0;
    for (const tube of state.tubes) {
      let best = 0;
      let run = 0;
      for (let i = 0; i < tube.length; i++) {
        run = i > 0 && tube[i] === tube[i - 1] ? run + 1 : 1;
        best = Math.max(best, run);
      }
      if (best >= 3) tubes++;
    }
    return tubes;
  };

  it('leaves almost nothing pre-stacked, at every level and mode', () => {
    for (const mode of DIFFICULTIES) {
      for (const level of [1, 205, 505, 905, 1505, 5005]) {
        const { state, report } = generateLevel(level, mode);
        // The gate's own measure, in segments.
        expect({ mode, level, mass: report.longRunMass }).toEqual({
          mode,
          level,
          mass: expect.any(Number),
        });
        expect(report.longRunMass).toBeLessThanOrEqual(state.capacity >= 5 ? 3 : 0);
        // And in tubes: at most one, against 6.4 of 13 before.
        expect(stacked(state)).toBeLessThanOrEqual(1);
        expect(report.solvedTubes).toBe(0);
      }
    }
  }, 120_000);

  it('holds capacity-4 boards at zero, which the walk reaches every time', () => {
    for (const level of [505, 905, 5005]) {
      const { state, report } = generateLevel(level, 'gentle');
      expect(state.capacity).toBe(4);
      expect(report.longRunMass).toBe(0);
      expect(stacked(state)).toBe(0);
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

  it('pins the board for level 30 against a recorded fingerprint, per mode', () => {
    // Not arbitrary: these are the values the generator produced when the
    // curves were frozen — re-recorded at version 2, which covers the mode
    // tables, the least-clumping walk and the selection ramp together. A
    // change here means saved progress now points at a different puzzle, and
    // needs a deliberate migration — not a re-recording.
    //
    // Gentle's is unchanged from version 1, and that is not a mistake: level
    // 30 is a breather, so it drops to a three-colour board, and three colours
    // leave the walk no clumps to avoid. The walk only diverges where there is
    // something to fix.
    //
    // The migration exists and has a handle: bump `GENERATOR_VERSION`, which
    // makes `loadProgress` drop every stored `best` (they measured boards that
    // no longer exist) while keeping levels, stars and paid bonuses, and makes
    // `loadSession` retire any level in progress. THEN re-record the
    // fingerprints below, with the bump in the same commit. The pair moves
    // together or the stamp is a lie.
    //
    // One pin per mode, because the curves are independent now — an edit to
    // the fiendish table cannot trip a classic-only pin.
    const fingerprint = (mode: (typeof DIFFICULTIES)[number]) =>
      generateLevel(30, mode)
        .state.tubes.map((tube) => tube.join(''))
        .join('|');

    expect(fingerprint('classic')).toBe('312||0010|3302|112|32');
    expect(fingerprint('gentle')).toBe('|1|2201|220|0101|');
    expect(fingerprint('fiendish')).toBe('221|220|104|0141||3340|334');
    expect(GENERATOR_VERSION).toBe(2);
  });

  /**
   * A second pin, on a level that is **not** a breather — and it exists
   * because the level-30 pin has a blind spot that let a real change through.
   *
   * Thirty is divisible by ten, so it is a breather in all three modes, and a
   * breather takes a different branch of the gate. Dropping the difficulty
   * floor moved every ordinary level in the game and left all three level-30
   * boards untouched, so the tripwire stayed green through a change it exists
   * to catch. Thirty-three takes the ordinary branch.
   *
   * Same rule as above: if this fails, bump `GENERATOR_VERSION` and re-record
   * both pins in the same commit.
   */
  it('pins an ordinary level too, not only a breather', () => {
    const fingerprint = (mode: (typeof DIFFICULTIES)[number]) =>
      generateLevel(33, mode)
        .state.tubes.map((tube) => tube.join(''))
        .join('|');

    expect(fingerprint('gentle')).toBe('2132|001|3321|23|001||');
    expect(fingerprint('classic')).toBe('|2210|2230|4|334|1140|4301');
    expect(fingerprint('fiendish')).toBe('54|3301||2214|1104|453|2235|005');
  });

  it('does not drift when levels are generated out of order', () => {
    const forwards = [1, 2, 3].map((n) => generateLevel(n, 'classic').state.tubes);
    const backwards = [3, 2, 1].map((n) => generateLevel(n, 'classic').state.tubes);

    expect(backwards.reverse()).toEqual(forwards);
  });
});
