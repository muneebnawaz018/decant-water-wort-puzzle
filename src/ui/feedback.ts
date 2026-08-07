import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { TapOutcome } from '@/state/gameStore';
import { currentSettings } from '@/state/settingsStore';

/**
 * A tick, at a strength each platform can actually deliver.
 *
 * The two platforms are split because one call cannot serve both, and the
 * Android side is set from what the module actually does rather than from what
 * the name suggests. `expo-haptics` builds every Android effect as a waveform
 * with an explicit amplitude out of 255, and they are *quiet*: `light` is 50ms
 * at 30/255, about 12% of what the motor can do; `medium` is 43ms at 50; `heavy`
 * is 60ms at 70. Only the top of that range is reliably felt with the phone in
 * your hand, so the ladder here sits one step above where the names imply.
 *
 * iOS is the opposite problem — the Taptic Engine renders `selectionAsync` as a
 * crisp click, and `impactAsync` at the same point in the ladder is heavier than
 * a selection should be.
 */
function tick(): void {
  if (Platform.OS === 'android') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    // the step up that its tick needed — Heavy against iOS's Light, which lands
    // about the same in the hand once the amplitudes above are accounted for.
    //
    // The board being solved answers with a *pattern* rather than a bigger
    // pulse. Android has nothing above Heavy, so a stronger single buzz is not
    // available to escalate to; `Success` is two pulses 100ms apart, which
    // cannot be mistaken for the pour it follows on either platform.
    case 'poured':
      if (outcome.solved) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(
          Platform.OS === 'android'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Light
        );
      }
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
