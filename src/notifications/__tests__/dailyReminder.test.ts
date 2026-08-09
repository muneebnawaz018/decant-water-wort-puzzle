import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useEconomyStore } from '@/state/economyStore';
import { useSettingsStore } from '@/state/settingsStore';
import {
  clearReminders,
  initNotifications,
  reconcilePermission,
  requestPermission,
  syncReminders,
} from '../dailyReminder';

/**
 * The native module cannot run in a test process, and the OS side of this
 * cannot be verified without a device. What can be checked is the part most
 * likely to be wrong: that the schedule matches the economy, that a refusal
 * leaves nothing pending, and that the Android channel exists before the
 * permission prompt.
 */
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const scheduled = () => mocked.scheduleNotificationAsync.mock.calls.length;

/**
 * A visit made just now, against a pinned clock.
 *
 * The clock has to be both fixed *and* at a known local hour. `syncReminders`
 * reads `Date.now()` and drops anything already due, so a hard-coded past date
 * schedules nothing — but the real clock is worse: the waking-hours shift moves
 * a reminder by however far outside 8am–11pm it lands, so how many survive the
 * merge depended on what time of day the suite happened to run.
 *
 * 2pm local. The reward lands at 2pm tomorrow and the streak warning at 8am,
 * both inside waking hours and six hours apart, so neither is shifted and
 * neither merges the other away.
 */
const NOON_ISH = new Date(2026, 2, 1, 14, 0, 0, 0);
const justClaimed = () => Date.now();

function permission(granted: boolean, canAskAgain = true) {
  mocked.getPermissionsAsync.mockResolvedValue({
    granted,
    canAskAgain,
  } as unknown as Notifications.NotificationPermissionsStatus);
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(NOON_ISH);
});

afterAll(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  permission(true);
  useSettingsStore.getState().set('dailyReminder', true);
  useEconomyStore.setState({ coins: 0, streak: 4, lastVisitAt: justClaimed(), owned: [] });
});

describe('setup', () => {
  it('creates the Android channel before anything asks for permission', async () => {
    Platform.OS = 'android';
    await initNotifications();

    // Android 13+ drops the permission prompt silently when no channel exists.
    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(
      'daily-reward',
      expect.objectContaining({ name: 'Daily reward' })
    );
  });

  it('keeps a reminder from banner-ing over the board mid-pour', async () => {
    await initNotifications();
    const config = mocked.setNotificationHandler.mock.calls[0]?.[0];
    const behaviour = await config!.handleNotification({} as Notifications.Notification);

    expect(behaviour.shouldShowBanner).toBe(false);
    expect(behaviour.shouldShowList).toBe(true);
  });
});

describe('permission', () => {
  it('does not re-prompt when it already holds permission', async () => {
    expect(await requestPermission()).toBe(true);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('gives up rather than prompt when the OS will not ask again', async () => {
    permission(false, false);
    expect(await requestPermission()).toBe(false);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('asks when it can', async () => {
    permission(false, true);
    expect(await requestPermission()).toBe(true);
    expect(mocked.requestPermissionsAsync).toHaveBeenCalled();
  });
});

describe('syncReminders', () => {
  it('replaces what is pending rather than adding to it', async () => {
    await syncReminders();
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    // A four-day streak: the reward, and both warnings before the run lapses.
    expect(scheduled()).toBe(3);
  });

  it('schedules an absolute instant, not a repeating hour', async () => {
    await syncReminders();
    const request = mocked.scheduleNotificationAsync.mock.calls[0]?.[0];

    // A recurring hour/minute trigger drifts against a rolling 24-hour claim
    // and has opinions about daylight saving. A date has neither problem.
    expect(request!.trigger).toMatchObject({ type: 'date' });
  });

  it('schedules nothing when the row is off', async () => {
    useSettingsStore.getState().set('dailyReminder', false);
    await syncReminders();

    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(scheduled()).toBe(0);
  });

  it('schedules nothing when the OS says no', async () => {
    permission(false);
    await syncReminders();
    expect(scheduled()).toBe(0);
  });

  it('schedules nothing before the first claim', async () => {
    useEconomyStore.setState({ lastVisitAt: null, streak: 0 });
    await syncReminders();
    expect(scheduled()).toBe(0);
  });
});

describe('reconcilePermission', () => {
  it('turns the row off when the OS has revoked permission', async () => {
    permission(false);
    await reconcilePermission();

    // A row reading "on" against a blocked OS is a lie the player cannot
    // diagnose from inside the app.
    expect(useSettingsStore.getState().dailyReminder).toBe(false);
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('re-syncs when permission is still held', async () => {
    await reconcilePermission();
    expect(useSettingsStore.getState().dailyReminder).toBe(true);
    expect(scheduled()).toBe(3);
  });

  it('does nothing at all when the row is off', async () => {
    useSettingsStore.getState().set('dailyReminder', false);
    await reconcilePermission();
    expect(mocked.getPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('clearReminders', () => {
  it('drops everything pending', async () => {
    await clearReminders();
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });
});
