import { createRng, seedForLevel, type Rng } from '@/core/rng';
import { fragmentation, moveLowerBound, solve } from '@/core/solver';
import type { Colour, LevelParams, WaterState } from '@/core/types';
import { isTubeComplete, topRun } from '@/core/waterCore';
import { DEFAULT_DIFFICULTY, DIFFICULTY_SALT, type Difficulty } from './difficulty';
import { generationForLevel } from './levelParams';

export interface InversePour {
  from: number;
  to: number;
  count: number;
}

export interface AcceptanceOptions {
  /** Floor on the true minimum-pour lower bound. */
  minMoves?: number;
  /** Board must be at least this broken up, on 0..1. Doc §5 asks for 60%. */
  minFragmentation?: number;
  /** Tubes allowed to start already finished. Doc §5 allows one freebie. */
  maxSolvedTubes?: number;
  /**
   * Tubes allowed to start one lift from finished.
   *
   * A full-height run of one colour under a single foreign segment. Doc §5 has
   * no word for these and the gate could not see them: `isTubeComplete` is
   * false, so a board of five of them reported `solvedTubes: 0` and passed.
   * They are not "nearly solved" in the sense of being a bit easier — they are
   * *done*, one obvious pour each, and a board carrying five reads as half
   * already played before the player has touched it.
   *
   * Reverse-generation produces them by construction, which is why there are so
   * many: an un-pour lifts a whole run only when the tube empties, so the
   * common shape it leaves behind is a full run with one segment dropped on
   * top. Measured at capacity 5 with 12 colours the median board has five, and
   * a longer scramble does not help — 400 steps gives the same distribution as
   * 130, because each extra step is as likely to cap a tube as to uncap one.
   *
   * **Unbounded by default.** The per-level gate ramp in `generationForLevel`
   * is what sets it for high levels, and the daily bonus sets it outright —
   * both are part of the save format, so moving either repoints boards and
   * needs a `GENERATOR_VERSION` bump in the same commit.
   */
  maxCappedTubes?: number;
  /** Node ceiling for the solvability check. */
  nodeBudget?: number;
}

export interface GenerateOptions extends AcceptanceOptions {
  /** Attempts before giving up on the gate and returning the best board seen. */
  maxAttempts?: number;
  /**
   * Boards to try before settling, even once one passes. Taking the best of a
   * handful costs a fraction of a millisecond and noticeably lifts the median
   * board — the first board over the bar is usually only just over it.
   */
  sampleSize?: number;
  /**
   * Board shape, overriding the level curve.
   *
   * For boards that are not a level: the daily bonus puzzle is one board a day
   * at a fixed, hard shape, and it has no place on a curve that exists to ramp
   * a player up over hundreds of levels. Everything else is unchanged — the
   * same reverse-generation, the same acceptance gate, the same solvability
   * guarantee — so a board built this way is as trustworthy as any other.
   */
  params?: LevelParams;
  /**
   * Seed, overriding `seedForLevel`.
   *
   * Same reason. A bonus board is keyed by the day rather than by a level
   * number, and reusing the level seed would hand out level N's board.
   */
  seed?: number;
}

export interface AcceptanceReport {
  accepted: boolean;
  solvable: boolean;
  lowerBound: number;
  fragmentation: number;
  solvedTubes: number;
  /** Tubes one pour from finished — see `maxCappedTubes`. */
  cappedTubes: number;
  reasons: string[];
}

const DEFAULTS: Required<Omit<AcceptanceOptions, 'minFragmentation'>> = {
  minMoves: 4,
  maxSolvedTubes: 1,
  // See `maxCappedTubes`. Off for levels because the gate is part of the save
  // format in practice — a stricter one repoints every board in the game.
  maxCappedTubes: Infinity,
  nodeBudget: 200_000,
};

/**
 * Doc §5 wants 60% broken up. Capacity-4 boards clear that easily. Capacity-5
 * boards cannot: a colour spans 5 segments instead of 4, so reverse-generation
 * runs out of room and lands between 0.50 and 0.68 measured over 1000 levels.
 * The floor tracks capacity so a board is judged against what its shape can
 * actually produce, and `generateLevel` takes the best of several attempts
 * rather than the first that clears the bar.
 *
 * At capacity 5 this check does little — difficulty there comes from 11 or 12
 * colours sharing a single spare tube, not from fragmentation. Solvability and
 * the already-solved-tube check carry the gate on those levels.
 */
function defaultMinFragmentation(capacity: number): number {
  return capacity >= 5 ? 0.5 : 0.6;
}

/**
 * A tube one lift from finished: a full-height run of one colour, capped by at
 * most one segment of another.
 *
 * `capacity - 1` rather than `capacity`, because the cap is what stops
 * `isTubeComplete` from seeing it. A tube holding four 8s under a single 0 is
 * one pour from done and reads, on screen, as already sorted.
 */
function isTubeCapped(tube: readonly Colour[], capacity: number): boolean {
  if (tube.length < capacity - 1) return false;

  const run = tube.slice(0, capacity - 1);
  if (new Set(run).size !== 1) return false;
  // A genuinely finished tube is `maxSolvedTubes`' business, not this one.
  return tube.length !== capacity || tube[capacity - 1] !== run[0];
}

/** A solved board: one full tube per colour, plus the spare empties. */
export function buildSolved(params: LevelParams, rng: Rng): WaterState {
  const tubes: Colour[][] = [];
  for (let colour = 0; colour < params.colourCount; colour++) {
    tubes.push(Array<Colour>(params.capacity).fill(colour));
  }
  for (let extra = 0; extra < params.extraTubes; extra++) tubes.push([]);

  return {
    tubes: rng.shuffle(tubes),
    capacity: params.capacity,
    colourCount: params.colourCount,
    extraTubes: params.extraTubes,
  };
}

/**
 * Every legal un-pour from this board (doc §5). An inverse pour lifts k
 * segments off a uniform top and drops them somewhere they would not merge —
 * a destination whose top already matches would just undo itself next step.
 *
 * The doc's pseudocode is wrong on one point, and it matters: it allows taking
 * the whole top run off a tube that has other colours underneath. Pouring that
 * back is then illegal, because the source tube's new top no longer matches, so
 * the scramble can walk to a board with no path home. An un-pour is only sound
 * when it leaves part of the run behind, or empties the tube outright.
 */
export function inverseMoves(state: WaterState): InversePour[] {
  const moves: InversePour[] = [];

  for (let from = 0; from < state.tubes.length; from++) {
    const src = state.tubes[from]!;
    if (src.length === 0) continue;
    const run = topRun(src);
    const top = src[src.length - 1]!;

    for (let to = 0; to < state.tubes.length; to++) {
      if (to === from) continue;
      const dst = state.tubes[to]!;
      const space = state.capacity - dst.length;
      if (space === 0) continue;
      if (dst.length > 0 && dst[dst.length - 1] === top) continue; // would re-merge

      for (let count = 1; count <= Math.min(run, space); count++) {
        if (count === run) {
          // Taking the whole run only reverses if the tube empties.
          if (src.length !== run) continue;
          // And emptying one colour into an empty tube is a relabelling.
          if (dst.length === 0) continue;
        }
        moves.push({ from, to, count });
      }
    }
  }

  return moves;
}

export function applyInverse(state: WaterState, move: InversePour): WaterState {
  const tubes = state.tubes.map((tube) => tube.slice());
  const moved = tubes[move.from]!.splice(tubes[move.from]!.length - move.count, move.count);
  tubes[move.to]!.push(...moved);
  return { ...state, tubes };
}

/** Walks backwards from a solved board. Stops early if it paints itself in. */
export function scramble(state: WaterState, steps: number, rng: Rng): WaterState {
  let current = state;
  for (let step = 0; step < steps; step++) {
    const moves = inverseMoves(current);
    if (moves.length === 0) break;
    current = applyInverse(current, rng.pick(moves));
  }
  return current;
}

/**
 * Acceptance gate, doc §5.
 *
 * Deviation worth knowing: the doc phrases the third check as "reachable in
 * under 60% of the scramble steps applied". Measuring that needs an optimal
 * solution length, and optimal search on a 12-colour board is not affordable.
 * Fragmentation is the stand-in — same 60% intent, scale-free, and exact.
 */
export function isAcceptable(
  state: WaterState,
  options: AcceptanceOptions = {}
): AcceptanceReport {
  const config = {
    ...DEFAULTS,
    minFragmentation: defaultMinFragmentation(state.capacity),
    ...options,
  };
  const reasons: string[] = [];

  const solvedTubes = state.tubes.filter((tube) =>
    isTubeComplete(tube, state.capacity)
  ).length;
  const cappedTubes = state.tubes.filter((tube) =>
    isTubeCapped(tube, state.capacity)
  ).length;
  const lowerBound = moveLowerBound(state);
  const spread = fragmentation(state);

  if (solvedTubes > config.maxSolvedTubes) {
    reasons.push(`${solvedTubes} tubes already solved`);
  }
  if (cappedTubes > config.maxCappedTubes) {
    reasons.push(`${cappedTubes} tubes one pour from solved`);
  }
  if (lowerBound < config.minMoves) {
    reasons.push(`needs only ${lowerBound} moves`);
  }
  if (spread < config.minFragmentation) {
    reasons.push(`fragmentation ${spread.toFixed(2)} below ${config.minFragmentation}`);
  }

  // Solvability last — it is the expensive check.
  const solvable =
    reasons.length > 0
      ? true
      : solve(state, { nodeBudget: config.nodeBudget }).moves !== null;
  if (!solvable) reasons.push('no solution found within the node budget');

  return {
    accepted: reasons.length === 0,
    solvable,
    lowerBound,
    fragmentation: spread,
    solvedTubes,
    cappedTubes,
    reasons,
  };
}

export interface GeneratedLevel {
  level: number;
  difficulty: Difficulty;
  seed: number;
  params: LevelParams;
  state: WaterState;
  attempts: number;
  report: AcceptanceReport;
}

/**
 * Generates the board for a level. Seeded by level number and difficulty, so
 * level N in a given mode is the same board on every device and every install
 * — no board data is ever stored or synced (doc §5).
 */
export function generateLevel(
  level: number,
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
  options: GenerateOptions = {}
): GeneratedLevel {
  // A real level brings its own gate from the curve — see `generationForLevel`,
  // which is how difficulty keeps growing after the shape params max out. A
  // caller that supplies `params` is building a board that is not a level (the
  // daily bonus) and owns its gate outright; deriving one from a day number
  // would be nonsense.
  const derived = options.params ? {} : generationForLevel(level, difficulty);
  const merged: GenerateOptions = { ...derived, ...options };

  const maxAttempts = merged.maxAttempts ?? 40;
  const sampleSize = merged.sampleSize ?? 8;
  const params = merged.params!;
  const seed = merged.seed ?? seedForLevel(level, DIFFICULTY_SALT[difficulty]);

  let bestAccepted: {
    state: WaterState;
    report: AcceptanceReport;
    attempt: number;
  } | null = null;
  let bestOverall: {
    state: WaterState;
    report: AcceptanceReport;
    attempt: number;
  } | null = null;

  /**
   * Fallback ranking, for when no attempt clears the gate: closest to the
   * gate first, by the gate's own priorities. Capped tubes outrank
   * fragmentation because they are what the tight tiers exist to squeeze —
   * ranked by fragmentation alone, an unsatisfiable gate handed back a
   * high-fragmentation board carrying four pre-played tubes, which is the
   * exact board the tier was written to refuse. Only excess above the
   * allowance counts, so a loose gate leaves the old fragmentation ranking
   * untouched.
   */
  const cappedAllowance = merged.maxCappedTubes ?? Infinity;
  const better = (candidate: AcceptanceReport, incumbent: AcceptanceReport): boolean => {
    const excess = (report: AcceptanceReport): number =>
      Number.isFinite(cappedAllowance)
        ? Math.max(0, report.cappedTubes - cappedAllowance)
        : 0;
    if (excess(candidate) !== excess(incumbent))
      return excess(candidate) < excess(incumbent);
    return candidate.fragmentation > incumbent.fragmentation;
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Vary the seed per attempt, but stay deterministic for a given level.
    const rng = createRng((seed + attempt * 0x9e3779b9) >>> 0);
    const state = scramble(buildSolved(params, rng), params.scrambleSteps, rng);
    const report = isAcceptable(state, merged);
    const candidate = { state, report, attempt: attempt + 1 };

    if (report.accepted) {
      if (!bestAccepted || report.fragmentation > bestAccepted.report.fragmentation) {
        bestAccepted = candidate;
      }
      // Enough good boards seen; take the best of them.
      if (attempt + 1 >= sampleSize) break;
    }
    if (!bestOverall || better(report, bestOverall.report)) {
      bestOverall = candidate;
    }
  }

  const chosen = bestAccepted ?? bestOverall!;
  return {
    level,
    difficulty,
    seed,
    params,
    state: chosen.state,
    attempts: chosen.attempt,
    report: chosen.report,
  };
}
