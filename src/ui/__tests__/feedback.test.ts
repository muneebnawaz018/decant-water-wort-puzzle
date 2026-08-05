import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/state/settingsStore';
import { feedbackFor, feedbackTap, feedbackWarn } from '../feedback';

/**
 * Neither simulator has a vibration motor, so the buzz itself cannot be
 * verified without a phone. Everything up to it can: that the right call is
 * made for the right outcome, that the setting gates it, and — the part most
 * likely to rot — that a tap which changed nothing stays silent.
 */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

const impact = Haptics.impactAsync as jest.Mock;
const selection = Haptics.selectionAsync as jest.Mock;
const notification = Haptics.notificationAsync as jest.Mock;

/** Every haptic call made since the last reset. */
const calls = () =>
  impact.mock.calls.length + selection.mock.calls.length + notification.mock.calls.length;

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

describe('board taps', () => {
  it('taps light for a pour and heavy for the one that solves the level', () => {
    feedbackFor(pour());
    expect(impact).toHaveBeenCalledWith('light');

    feedbackFor(pour(true));
    expect(impact).toHaveBeenLastCalledWith('heavy');
  });

  it('ticks for picking a vial up and for putting it back down', () => {
    feedbackFor({ kind: 'selected', tube: 0 });
    feedbackFor({ kind: 'deselected', tube: 0 });
    expect(selection).toHaveBeenCalledTimes(2);
  });

  it('warns on a pour the board will not take', () => {
    feedbackFor({ kind: 'illegal', tube: 3 });
    expect(notification).toHaveBeenCalledWith('warning');
  });

  it('stays silent on a tap that did nothing', () => {
    // Empty glass with nothing held. The rule the whole feature rests on: a
    // vibration means something happened.
    feedbackFor({ kind: 'ignored' });
    expect(calls()).toBe(0);
  });
});

describe('chrome', () => {
  it('ticks for a button', () => {
    feedbackTap();
    expect(selection).toHaveBeenCalledTimes(1);
  });

  it('answers a refusal differently from a success', () => {
    feedbackWarn();
    expect(notification).toHaveBeenCalledWith('warning');
    expect(selection).not.toHaveBeenCalled();
  });
});

describe('the setting', () => {
  it('silences every channel when vibration is off', () => {
    useSettingsStore.getState().set('haptics', false);

    feedbackFor(pour());
    feedbackFor(pour(true));
    feedbackFor({ kind: 'selected', tube: 0 });
    feedbackFor({ kind: 'illegal', tube: 1 });
    feedbackTap();
    feedbackWarn();

    expect(calls()).toBe(0);
  });

  it('is read at call time, so a toggle takes effect without a remount', () => {
    useSettingsStore.getState().set('haptics', false);
    feedbackTap();
    expect(calls()).toBe(0);

    useSettingsStore.getState().set('haptics', true);
    feedbackTap();
    expect(selection).toHaveBeenCalledTimes(1);
  });
});
