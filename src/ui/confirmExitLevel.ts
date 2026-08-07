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
    title: `Leave level ${game.level}?`,
    body: started
      ? `You are ${plural(moves, 'move')} in. Your progress is saved — the board will be waiting exactly as you left it.`
      : 'You have not made a move yet. The level will be here whenever you come back.',
    confirmLabel: 'Leave',
    // One word, like every other dialog here. The buttons split the card in
    // half — about 113dp each — so a two-word label wraps to two lines and the
    // pair stops matching. `confirmDifficultyChange` already says `Stay` for
    // the same "don't go" answer, so the two dialogs read alike.
    cancelLabel: 'Stay',
    onConfirm: leave,
  });
}
