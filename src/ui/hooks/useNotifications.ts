import { useEffect } from 'react';
import { AppState } from 'react-native';

import {
  initNotifications,
  markSessionEnded,
  reconcilePermission,
} from '@/notifications/dailyReminder';

/**
 * Sets notifications up once, then keeps the setting honest with the OS.
 *
 * Mounted in `Root`, so it outlives every screen. The foreground check is the
 * part that earns its place: notification permission can be withdrawn in
 * system settings while the app is closed, and a Settings row showing "on"
 * against a blocked OS is a lie the player has no way to diagnose from inside
 * the app. Coming back to the foreground re-reads it and turns the row off if
 * it has to.
 *
 * It also re-syncs the schedule on both edges. On foreground that covers a
 * reminder which has already fired and left the queue — without it a player
 * who opens the app without claiming would never be reminded again. On
 * background it anchors the come-back nudges, which is the only moment they
 * can be measured from.
 */
export function useNotifications(): void {
  useEffect(() => {
    void initNotifications().then(() => reconcilePermission());

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void reconcilePermission();
        return;
      }
      // Backgrounded: anchor the come-back nudges here, and clear the ones
      // that were counting down from the session before this one.
      void markSessionEnded();
    });

    return () => subscription.remove();
  }, []);
}
