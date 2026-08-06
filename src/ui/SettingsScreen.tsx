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
  label: DIFFICULTY_INFO[id].shortLabel,
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
        <SettingRow icon="vibrate" label="Vibration">
          <Toggle setting="haptics" label="Vibration" />
        </SettingRow>
        <SettingRow icon="bell" label="Daily reminder" divider={false}>
          <Toggle setting="dailyReminder" label="Daily reminder" />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="More">
        <SettingRow icon="book" label="How to play" onPress={howToPlay} />
        {/*
          Both of these need something the app does not have yet: a store
          listing to send a rating to, and a purchase SDK to restore from.
          Marked for the same reason as the audio rows — and with no `onPress`,
          so neither is tappable and neither fires a tick that promises an
          action.
        */}
        <SettingRow icon="star" label="Rate us">
          <SoonBadge />
        </SettingRow>
        <SettingRow icon="restart" label="Restore purchases">
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
