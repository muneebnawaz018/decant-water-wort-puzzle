import { hapticsAvailability, openSoundSettings } from '../../modules/system-haptics';
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

  // Asked before the dialog opens, not after: if the phone cannot deliver a
  // buzz, the dialog should say so up front rather than promise one and then
  // apologise. Read fresh every time — the player can change this while the app
  // is backgrounded, which is precisely what the settings button sends them off
  // to do.
  const availability = hapticsAvailability();

  if (availability === 'off') {
    /*
     * The OS says its own switch is off, so there is nothing to preview and no
     * point turning the game's setting on quietly — it would sit there reading
     * "on" against a system that swallows every buzz, which is the state that
     * makes a working feature look broken.
     *
     * This is the one case that gets a real destination instead of advice.
     * There is no deep link to the toggle itself, so it lands on the sound
     * screen that holds it; vendors move the row but not the screen.
     */
    overlay.modal({
      title: 'Vibration is off',
      body: "Your phone's own vibration setting is switched off, so the board cannot buzz.",
      confirmLabel: 'Open settings',
      cancelLabel: 'Not now',
      onConfirm: () => {
        useSettingsStore.getState().set('haptics', true);
        void openSoundSettings();
      },
    });
    return;
  }

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

  overlay.modal({
    title: 'Turn on vibration?',
    body: 'The board will buzz as you pour.',
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
      });
    },
  });
}
