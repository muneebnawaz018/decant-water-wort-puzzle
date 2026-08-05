import { memo, useCallback } from 'react';
import { Text } from 'react-native';

import { DIFFICULTIES, DIFFICULTY_INFO, isDifficulty } from '@/game/difficulty';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore, type ToggleKey } from '@/state/settingsStore';
import { ScrollPage } from './chrome/ScrollPage';
import { Segmented, SettingGroup, SettingRow, Switch } from './chrome/SettingRow';
import { feedbackTap } from './feedback';
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
    feedbackTap();
    useSettingsStore.getState().setDifficulty(id);
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

      <SettingGroup title="Sound & feel">
        <SettingRow icon="sound" label="Sound">
          <Toggle setting="sound" label="Sound" />
        </SettingRow>
        <SettingRow icon="music" label="Music">
          <Toggle setting="music" label="Music" />
        </SettingRow>
        <SettingRow icon="tap" label="Sound on tap">
          <Toggle setting="tapSound" label="Sound on tap" />
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
        <SettingRow icon="star" label="Rate us" onPress={rateUs} />
        <SettingRow icon="restart" label="Restore purchases" onPress={restore} />
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
    feedbackTap();
    const store = useSettingsStore.getState();
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

function rateUs(): void {
  overlay.modal({
    title: 'Enjoying Decant?',
    body: 'A quick rating really helps us. Rate on the store?',
    confirmLabel: 'Rate',
    cancelLabel: 'Later',
  });
}

function restore(): void {
  overlay.toast('Nothing to restore');
}

function privacy(): void {
  overlay.modal({
    title: 'Your privacy',
    body: 'Decant keeps progress on your device only. No account, no personal data collected.',
    confirmLabel: 'Close',
    cancelLabel: null,
  });
}
