import { strongVibration } from '../../../modules/system-haptics';
import { useSettingsStore } from '@/state/settingsStore';

/**
 * The Android half, which the sibling suite cannot reach.
 *
 * Jest reports `Platform.OS === 'ios'`, so every assertion in `feedback.test.ts`
 * exercises the `expo-haptics` branch — and Android is the platform the buzz was
 * reported dead on. `Platform` is mocked here rather than in that file because
 * the module reads it once at import, so the two platforms cannot share a
 * module instance.
 *
 * What this pins is the decision, not the sensation: that Android drives the
 * motor through the native module rather than through `expo-haptics` or React
 * Native's `Vibration`, both of which the OS discards when the player has touch
 * feedback switched off.
 */
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Vibration: { vibrate: jest.fn() },
}));

/**
 * The native module stands in for the motor.
 *
 * It has to be mocked rather than left absent: `requireOptionalNativeModule`
 * returns null with no native runtime, and the code would then fall back to
 * React Native's `Vibration` — the path that does *not* run on a real Android
 * phone, so a suite built on it would pin the wrong branch.
 */
jest.mock('../../../modules/system-haptics', () => ({
  strongVibration: { once: jest.fn(), pattern: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { feedbackControl, feedbackFor, feedbackWarn } = require('../feedback');

const once = strongVibration!.once as jest.Mock;
const pattern = strongVibration!.pattern as jest.Mock;

const pour = (solved = false) => ({
  kind: 'poured' as const,
  move: { from: 0, to: 1, count: 1 },
  solved,
  colour: 0,
  destFilled: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.getState().set('haptics', true);
});

describe('android vibration', () => {
  it('buzzes for a pour, and longer than it does for a tap', () => {
    feedbackFor({ kind: 'selected', tube: 0 });
    const tapMs = once.mock.calls[0]![0] as number;

    feedbackFor(pour());
    const pourMs = once.mock.calls[1]![0] as number;

    expect(pourMs).toBeGreaterThan(tapMs);
  });

  // Two pulses, because neither platform has much headroom above one firm buzz
  // — duration is the only dial `Vibration` offers, and a longer single buzz
  // reads as a rumble rather than as an event.
  it('answers a solved board with a pattern, not a longer pulse', () => {
    feedbackFor(pour(true));

    expect(pattern).toHaveBeenCalledTimes(1);
    expect(once).not.toHaveBeenCalled();
  });

  it('answers a refusal with its own pattern', () => {
    feedbackWarn();
    expect(pattern).toHaveBeenCalledTimes(1);
  });

  it('stays silent on a tap that did nothing', () => {
    feedbackFor({ kind: 'ignored' });
    expect(once).not.toHaveBeenCalled();
    expect(pattern).not.toHaveBeenCalled();
  });

  it('ticks for the board controls', () => {
    feedbackControl();
    expect(once).toHaveBeenCalledTimes(1);
  });

  it('is gated by the setting, like every other channel', () => {
    useSettingsStore.getState().set('haptics', false);

    feedbackFor(pour());
    feedbackControl();
    feedbackWarn();

    expect(once).not.toHaveBeenCalled();
    expect(pattern).not.toHaveBeenCalled();
  });
});
