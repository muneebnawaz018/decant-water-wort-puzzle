import * as Haptics from 'expo-haptics';

import { useOverlayStore } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { hapticsAvailability } from '../../../modules/system-haptics';
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
}));

const availability = hapticsAvailability as jest.Mock;
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

    expect(modal()?.body).not.toContain('vibration setting');
  });

  it('stays off if the modal is dismissed', () => {
    confirmHaptics();
    useOverlayStore.getState().closeModal();

    expect(haptics()).toBe(false);
    expect(impact).not.toHaveBeenCalled();
  });
});

describe('when the phone reports its own vibration off', () => {
  beforeEach(() => availability.mockReturnValue('off'));

  /*
   * The reading is a hint, not a veto, and this is the case that proves it.
   * Android keeps more than one row for this setting and builds disagree about
   * which they maintain, so a stale row reports "off" on a phone that vibrates
   * perfectly well. Blocking on it told those players their working phone was
   * broken and left them no way to switch the feature on.
   */
  it('still offers to turn vibration on', () => {
    confirmHaptics();

    expect(modal()?.title).toBe('Turn on vibration?');
    expect(modal()?.confirmLabel).toBe('Turn on');
  });

  it('turns on and samples anyway, so the buzz settles it', () => {
    confirmHaptics();
    modal()!.onConfirm!();

    expect(haptics()).toBe(true);
    expect(impact).toHaveBeenCalledTimes(1);
  });

  // The only difference a reported "off" makes: one extra sentence.
  it('adds a line saying where to look', () => {
    confirmHaptics();

    expect(modal()?.body).toContain('vibration setting');
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
    expect(modal()?.body).not.toContain('vibration setting');
  });
});
