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

const VERSION = 'Decant · v0.1.0';

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
      void toggleDailyReminder();
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
 */
async function toggleDailyReminder(): Promise<void> {
  const store = useSettingsStore.getState();

  if (store.dailyReminder) {
    store.set('dailyReminder', false);
    await clearReminders();
    return;
  }

  if (!(await requestPermission())) {
    overlay.modal({
      title: 'Notifications are off',
      body: 'Decant needs permission to remind you. Turn notifications on for Decant in your device settings.',
      confirmLabel: 'Open settings',
      cancelLabel: 'Not now',
      onConfirm: () => void Linking.openSettings(),
    });
    return;
  }

  store.set('dailyReminder', true);
  await syncReminders();
}
