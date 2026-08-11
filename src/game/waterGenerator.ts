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
   *
   * Largely superseded by `maxLongRunMass`, which measures the same thing
   * without the blind spot — this check only ever saw a run of `capacity - 1`,
   * so a board of eleven 3-run tubes reported zero and passed. Kept because a
   * near-complete tube is worth naming on its own, and it is what the daily
   * bonus was already tuned against.
   */
  maxCappedTubes?: number;
  /**
   * Segments allowed to start inside a run of three or more — see
   * `longRunMass`.
   *
   * The direct measure of "every vial looks the same", and the one the old
   * gate had no equivalent for. `scramble` now keeps this low by construction
   * rather than by rejection, so this is a backstop against an unlucky board
   * rather than the mechanism.
   *
   * **Unbounded by default.** The per-level ramp in `generationForLevel` sets
   * it, and both it and the ramp are part of the save format, so moving either
   * repoints boards and needs a `GENERATOR_VERSION` bump in the same commit.
   */
  maxLongRunMass?: number;
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
  /** Segments inside a run of three or more — see `longRunMass`. */
  longRunMass: number;
  reasons: string[];
}

const DEFAULTS: Required<Omit<AcceptanceOptions, 'minFragmentation'>> = {
  minMoves: 4,
  maxSolvedTubes: 1,
  maxCappedTubes: Infinity,
  maxLongRunMass: Infinity,
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

/** A run of this many identical segments is what reads as "already sorted". */
const CLUMP = 3;

/**
 * Segments sitting inside a run of `CLUMP` or more — how pre-played the board
 * looks, counted in segments rather than in tubes.
 *
 * **This is the measure the old gate was missing, and the reason boards looked
 * half-solved.** `isTubeCapped` could only see a run of `capacity - 1`, so a
 * board of eleven tubes each holding a 3-run under a stray segment reported
 * *zero* capped tubes and sailed through. Measured on a real level-905
 * fiendish board: 6.4 of 13 tubes carried a 3-run and 35% of all segments sat
 * inside one, which is exactly the "every vial looks the same" complaint.
 *
 * Counted in segments because tubes are too coarse — a 3-run and a 5-run are
 * both "one chunky tube" but not remotely the same board.
 */
function longRunMass(state: WaterState): number {
  let total = 0;
  for (const tube of state.tubes) {
    let i = 0;
    while (i < tube.length) {
      let j = i;
      while (j + 1 < tube.length && tube[j + 1] === tube[i]) j++;
      const length = j - i + 1;
      if (length >= CLUMP) total += length;
      i = j + 1;
    }
  }
  return total;
}

/**
 * How much pre-played mass an un-pour leaves behind, as a delta — O(1), with
 * no board copy.
 *
 * An un-pour only touches two runs, which is what makes this exact and cheap:
 * it lifts `count` off the source's uniform top run, and drops them on a
 * destination whose top is a different colour (`inverseMoves` refuses a
 * re-merge). So the source's top run shrinks from `run` to `run - count`, the
 * destination gains a run of exactly `count`, and nothing else on the board
 * moves. Scoring by rebuilding the state instead cost a full tube copy per
 * candidate, which is what made an exhaustive scan unaffordable and forced
 * sampling.
 */
function clumpDelta(state: WaterState, move: InversePour): number {
  const source = state.tubes[move.from]!;
  const run = topRun(source);
  const left = run - move.count;

  const before = run >= CLUMP ? run : 0;
  const after = left >= CLUMP ? left : 0;
  const gained = move.count >= CLUMP ? move.count : 0;

  return after - before + gained;
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

/**
 * Walks backwards from a solved board. Stops early if it paints itself in.
 *
 * **The walk picks the least-clumping un-pour, not a uniform random one, and
 * that single change is what stopped boards looking half-solved.**
 *
 * A uniform reverse walk is biased toward exactly the board the player
 * complained about, and the bias is structural rather than bad luck. An
 * un-pour lifts part of a uniform top run, so it *preserves* what is
 * underneath; the only move that clears a tube's bottom is one that empties it
 * outright, and that is a small slice of the move list. So the long runs the
 * solved board starts with survive the walk, and more steps do not help — the
 * distribution saturates. Measured at 12 colours, capacity 5: 130 steps and
 * 300 steps produce identical statistics, 9.1 of 13 tubes carrying a 3-run and
 * a third of all segments inside one.
 *
 * Scoring every candidate by `clumpDelta` and taking the best fixes it at the
 * source. Same shapes, same step counts, measured over 20 boards each:
 *
 * | 12 colours, cap 5 | uniform | least-clumping |
 * | ----------------- | ------- | -------------- |
 * | tubes with a 3-run| 9.1     | 0.85           |
 * | segments in runs  | 32.1    | 2.5            |
 * | fragmentation     | 0.44    | 0.55           |
 * | par               | 20      | 27             |
 *
 * Par going **up** is the part worth keeping in mind: a board that looks
 * pre-played largely is pre-played, so un-clumping it is not cosmetic — it
 * hands back the moves the clumps had already made for the player.
 *
 * A random deal was the other candidate and lost on cost, not on looks. It
 * cannot reach a one-spare board at all (0% of random deals are solvable
 * there) and its boards run par ~49, where the exact-par search costs 4
 * seconds at p95 on a laptop against 2ms here — unaffordable on a phone, and
 * par now feeds the hint plan as well as the star rating.
 *
 * Ties are broken randomly, which is what keeps the walk a walk. Picking the
 * first best move instead makes the whole board a function of tube order.
 */
export function scramble(state: WaterState, steps: number, rng: Rng): WaterState {
  let current = state;

  for (let step = 0; step < steps; step++) {
    const moves = inverseMoves(current);
    if (moves.length === 0) break;

    let best = Infinity;
    const tied: InversePour[] = [];
    for (const move of moves) {
      const delta = clumpDelta(current, move);
      if (delta > best) continue;
      if (delta < best) {
        best = delta;
        tied.length = 0;
      }
      tied.push(move);
    }

    current = applyInverse(current, rng.pick(tied));
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
  const clumped = longRunMass(state);

  if (solvedTubes > config.maxSolvedTubes) {
    reasons.push(`${solvedTubes} tubes already solved`);
  }
  if (cappedTubes > config.maxCappedTubes) {
    reasons.push(`${cappedTubes} tubes one pour from solved`);
  }
  if (clumped > config.maxLongRunMass) {
    reasons.push(`${clumped} segments already stacked in runs`);
  }
  /**
   * The difficulty floor, and it is measured in pours rather than in shape.
   *
   * `moveLowerBound` never overestimates the true optimum, so a floor here is
   * a floor on par itself — the honest difficulty dial doc §5 asked for and
   * the code substituted fragmentation for, on the grounds that an optimal
   * search was unaffordable. Half of that is still true: the *exact* search
   * costs up to seconds, so it stays off the load path. The bound costs a
   * pass over the tubes, and on a well-mixed board it lands within a few
   * moves of the optimum, which is close enough to gate on.
   */
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
    longRunMass: clumped,
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
   * Fallback ranking, for when no attempt clears the gate: closest to the gate
   * first, by the gate's own priorities rather than by fragmentation alone.
   *
   * Ranked purely on fragmentation, an unsatisfiable gate handed back a
   * high-fragmentation board that was still visibly pre-played — the exact
   * board the tier was written to refuse. Stacked mass leads, then the
   * near-solved counts, with fragmentation as the tie-break. Only excess above
   * each allowance counts, so a loose gate ranks by fragmentation exactly as
   * it always did.
   */
  const over = (value: number, allowance: number | undefined): number =>
    allowance === undefined || !Number.isFinite(allowance)
      ? 0
      : Math.max(0, value - allowance);

  const penalty = (report: AcceptanceReport): number =>
    over(report.longRunMass, merged.maxLongRunMass) * 4 +
    over(report.cappedTubes, merged.maxCappedTubes) * 3 +
    over(report.solvedTubes, merged.maxSolvedTubes) * 5 +
    // Short of the difficulty floor is a shortfall like any other, and it was
    // missing here: a board rejected for being too easy fell through to a
    // ranking that did not look at difficulty at all, so the fallback could
    // hand back the easiest board of the batch.
    over(merged.minMoves ?? 0, report.lowerBound) * 2;

  const better = (candidate: AcceptanceReport, incumbent: AcceptanceReport): boolean => {
    const gap = penalty(candidate) - penalty(incumbent);
    if (gap !== 0) return gap < 0;
    if (candidate.lowerBound !== incumbent.lowerBound) {
      return candidate.lowerBound > incumbent.lowerBound;
    }
    return candidate.fragmentation > incumbent.fragmentation;
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Vary the seed per attempt, but stay deterministic for a given level.
    const rng = createRng((seed + attempt * 0x9e3779b9) >>> 0);
    const state = scramble(buildSolved(params, rng), params.scrambleSteps, rng);
    const report = isAcceptable(state, merged);
    const candidate = { state, report, attempt: attempt + 1 };

    if (report.accepted) {
      /**
       * Keep the *hardest* board of the sample, not the most fragmented one.
       *
       * Fragmentation was only ever a proxy for difficulty, and a loose one —
       * it counts how broken up the board is without regard for how much work
       * that is to undo. `lowerBound` is the fewest pours that can finish the
       * board, and on the un-clumped boards the walk now produces it sits
       * within a move or two of the true optimum, so this ranks candidates by
       * the thing the player actually experiences. Ties go to the more
       * fragmented board, which is the old rule doing what it is good at:
       * telling two equally long boards apart by how mixed they look.
       */
      const best = bestAccepted?.report;
      const harder =
        !best ||
        report.lowerBound > best.lowerBound ||
        (report.lowerBound === best.lowerBound &&
          report.fragmentation > best.fragmentation);
      if (harder) bestAccepted = candidate;
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
