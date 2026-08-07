import * as Haptics from 'expo-haptics';

import { useOverlayStore } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { hapticsAvailability, openSoundSettings } from '../../../modules/system-haptics';
import { confirmHaptics } from '../confirmHaptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

/**
 * The native module is Android-only and absent in Jest either way, so it is
 * mocked rather than imported for real. That is also what makes the four
 * availability branches testable at all — there is no way to switch a phone's
 * touch feedback off from a test.
 */
jest.mock('../../../modules/system-haptics', () => ({
  hapticsAvailability: jest.fn(() => 'ready'),
  openSoundSettings: jest.fn(),
}));

const availability = hapticsAvailability as jest.Mock;
const openSettings = openSoundSettings as jest.Mock;
const modal = () => useOverlayStore.getState().modal;
const haptics = () => useSettingsStore.getState().haptics;
const impact = Haptics.impactAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  availability.mockReturnValue('ready');
  useOverlayStore.getState().closeModal();
  useOverlayStore.getState().clearToast();
  useSettingsStore.getState().set('haptics', false);
});

describe('when the phone can vibrate', () => {
  it('asks first and leaves the setting alone until answered', () => {
    confirmHaptics();

    expect(haptics()).toBe(false);
    expect(modal()?.title).toBe('Turn on vibration?');
    expect(modal()?.confirmLabel).toBe('Turn on');
    expect(modal()?.cancelLabel).toBe('Not now');
  });

  it('turns on and buzzes once on confirm, so the answer is felt not read', () => {
    confirmHaptics();
    modal()!.onConfirm!();

    expect(haptics()).toBe(true);
    expect(impact).toHaveBeenCalledTimes(1);
  });

  // The bug this whole branch exists to kill: the warning used to show every
  // time, including to players whose vibration was working perfectly.
  it('says nothing about system settings', () => {
    confirmHaptics();
    modal()!.onConfirm!();

    expect(useOverlayStore.getState().toast).toBeNull();
    expect(openSettings).not.toHaveBeenCalled();
  });

  it('stays off if the modal is dismissed', () => {
    confirmHaptics();
    useOverlayStore.getState().closeModal();

    expect(haptics()).toBe(false);
    expect(impact).not.toHaveBeenCalled();
  });
});

describe("when the phone's own vibration is off", () => {
  beforeEach(() => availability.mockReturnValue('off'));

  it('says so instead of promising a buzz it cannot deliver', () => {
    confirmHaptics();

    expect(modal()?.title).toBe('Vibration is off');
    expect(modal()?.confirmLabel).toBe('Open settings');
  });

  it('opens the system settings on confirm', () => {
    confirmHaptics();
    modal()!.onConfirm!();

    expect(openSettings).toHaveBeenCalledTimes(1);
    // Switched on too, so the game is ready the moment the OS switch is.
    expect(haptics()).toBe(true);
  });

  // Nothing to preview while the OS is swallowing every effect, and a buzz
  // that cannot be felt would read as the feature failing.
  it('does not try to sample a buzz', () => {
    confirmHaptics();
    modal()!.onConfirm!();

    expect(impact).not.toHaveBeenCalled();
  });
});

describe('when there is no vibration motor', () => {
  beforeEach(() => availability.mockReturnValue('noMotor'));

  it('tells the player plainly and offers nowhere to go', () => {
    confirmHaptics();

    expect(modal()?.title).toBe('No vibration');
    // A single acknowledgement: `cancelLabel: null` is the store's signal for
    // a one-button dialog, and there is no settings trip worth making.
    expect(modal()?.cancelLabel).toBeNull();
    expect(haptics()).toBe(false);
  });
});

describe('when the system cannot be read', () => {
  // iOS, or a ROM that refuses the lookup. Falls back to the normal flow —
  // never a warning that might be wrong.
  beforeEach(() => availability.mockReturnValue('unknown'));

  it('behaves exactly as it does on a working phone', () => {
    confirmHaptics();
    modal()!.onConfirm!();

    expect(modal()?.title).toBe('Turn on vibration?');
    expect(haptics()).toBe(true);
    expect(impact).toHaveBeenCalledTimes(1);
    expect(useOverlayStore.getState().toast).toBeNull();
  });
});
