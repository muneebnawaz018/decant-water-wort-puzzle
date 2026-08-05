import * as Haptics from 'expo-haptics';

import type { TapOutcome } from '@/state/gameStore';
import { currentSettings } from '@/state/settingsStore';

/**
 * Haptics for a tap outcome, doc §7. Settings are read at call time rather
 * than subscribed to — a toggle should not re-render the board.
 *
 * Sound is not wired yet: there are no audio assets in the project. The
 * toggle exists and persists, and this is where `expo-audio` will hook in.
 */
export function feedbackFor(outcome: TapOutcome): void {
  if (!currentSettings().haptics) return;

  switch (outcome.kind) {
    case 'poured':
      Haptics.impactAsync(
        outcome.solved
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light
      );
      break;
    case 'selected':
      Haptics.selectionAsync();
      break;
    case 'illegal':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    default:
      break;
  }
}

/** A light tick for chrome taps — buttons, switches, tiles. */
export function feedbackTap(): void {
  if (!currentSettings().haptics) return;
  Haptics.selectionAsync();
}
