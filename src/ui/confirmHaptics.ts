import { hapticsAvailability } from '../../modules/system-haptics';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { feedbackFor } from './feedback';

/**
 * Turning vibration on asks first; turning it off does not.
 *
 * The asymmetry is the point. Switching off is instant because the player has
 * just told you they want silence, and a dialog in the way of that is the app
 * arguing with them. Switching on gets the confirm, and the confirm earns its
 * place by ending in a buzz — the setting is about a sensation, so the answer
 * to "did that work?" should be felt rather than read.
 *
 * Stores are read through `getState()` — this runs from a press handler, and
 * nothing here should re-render the drawer underneath the modal.
 */
export function confirmHaptics(): void {
  const store = useSettingsStore.getState();

  if (store.haptics) {
    store.set('haptics', false);
    return;
  }

  // Read fresh every time: the player can change this while the app is
  // backgrounded, so a value cached at launch is stale exactly when it matters.
  const availability = hapticsAvailability();

  if (availability === 'noMotor') {
    // No motor to turn on. Told plainly and left alone — sending this player to
    // a settings screen would waste a trip on a switch that cannot help.
    overlay.modal({
      title: 'No vibration',
      body: 'This device has no vibration motor.',
      confirmLabel: 'OK',
      cancelLabel: null,
    });
    return;
  }

  /*
   * A reported "off" is a *hint*, never a veto.
   *
   * It used to be a veto: the OS saying its switch was off replaced this dialog
   * with one offering a trip to system settings, and the game's own toggle was
   * left alone. That is right when the reading is right, and actively wrong when
   * it is not — and it is not, often enough to matter. Android has more than one
   * row describing this setting, builds disagree about which one they maintain,
   * and a superseded row left at zero reports "off" on a phone that vibrates
   * perfectly well. A player in that position was told their working phone was
   * broken and sent to a screen where everything was already correct, with no
   * way to turn the feature on.
   *
   * So the buzz decides, not the lookup. The dialog reads the same either way
   * and always ends in a sample: feel it and the reading was wrong, feel nothing
   * and the extra line says where to look. The cost of being wrong is now one
   * unnecessary sentence instead of a feature that cannot be switched on.
   */
  const hint =
    availability === 'off'
      ? " If you feel nothing, check your phone's own vibration setting."
      : '';

  overlay.modal({
    title: 'Turn on vibration?',
    body: `The board will buzz as you pour.${hint}`,
    confirmLabel: 'Turn on',
    cancelLabel: 'Not now',
    onConfirm: () => {
      useSettingsStore.getState().set('haptics', true);
      // A sample, immediately: the setting is about a sensation, and this is
      // the one moment the player is holding the phone waiting to feel it.
      // Reusing the board's own pour haptic rather than inventing a fourth
      // strength — a preview that does not match the game teaches nothing.
      feedbackFor({
        kind: 'poured',
        move: { from: 0, to: 1, count: 1 },
        solved: false,
        colour: 0,
        destFilled: 0,
        completed: false,
      });
    },
  });
}
