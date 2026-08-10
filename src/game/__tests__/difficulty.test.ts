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
 * spares floor at 1 — so what keeps climbing after a curve tops out is the
 * acceptance gate, and these pin that it actually engages.
 */
describe('the gate ramp', () => {
  it('leaves gentle, the early game, and breathers untightened', () => {
    expect(generationForLevel(2000, 'gentle').minFragmentation).toBeUndefined();
    expect(generationForLevel(400, 'classic').minFragmentation).toBeUndefined();
    expect(generationForLevel(300, 'fiendish').minFragmentation).toBeUndefined();
    // A breather keeps the loose gate along with its easier row.
    expect(generationForLevel(1310, 'fiendish').minFragmentation).toBeUndefined();
  });

  it('tightens monotonically with level', () => {
    const floors = [501, 701, 1001, 1501].map(
      (level) => generationForLevel(level, 'classic').minFragmentation!
    );
    for (let i = 1; i < floors.length; i++) {
      expect(floors[i]!).toBeGreaterThanOrEqual(floors[i - 1]!);
    }
    expect(generationForLevel(1501, 'fiendish').maxCappedTubes).toBeLessThan(
      generationForLevel(801, 'fiendish').maxCappedTubes!
    );
  });

  it('reaches the daily bonus construction at fiendish 1301+', () => {
    const gate = generationForLevel(1305, 'fiendish');
    expect(gate.maxSolvedTubes).toBe(0);
    expect(gate.maxCappedTubes).toBe(1);
  });

  it('generates boards that honour the tightened gate', () => {
    // The whole point, end to end: an endgame fiendish board starts with no
    // solved tube and — where the gate is satisfiable — barely any capped
    // ones. The untightened generator's median at this shape was five capped,
    // half the board pre-played.
    const { report } = generateLevel(905, 'fiendish');
    expect(report.solvedTubes).toBe(0);
    expect(report.cappedTubes).toBeLessThanOrEqual(2);
    expect(report.fragmentation).toBeGreaterThanOrEqual(0.55);
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
    // curves were frozen — re-recorded at version 2, when the modes got their
    // own tables and the gate ramp landed. A change here means saved progress
    // now points at a different puzzle, and needs a deliberate migration — not
    // a re-recording.
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

    // Classic is byte-identical to version 1 below level 501, on purpose —
    // it is the tuned curve, and this pin is the proof the rewrite kept it.
    expect(fingerprint('classic')).toBe('30|2221|10|3010||3231');
    expect(fingerprint('gentle')).toBe('|1|2201|220|0101|');
    expect(fingerprint('fiendish')).toBe('|2240|0143|4431|3301||2021');
    expect(GENERATOR_VERSION).toBe(2);
  });

  it('does not drift when levels are generated out of order', () => {
    const forwards = [1, 2, 3].map((n) => generateLevel(n, 'classic').state.tubes);
    const backwards = [3, 2, 1].map((n) => generateLevel(n, 'classic').state.tubes);

    expect(backwards.reverse()).toEqual(forwards);
  });
});
