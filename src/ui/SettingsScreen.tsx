import Constants from 'expo-constants';
import { memo, useCallback } from 'react';
import { Linking, Text } from 'react-native';

import { DIFFICULTIES, DIFFICULTY_INFO, isDifficulty } from '@/game/difficulty';
import {
  clearReminders,
  requestPermission,
  syncReminders,
} from '@/notifications/dailyReminder';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore, type ToggleKey } from '@/state/settingsStore';
import { ScrollPage } from './chrome/ScrollPage';
import { confirmDifficultyChange } from './confirmDifficulty';
import { SoonBadge } from './chrome/SoonBadge';
import { Segmented, SettingGroup, SettingRow, Switch } from './chrome/SettingRow';
import { styles } from './styles/SettingsScreen.styles';

/**
 * Read from the manifest, not typed out here.
 *
 * This line said `v0.1.0` while `app.config.ts`, `build.gradle` and
 * `Info.plist` all said 1.0.0 — and it is the only one of the four a player
 * ever sees, so the single wrong copy was the visible one. A version written
 * in two places is a version that disagrees with itself the first time one of
 * them is bumped, and the store build is exactly when nobody is looking at
 * this screen.
 *
 * `expoConfig` is the config that produced the binary, so this cannot drift
 * from what the store lists.
 */
const VERSION = `${Constants.expoConfig?.name ?? 'Decant'} · v${Constants.expoConfig?.version ?? '1.0.0'}`;

const DIFFICULTY_OPTIONS = DIFFICULTIES.map((id) => ({
  id: id as string,
  label: DIFFICULTY_INFO[id].title,
}));

export const SettingsScreen = memo(function SettingsScreen({
  onClose,
}: {
  onClose: () => void;
}) {
  const difficulty = useSettingsStore((state) => state.difficulty);

  const setDifficulty = useCallback((id: string) => {
    if (!isDifficulty(id)) return;
    confirmDifficultyChange(id);
  }, []);

  return (
    <ScrollPage title="Settings" onBack={onClose}>
      <SettingGroup title="Game">
        <SettingRow icon="stats" label="Difficulty">
          <Segmented
            options={DIFFICULTY_OPTIONS}
            value={difficulty}
            onChange={setDifficulty}
          />
        </SettingRow>
        {/*
          Marked, for the same reason the shop's skins are: the renderer paints
          from the palette and nothing reads an owned theme, so a picker here
          would change the label and not the board.
        */}
        <SettingRow icon="palette" label="Theme">
          <SoonBadge />
        </SettingRow>
        <SettingRow icon="eye" label="Colourblind marks" divider={false}>
          <Toggle setting="colourblind" label="Colourblind marks" />
        </SettingRow>
      </SettingGroup>

      {/*
        Audio is marked rather than offered. There are no sound assets in the
        build, so a switch here would be a control that visibly moves and
        changes nothing — which a player reads as a broken game, not a missing
        feature. The badge says which it is.
      */}
      <SettingGroup title="Sound & feel">
        <SettingRow icon="sound" label="Sound">
          <SoonBadge />
        </SettingRow>
        <SettingRow icon="music" label="Music">
          <SoonBadge />
        </SettingRow>
        <SettingRow icon="tap" label="Sound on tap">
          <SoonBadge />
        </SettingRow>
        {/*
          "In game", not "Vibration" — the switch only covers the board now, so
          a plain label would promise the menus buzz too and read as broken when
          they do not.
        */}
        <SettingRow icon="vibrate" label="Vibration in game">
          <Toggle setting="haptics" label="Vibration in game" />
        </SettingRow>
        <SettingRow icon="bell" label="Daily reminder" divider={false}>
          <Toggle setting="dailyReminder" label="Daily reminder" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="More">
        <SettingRow icon="book" label="How to play" onPress={howToPlay} />
        {/*
          Needs a store listing to send a rating to, so it is marked and has no
          `onPress` — not tappable, and no tick promising an action.

          "Restore purchases" sat here too and is gone rather than marked. There
          is nothing to restore: the game sells no real-money items, and the
          shop's coins are device-local. It was a row promising a feature that
          does not exist even in plan, which is different from one that is
          merely unfinished. If IAP ever ships, both stores require it and it
          comes back then.
        */}
        <SettingRow icon="star" label="Rate us">
          <SoonBadge />
        </SettingRow>
        <SettingRow
          icon="shield"
          label="Privacy policy"
          divider={false}
          onPress={privacy}
        />
      </SettingGroup>

      <Text style={styles.version}>{VERSION}</Text>
    </ScrollPage>
  );
});

/**
 * One switch bound to one setting.
 *
 * Turning master sound off drags music down with it (spec §7). Leaving music
 * "on" while nothing can be heard is a state the player cannot make sense of.
 */
const Toggle = memo(function Toggle({
  setting,
  label,
}: {
  setting: ToggleKey;
  label: string;
}) {
  const value = useSettingsStore((state) => state[setting]);

  const onChange = useCallback(() => {
    const store = useSettingsStore.getState();

    if (setting === 'dailyReminder') {
      toggleDailyReminder();
      return;
    }

    store.toggle(setting);
    if (setting === 'sound' && !useSettingsStore.getState().sound) {
      store.set('music', false);
    }
  }, [setting]);

  return <Switch value={value} onChange={onChange} label={label} />;
});

function howToPlay(): void {
  overlay.modal({
    title: 'How to play',
    body: 'Tap a vial to lift it, tap another to pour. Only pour onto a matching colour or an empty vial. Sort every vial to a single colour to win.',
    confirmLabel: 'Got it',
    cancelLabel: null,
  });
}

function privacy(): void {
  overlay.modal({
    title: 'Your privacy',
    body: 'Decant keeps progress on your device only. No account, no personal data collected.',
    confirmLabel: 'Close',
    cancelLabel: null,
  });
}

/**
 * The daily reminder, which has an operating system in the way.
 *
 * Switching it on is a request, not a change: the OS decides. So the setting
 * is only written once permission is actually held, and a refusal leaves the
 * row where it was rather than showing "on" against a system that is blocking
 * it — a state the player cannot diagnose from inside the app.
 *
 * Both platforms show their dialog once and answer from the stored decision
 * afterwards, so a second tap cannot re-prompt. When that happens the only
 * honest thing is to say where the switch actually lives.
 *
 * Which is why our own modal comes first, every time the row is switched on.
 * It says what the notifications are before anything is turned on, and on a
 * first run it also stands in front of the system dialog — the single chance
 * this app ever gets. A player who taps "Don't allow" out of reflex has closed
 * that door permanently, and the only thing left to offer them is a trip to
 * system settings. Asking in our own words costs one tap and makes the answer
 * an informed one.
 *
 * Switching it *off* asks nothing. Confirming a player out of a notification
 * they no longer want is nagging, and the action undoes itself with one tap.
 */
function toggleDailyReminder(): void {
  const store = useSettingsStore.getState();

  if (store.dailyReminder) {
    store.set('dailyReminder', false);
    void clearReminders();
    return;
  }

  overlay.modal({
    title: 'Never miss a reward',
    body: 'A nudge when your daily reward is ready, and one before a streak slips away.\n\nTwo a day at most. Off again whenever you like.',
    confirmLabel: 'Enable',
    cancelLabel: 'Cancel',
    onConfirm: () => void grantAndEnable(),
  });
}

/**
 * Permission, then the setting.
 *
 * `requestPermission` returns straight away when it is already held, so the
 * common path is one call and no second dialog.
 */
async function grantAndEnable(): Promise<void> {
  if (!(await requestPermission())) {
    overlay.modal({
      title: 'Blocked by your device',
      body: 'Notifications are switched off for Decant. Turn them on in your device settings and the reminder will work.',
      confirmLabel: 'Open settings',
      cancelLabel: 'Not now',
      onConfirm: () => void Linking.openSettings(),
    });
    return;
  }

  await enableDailyReminder();
}

/** Writes the setting, then schedules. Only ever called with permission held. */
async function enableDailyReminder(): Promise<void> {
  useSettingsStore.getState().set('dailyReminder', true);
  await syncReminders();
}
