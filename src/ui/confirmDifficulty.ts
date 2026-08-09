import { DIFFICULTY_INFO, type Difficulty } from '@/game/difficulty';
import { useGameStore } from '@/state/gameStore';
import { overlay } from '@/state/overlayStore';
import { firstUnsolved, progressFor } from '@/state/progress';
import { useSettingsStore } from '@/state/settingsStore';
import { plural } from '@/utils';

/**
 * Asks before changing mode, from wherever the change was started.
 *
 * Both places that offer the choice — the Stages tabs and the Settings
 * segmented control — go through this, so the two cannot drift. It is not a
 * courtesy prompt: a mode switch moves the player to a different level, since
 * each mode keeps its own unlocks and its own place, and it drops whatever was
 * in progress on the current board. Neither is obvious from a tab that looks
 * like a filter.
 *
 * Stores are read through `getState()` rather than subscribed to. This is
 * called from a press handler, and nothing here should re-render the screen
 * underneath the modal.
 */
export function confirmDifficultyChange(next: Difficulty): void {
  const { difficulty } = useSettingsStore.getState();
  if (difficulty === next) return;

  const game = useGameStore.getState();
  const moves = game.history.length;
  // The spare vial counts as progress too: taking it is a one-per-level
  // decision, and switching away quietly hands out a fresh one.
  const inProgress = moves > 0 || game.extraTaken;
  // Must match what `setDifficulty` will actually open, or the modal names one
  // level and the switch delivers another.
  const landing = firstUnsolved(progressFor(game.record, next));
  const info = DIFFICULTY_INFO[next];

  const where =
    landing === game.level
      ? `${info.title} is also on level ${landing}.`
      : `${info.title} picks up at level ${landing}.`;

  const warning = inProgress
    ? ` Level ${game.level} is ${plural(moves, 'move')} in and will start over.`
    : '';

  overlay.modal({
    title: `Switch to ${info.title}?`,
    body: `${info.detail}. ${where}${warning}`,
    confirmLabel: 'Switch',
    cancelLabel: 'Stay',
    // The settings store owns the mode; `gameStore` follows it through a
    // subscription, which is what reloads the board and clears the session.
    onConfirm: () => useSettingsStore.getState().setDifficulty(next),
  });
}
