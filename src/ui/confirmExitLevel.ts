import { useGameStore } from '@/state/gameStore';
import { overlay } from '@/state/overlayStore';
import { plural } from '@/utils';

/**
 * Asks before leaving the board.
 *
 * Both ways out — the header's back button and Android's back press — go
 * through this, so the two cannot disagree. Leaving is cheap: the level in
 * progress is written to `session.v1` after every pour, so the board comes back
 * exactly as it was. The modal exists because a back press on a puzzle you are
 * forty moves into is nearly always a mis-tap, and nothing on screen says the
 * position survives it.
 *
 * It asks on an untouched board too. Skipping the prompt there was tried and is
 * worse in the hand: back sometimes opens a dialog and sometimes does not, and
 * which one you get depends on state the player is not tracking. One answer
 * every time is the predictable one, and the cost is a single tap on the way
 * out of a level nobody had started.
 *
 * The game store is read through `getState()` — this runs from a press handler
 * and must not re-render the board underneath the modal.
 */
export function confirmExitLevel(leave: () => void): void {
  const game = useGameStore.getState();
  const moves = game.history.length;
  // The spare vial counts as progress too: it is a one-per-level decision, so
  // a level that has taken one is not the level a fresh open would hand back.
  const started = moves > 0 || game.extraTaken;

  overlay.modal({
    // The bonus board has no level number worth showing. `level` still holds
    // one — it is the day index, which is how the generator seeds the puzzle —
    // and printing it asked the player to leave level 20676. The header already
    // calls this board by name; the dialog uses the same words.
    title: game.bonus ? "Leave today's brew?" : `Leave level ${game.level}?`,
    body: bodyFor(game.bonus, started, moves),
    confirmLabel: 'Leave',
    // One word, like every other dialog here. The buttons split the card in
    // half — about 113dp each — so a two-word label wraps to two lines and the
    // pair stops matching. `confirmDifficultyChange` already says `Stay` for
    // the same "don't go" answer, so the two dialogs read alike.
    cancelLabel: 'Stay',
    // Stay takes the lit face and the right slot. This dialog only appears
    // because a back press on a board is nearly always a mis-tap — the comment
    // above says so — and it makes no sense to open it and then emphasise the
    // mistake. See `destructive` on `ModalSpec`.
    destructive: true,
    onConfirm: leave,
  });
}

/**
 * What leaving actually costs, which is not the same on both boards.
 *
 * A level is written to `session.v1` after every pour, so "your progress is
 * saved" is a promise the store keeps. A bonus board is deliberately never
 * saved — `saveSession` returns early on it, because the record is keyed by
 * difficulty and level and a bonus board has neither — so the same sentence on
 * that board was a lie the player only discovers after acting on it.
 *
 * It is not lost for the day, though: `bonusStore.complete` runs on the solve
 * and nowhere else, so today's puzzle is still there. Only the moves go.
 */
function bodyFor(bonus: boolean, started: boolean, moves: number): string {
  if (!started) return 'No moves made yet.';
  if (bonus) return `${plural(moves, 'move')} in. Leaving starts the brew over.`;
  return `${plural(moves, 'move')} in. Your progress is saved.`;
}
