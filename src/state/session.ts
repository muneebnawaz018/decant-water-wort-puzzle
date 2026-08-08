import type { PourMove, WaterState } from '@/core/types';
import { applyPour } from '@/core/waterCore';
import { DIFFICULTIES, type Difficulty } from '@/game/difficulty';
import { isPaidSet } from '@/game/undoCost';
import { readJson, storage, writeJson } from './storage';

const KEY = 'session.v1';

/**
 * A level in progress, small enough to rewrite on every move.
 *
 * No board is stored, and that is the whole design. Level N in a mode is
 * rebuilt from its seed, so the moves made since are the only thing the save
 * cannot recompute — replaying them onto a freshly generated board reproduces
 * the position exactly. A board snapshot would be larger, would duplicate what
 * the generator already knows, and could drift out of step with it.
 *
 * Moves are flat `[from, to, from, to, …]` rather than objects. `count` is
 * whatever `applyPour` decides, so storing it invites a saved number and a
 * replayed number to disagree; leaving it out makes that impossible. The
 * longest solution measured over levels 1–1000 is 51 moves, so a worst-case
 * record is a hundred small integers — a rewrite costs less than the pour
 * animation it follows.
 */
export interface Session {
  difficulty: Difficulty;
  level: number;
  /** Flat pairs. Even indices are sources, odd are destinations. */
  moves: number[];
  /** The level's one spare vial, if it was taken. */
  extraTaken: boolean;
  /**
   * Depths already charged for, so a relaunch does not hand out free undos.
   *
   * It has to be stored for the same reason `paidBlocks` does on the progress
   * record: whether a move *can* be undone is derivable from the moves, whether
   * it has been *paid for* is not.
   *
   * Optional so a record written before undos cost anything still reads, and
   * so a caller building a `Session` by hand does not have to know about
   * charging. Absent means nothing has been paid, which is the safe reading.
   */
  paidUndos?: number[];
  /**
   * How many of the level's free undos have been spent.
   *
   * Stored for the same reason `paidUndos` is: the moves say what can be taken
   * back, not what taking it back has already cost. Without it a relaunch hands
   * the allowance out again.
   */
  freeUndosUsed?: number;
  /**
   * The level's one free hint, if it was spent.
   *
   * Stored for the same reason `extraTaken` is: it is a one-per-level decision,
   * and a per-level allowance that resets on relaunch is not an allowance. It
   * is also the cheaper half of the pair to leave unguarded — quitting to farm
   * hints is a slower exploit than quitting to farm vials, but it is the same
   * exploit, and the two should not disagree about whether it matters.
   *
   * A count now that hints are metered rather than one-shot. Records written
   * while this was `hintUsed: boolean` are read as 0 or 1 — `loadSession`
   * validates every field independently, so no key bump is needed and nobody's
   * position is discarded over a bookkeeping rename.
   */
  hintsUsed: number;
  /**
   * Positions a hint has already been delivered at, as `positionKey` strings.
   *
   * Stored for the same reason `paidUndos` is: undo can bring a position back
   * after a relaunch too, and a record that forgot its purchases would bill a
   * returning player for answers they already have.
   */
  paidHints?: string[];
}

function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

/**
 * The level in progress, or null if there is none worth restoring.
 *
 * Everything here is checked rather than trusted. The record survives app
 * upgrades, so it can outlive the shapes it was written against.
 */
export function loadSession(): Session | null {
  const stored = readJson<Partial<Session>>(KEY, {});
  const { difficulty, level, moves, extraTaken, paidUndos, freeUndosUsed } = stored;
  // Both spellings: `hintsUsed` is the count written now, `hintUsed` the
  // boolean this record carried when hints were one per level.
  const legacy = (stored as { hintUsed?: unknown }).hintUsed === true ? 1 : 0;
  const hintsUsed = (stored as { hintsUsed?: unknown }).hintsUsed;

  if (!isDifficulty(difficulty)) return null;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1) return null;
  if (!Array.isArray(moves) || moves.length % 2 !== 0) return null;
  if (!moves.every((n) => Number.isInteger(n) && n >= 0)) return null;

  const taken = extraTaken === true;
  const hinted =
    typeof hintsUsed === 'number' && Number.isInteger(hintsUsed) && hintsUsed >= 0
      ? hintsUsed
      : legacy;
  // A record written before undos were charged for has none of these, and an
  // empty set is the right reading of that: nothing has been paid.
  const paid = isPaidSet(paidUndos) ? paidUndos : [];
  const paidHintsStored = (stored as { paidHints?: unknown }).paidHints;
  const hintPositions =
    Array.isArray(paidHintsStored) && paidHintsStored.every((k) => typeof k === 'string')
      ? paidHintsStored
      : [];
  const freeUsed =
    typeof freeUndosUsed === 'number' &&
    Number.isInteger(freeUndosUsed) &&
    freeUndosUsed >= 0
      ? freeUndosUsed
      : 0;
  // Nothing done, nothing taken and nothing spent is the same as a fresh level.
  if (moves.length === 0 && !taken && hinted === 0) return null;

  return {
    difficulty,
    level,
    moves,
    extraTaken: taken,
    hintsUsed: hinted,
    paidHints: hintPositions,
    paidUndos: paid,
    freeUndosUsed: freeUsed,
  };
}

export function saveSession(session: Session): void {
  // An untouched level is not worth a record. Writing one would also mean a
  // stale entry survives every level that is opened and abandoned.
  if (session.moves.length === 0 && !session.extraTaken && session.hintsUsed === 0) {
    clearSession();
    return;
  }
  writeJson(KEY, session);
}

export function clearSession(): void {
  storage.remove(KEY);
}

/** `history` flattened for storage. */
export function packMoves(history: readonly PourMove[]): number[] {
  const packed: number[] = [];
  for (const move of history) packed.push(move.from, move.to);
  return packed;
}

/**
 * Replays saved moves onto a generated board.
 *
 * Returns null if any of them is not legal from the position before it, and
 * the caller starts the level fresh. That is the guard on determinism being
 * load-bearing: the curve, the salts, the generator and the RNG are all part
 * of the save format, so a change to any of them repoints level N at a
 * different puzzle and these moves stop making sense. A player should lose
 * their place, not meet a board the game cannot reason about.
 */
function replay(
  initial: WaterState,
  moves: readonly number[]
): { board: WaterState; history: PourMove[] } | null {
  let board = initial;
  const history: PourMove[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    const from = moves[i]!;
    const to = moves[i + 1]!;
    if (from >= board.tubes.length || to >= board.tubes.length) return null;

    const applied = applyPour(board, from, to);
    if (!applied) return null;

    board = applied.state;
    history.push(applied.move);
  }

  return { board, history };
}

/**
 * The board a saved session left behind, or null to start the level fresh.
 *
 * The spare vial is appended before the moves are replayed rather than at the
 * point it was taken. Indices survive that: it lands at the end, so no earlier
 * move can be referring to it, and every tube a move does name keeps its
 * position. `addTube` does the same to `initial` for exactly this reason —
 * undo replays from there too.
 */
export function restoreSession(
  session: Session,
  generated: WaterState
): { initial: WaterState; board: WaterState; history: PourMove[] } | null {
  const initial: WaterState = session.extraTaken
    ? { ...generated, tubes: [...generated.tubes, []] }
    : generated;

  const replayed = replay(initial, session.moves);
  if (!replayed) return null;

  return { initial, board: replayed.board, history: replayed.history };
}
