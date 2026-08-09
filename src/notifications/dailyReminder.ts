import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useEconomyStore } from '@/state/economyStore';
import { currentSettings, useSettingsStore } from '@/state/settingsStore';
import { lastPlayedAt, markPlayed } from './lastPlayed';
import { remindersFor } from './schedule';

/**
 * The daily reminder, spec §8's Settings row.
 *
 * Entirely on-device: the OS holds the schedule and delivers it, so there is
 * no server, no Firebase, no push token and no network. Everything it needs to
 * know — when the last claim was — the app already stores.
 *
 * Nothing here subscribes to a store. It is called from press handlers and
 * from the claim itself, and a reminder must never re-render the board.
 */

/** Android channel id. Must exist before permission is requested on 13+. */
const CHANNEL_ID = 'daily-reward';

/**
 * Set up before anything asks for permission.
 *
 * Two things, in this order, both load-bearing. The foreground handler stops a
 * reminder banner dropping over the board mid-pour — the notification is for
 * someone who is *not* playing, and interrupting someone who is is the exact
 * opposite of the point.
 *
 * Then the Android channel. On Android 13+ at least one channel must exist
 * before the permission prompt, or the prompt silently fails to appear. On
 * iOS this is a no-op.
 */
export async function initNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily reward',
      importance: Notifications.AndroidImportance.DEFAULT,
      // The reward is a nudge, not an alarm. No vibration pattern, no light.
      vibrationPattern: null,
      sound: null,
    });
  }
}

/** Whether the OS currently allows notifications. */
async function hasPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/**
 * Asks for permission, returning whether it was given.
 *
 * Requested when the player turns the row on rather than at launch, because
 * that is the moment they have said they want it — a prompt on first run, with
 * no context, is the one people deny reflexively.
 *
 * A denial cannot be re-prompted: both platforms show the system dialog once
 * and answer from the stored decision after that. So the caller has to put the
 * toggle back rather than leave a switch claiming something the OS is blocking.
 */
export async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;

  const { granted } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return granted;
}

/**
 * Rewrites the pending reminders from the current economy state.
 *
 * Cancel-then-schedule rather than diffing. There are at most two of these and
 * the alternative is tracking identifiers across a process death, which is
 * more state to get wrong than the work it saves. iOS caps pending
 * notifications at 64; two is not close.
 *
 * Safe to call when the setting is off or permission is gone — it clears and
 * returns, which is what makes it the single entry point.
 */
export async function syncReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!currentSettings().dailyReminder) return;
  if (!(await hasPermission())) return;

  const { lastVisitAt, streak } = useEconomyStore.getState();
  const reminders = remindersFor(
    { lastVisitAt, streak, lastPlayedAt: lastPlayedAt() },
    Date.now()
  );

  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.body,
        // Silent: the app has no audio yet, and a reward nudge does not earn
        // a sound even when it does.
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.at,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Drops everything pending. Used when the row is switched off. */
export async function clearReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Re-checks permission and turns the setting off if the OS has revoked it.
 *
 * Permission can be withdrawn in system settings while the app is closed, and
 * a row showing "on" against a blocked OS is a lie the player cannot diagnose
 * from inside the app. Called on foreground.
 */
export async function reconcilePermission(): Promise<void> {
  if (!currentSettings().dailyReminder) return;

  if (await hasPermission()) {
    await syncReminders();
    return;
  }

  useSettingsStore.getState().set('dailyReminder', false);
  await clearReminders();
}

/**
 * Records that the player has just stopped playing, and reschedules.
 *
 * Called when the app goes to the background. That is the only moment the
 * come-back nudges can be anchored to — while the app is open they would be
 * counting down against someone already here.
 */
export async function markSessionEnded(): Promise<void> {
  markPlayed(Date.now());
  await syncReminders();
}
