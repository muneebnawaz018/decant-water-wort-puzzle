import * as Haptics from 'expo-haptics';

import type { TapOutcome } from '@/state/gameStore';
import { currentSettings } from '@/state/settingsStore';

/**
 * Haptics for a tap outcome, doc §7. Settings are read at call time rather
 * than subscribed to — a toggle should not re-render the board.
 *
 * Sound belongs here too and is not wired: the synthesised set built for it
 * was not good enough to ship, and real recordings have not landed yet. The
 * Settings rows are marked "Soon" rather than offering a switch that does
 * nothing. `script/prepare-sounds.py` is the tool for when they arrive; this
 * function is where playback hooks back in, beside the matching haptic.
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
    // Picking a vial up and putting it back down are both things the player
    // did on purpose. Only `ignored` — a tap on empty glass with nothing
    // held — passes without a buzz.
    case 'selected':
    case 'deselected':
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

/**
 * A control that was pressed but could not do its job — a hint with no pour
 * left, a second spare vial on a level that already has one.
 *
 * Distinct from `feedbackTap` on purpose. Both are real presses, so both get
 * something; answering a refusal with the same tick as a success teaches the
 * player nothing, and the toast that explains it is easy to miss mid-board.
 */
export function feedbackWarn(): void {
  if (!currentSettings().haptics) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
