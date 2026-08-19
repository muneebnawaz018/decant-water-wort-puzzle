import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettingsStore } from '@/state/settingsStore';
import { feedbackControl, feedbackFor, feedbackWarn } from '../feedback';

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
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' },
}));

const impact = Haptics.impactAsync as jest.Mock;
const selection = Haptics.selectionAsync as jest.Mock;
const notification = Haptics.notificationAsync as jest.Mock;

/** Every haptic call made since the last reset. */
const calls = () =>
  impact.mock.calls.length + selection.mock.calls.length + notification.mock.calls.length;

const pour = (solved = false, completed = false) => ({
  kind: 'poured' as const,
  move: { from: 0, to: 1, count: 1 },
  solved,
  color: 0,
  destFilled: 0,
  completed,
});

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.getState().set('haptics', true);
});

describe('board taps', () => {
  it('taps for a pour and answers the solving one with a pattern', () => {
    feedbackFor(pour());
    // Android sits a step up the ladder: its `heavy` is 60ms at 70/255, which
    // is about what iOS renders `light` as.
    expect(impact).toHaveBeenCalledWith(Platform.OS === 'android' ? 'heavy' : 'light');

    feedbackFor(pour(true));
    // Not a bigger pulse — there is nothing above `heavy` on Android to
    // escalate to. Two pulses instead, which no single pour can be confused
    // with.
    expect(notification).toHaveBeenCalledWith('success');
  });

  it('ticks for picking a vial up and for putting it back down', () => {
    feedbackFor({ kind: 'selected', tube: 0 });
    feedbackFor({ kind: 'deselected', tube: 0 });
    // Not `selectionAsync` specifically: the tick is `impactAsync(Medium)` on
    // Android, where the selection effect is too faint to feel. What matters
    // is that both taps answer, and that neither is a warning.
    expect(calls()).toBe(2);
    expect(notification).not.toHaveBeenCalled();
  });

  it('warns on a refusal that leaves nothing selected', () => {
    feedbackFor({ kind: 'illegal', tube: 3, armed: false });
    expect(notification).toHaveBeenCalledWith('warning');
  });

  // The refusal re-arms the tube that was tapped, so the player is now holding
  // it. Warning there fired again on the *next* tap, which is a selection like
  // any other — a board with a tube armed has no idea where it is going yet.
  it('ticks, not warns, when the refusal re-armed the tapped tube', () => {
    feedbackFor({ kind: 'illegal', tube: 3, armed: true });

    expect(calls()).toBe(1);
    expect(notification).not.toHaveBeenCalled();
  });

  it('stays silent on a tap that did nothing', () => {
    // Empty glass with nothing held. The rule the whole feature rests on: a
    // vibration means something happened.
    feedbackFor({ kind: 'ignored' });
    expect(calls()).toBe(0);
  });
});

describe('the board controls', () => {
  it('ticks for undo, redo, hint and the spare vial', () => {
    feedbackControl();
    expect(calls()).toBe(1);
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
    feedbackFor({ kind: 'illegal', tube: 1, armed: false });
    feedbackControl();
    feedbackWarn();

    expect(calls()).toBe(0);
  });

  it('is read at call time, so a toggle takes effect without a remount', () => {
    useSettingsStore.getState().set('haptics', false);
    feedbackControl();
    expect(calls()).toBe(0);

    useSettingsStore.getState().set('haptics', true);
    feedbackControl();
    expect(calls()).toBe(1);
  });
});
