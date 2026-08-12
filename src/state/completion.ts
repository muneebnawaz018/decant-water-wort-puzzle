import { track } from '@/analytics';
import { dayIndex } from '@/game/dailyPuzzle';
import type { Difficulty } from '@/game/difficulty';
import { EARNINGS } from '@/game/economy';
import { coinsForImprovement, milestoneBonus } from '@/game/stars';
import { skinsUnlockedBetween } from '@/theme/skins';
import { useBonusStore } from './bonusStore';
import { useEconomyStore } from './economyStore';
import { overlay } from './overlayStore';
import {
  furthestAcrossModes,
  markBlockPaid,
  progressFor,
  recordCompletion,
  saveProgress,
  starsInBlock,
  unpaidBlockFor,
  type ProgressByDifficulty,
} from './progress';

/**
 * Everything that happens when a board is solved, in one place.
 *
 * It used to live inside `gameStore` as four closures and a mutable, and the
 * block that drove them was **written out twice, identically** — once in
 * `tapTube` and once in `redo`, because a redone final move wins a level just
 * as a tapped one does. Thirty-five lines of payment ordering duplicated is
 * thirty-five lines that can drift, and the half that drifts is the half
 * nobody re-reads.
 *
 * The mutable is the other thing this removes. `settleUp` wrote what it had
 * paid into a `lastPayout` variable captured in the store's closure, and the
 * `set()` call read it back a few lines later — a value passed between two
 * functions through a shared slot rather than through a return. It worked
 * because nothing here is concurrent. `settleCompletion` returns the number
 * instead.
 *
 * These are side effects, not calculations, so this sits in `src/state`
 * alongside the stores it coordinates rather than in `src/game`.
 */

/** What a finished board did to the record and to the wallet. */
export interface Settlement {
  /** The record to store — the completion, plus any milestone mark. */
  record: ProgressByDifficulty;
  /**
   * Coins for the level itself, which is what the Complete screen shows.
   *
   * **Not including the milestone bonus**, deliberately. A block bonus is
   * announced by its own toast and belongs to the block rather than to this
   * level; adding it here would make the win screen claim a number the level
   * did not pay.
   */
  payout: number;
}

/** The part of the game state a completion is settled against. */
export interface CompletionContext {
  record: ProgressByDifficulty;
  difficulty: Difficulty;
  level: number;
  /** A daily brew, which pays differently and is filed nowhere. */
  bonus: boolean;
}

/**
 * Settles a solved board: records it, marks any block, pays out, toasts.
 *
 * Call only when the board is actually solved. Returns the record to write and
 * what the level paid, and performs the wallet and overlay side effects itself
 * — in an order that matters, described on `payFor` below.
 */
export function settleCompletion(
  context: CompletionContext,
  moves: number,
  stars: number
): Settlement {
  const { record, difficulty, level, bonus } = context;

  track('level_complete', { level, difficulty, stars, moves, bonus });

  // The bonus board pays flat and writes nothing to progress. `payFor` would
  // file it as a completion of whatever `level` happens to hold, which on a
  // bonus board is the day index.
  if (bonus) return { record, payout: payBonus(stars) };

  // Read before the completion is recorded — afterwards this level's entry is
  // the run that just finished, and the comparison is lost.
  const before = progressFor(record, difficulty).stars[level] ?? 0;
  const completed = recordCompletion(record, difficulty, level, moves, stars);

  const paid = payFor(completed, difficulty, level, stars, before);
  // Mark first, coins second — see `payFor` for why this order.
  saveProgress(paid.record);
  settleUp(paid);
  announceUnlocks(record, paid.record);

  return { record: paid.record, payout: paid.earned };
}

/** What `payFor` worked out, before any of it has been acted on. */
interface Payable {
  record: ProgressByDifficulty;
  earned: number;
  bonus: number;
  block: number | null;
}

/**
 * Everything a finished level pays — the level's own coins and the block of
 * ten it may have completed — computed against the record. **No coins move
 * here.** The caller persists the returned record and then calls `settleUp`,
 * in that order, and the order is the point: the paid mark and the level's
 * own result land on disk in one write *before* the wallet is touched. A
 * crash in the gap forfeits a payout; the other way round, the mark is lost
 * after the coins moved, and replaying the level mints the bonus again —
 * and that gap a player can aim for by killing the app on the win frame.
 * `payBonus` makes the same trade for the same reason.
 *
 * Both halves still pay once. The milestone has `paidBlocks`; the level
 * itself is guarded by its own previous star count, since a replay that does
 * no better has earned nothing new. `previousStars` has to be read *before*
 * the completion is recorded, which is why it is passed in rather than
 * looked up here — by the time this runs, `record` already holds the run
 * that just finished.
 */
function payFor(
  record: ProgressByDifficulty,
  mode: Difficulty,
  level: number,
  stars: number,
  previousStars: number
): Payable {
  const earned = coinsForImprovement(stars, previousStars);

  const progress = progressFor(record, mode);
  const block = unpaidBlockFor(progress, level);
  const bonus = block === null ? 0 : milestoneBonus(block, starsInBlock(progress, block));

  return {
    record: block !== null && bonus > 0 ? markBlockPaid(record, mode, block) : record,
    earned,
    bonus,
    block,
  };
}

/**
 * The coins `payFor` computed, paid once the marked record is on disk.
 *
 * Landing them the moment the board is solved rather than on the Complete
 * screen, so a player who backs out during the win animation keeps them.
 */
function settleUp(paid: Payable): void {
  if (paid.earned > 0) useEconomyStore.getState().add(paid.earned);
  if (paid.block !== null && paid.bonus > 0) {
    useEconomyStore.getState().add(paid.bonus);
    // **Queued, not toasted.** The coins land here on purpose, but "here" is
    // the moment the board solves — which is the *start* of the winning pour,
    // a whole `POUR_MS` before the Complete screen exists. Toasted now, the
    // message appeared over the board mid-pour and had faded before the player
    // reached anywhere it made sense. `CompleteScreen` flushes the queue.
    overlay.queueToast(`Block ${paid.block} complete · +${paid.bonus} coins`);
  }
}

/**
 * Announce any skin this completion just unlocked.
 *
 * The frontier only ever advances, so the crossing itself is the once-only
 * event and nothing needs storing.
 *
 * **Queued behind the milestone message rather than timed after it.** Level 50
 * completes block 5, so both fire on exactly the levels a skin unlocks on, and
 * two toasts racing means the later one replaces the earlier — a reward nobody
 * sees is not a reward. This used to be a `setTimeout` at 3200ms, a number
 * chosen to clear the win animation and the other toast, which meant it had to
 * be re-guessed whenever either moved. The queue orders them by arrival and
 * `flushToasts` spaces them, so there is no number to keep in sync.
 *
 * It also removes a Jest workaround: the old timer held the worker open, and
 * the hint-sweep test — which crosses every unlock threshold — leaked three of
 * them and needed an `unref` cast to stay quiet.
 */
function announceUnlocks(before: ProgressByDifficulty, after: ProgressByDifficulty): void {
  const unlocked = skinsUnlockedBetween(
    furthestAcrossModes(before),
    furthestAcrossModes(after)
  );
  for (const skin of unlocked) {
    overlay.queueToast(`${skin.name} unlocked · equip it in the Shop`);
  }
}

/**
 * What finishing the daily bonus puzzle pays.
 *
 * **On stars, at `bonusPuzzlePerStar` each**, so 40, 80 or 120. It used to be
 * a flat 120 on the reasoning that the brew was always the hardest board the
 * generator makes, where a rating would mostly measure patience. The brew
 * follows the player now, so a flat payout would hand the same coins to a
 * six-colour board and a twelve-colour one.
 *
 * Stars are already how this game says how well a board was played, and they
 * need no separate difficulty dial bolted on: there is no fail state, so a
 * finished brew always pays at least one star's worth.
 *
 * Nothing is written to `progress` — the board is not a level, so it unlocks
 * nothing and belongs in no star total. `bonusStore` holds the only record of
 * it, which is also the cooldown.
 *
 * Ordered so the mark lands first: `complete` is idempotent within a day, so
 * a second call cannot pay twice however the win path is re-entered — and a
 * redo of the winning pour does re-enter it.
 */
function payBonus(stars: number): number {
  const store = useBonusStore.getState();
  const now = Date.now();
  if (!store.available(now) && store.solvedDay === dayIndex(now)) return 0;

  const paid = Math.max(1, Math.floor(stars)) * EARNINGS.bonusPuzzlePerStar;
  store.complete(now);
  useEconomyStore.getState().add(paid);
  return paid;
}
