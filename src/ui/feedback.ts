import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { TapOutcome } from '@/state/gameStore';
import { currentSettings } from '@/state/settingsStore';

/**
 * A tick, at a strength each platform can actually deliver.
 *
 * `selectionAsync` is the right call on iOS — the Taptic Engine renders it as a
 * crisp click. On Android it maps to `EFFECT_TICK`, which on a lot of hardware
 * is below the threshold of noticing with the phone in your hand, and the
 * feature reads as broken rather than as subtle. `impactAsync(Light)` is the
 * quietest Android effect that is reliably felt; on iOS the same call is
 * heavier than a selection should be, which is why this is split rather than
 * settled on one call for both.
 */
function tick(): void {
  if (Platform.OS === 'android') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    return;
  }
  void Haptics.selectionAsync();
}

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
    // A pour is the one moment the player is waiting to feel, so Android takes
    // the step up that its tick needed — Medium against iOS's Light, which
    // lands about the same in the hand.
    case 'poured':
      void Haptics.impactAsync(
        outcome.solved
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Platform.OS === 'android'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
      );
      break;
    // Picking a vial up and putting it back down are both things the player
    // did on purpose. Only `ignored` — a tap on empty glass with nothing
    // held — passes without a buzz.
    case 'selected':
    case 'deselected':
      tick();
      break;
    case 'illegal':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    default:
      break;
  }
}

/**
 * A tick for the board's own controls — undo, redo, hint, spare vial.
 *
 * Deliberately **not** every button in the app. It was, and that is what made
 * the setting feel broken: a buzz on every menu tap, every tab, every settings
 * row is constant background noise, and constant feedback carries no
 * information — after the fourth identical buzz on the way to the board, the
 * one that means "your pour landed" is just another one.
 *
 * So vibration is now a thing that happens while you are playing. The board
 * taps, the board's controls, and nothing else. Navigation, settings and the
 * shop are silent, and a player who wants to feel the game does not have to
 * feel the menus to get it.
 */
export function feedbackControl(): void {
  if (!currentSettings().haptics) return;
  tick();
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
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
