import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';

import { DIFFICULTIES, DIFFICULTY_INFO, isDifficulty } from '@/game/difficulty';
import {
  clearReminders,
  requestPermission,
  syncReminders,
} from '@/notifications/dailyReminder';
import { overlay, useOverlayStore } from '@/state/overlayStore';
import { useSettingsStore, type ToggleKey } from '@/state/settingsStore';
import { apothecary } from '@/theme/apothecary';
import { gradients } from '@/theme/colors';
import { s } from '@/theme/scale';
import { confirmDifficultyChange } from '../confirmDifficulty';
import { confirmHaptics } from '../confirmHaptics';
import { Icon } from '../Icon';
import { AppMark } from './AppMark';
import { useScreenPadding } from '../hooks/useScreenPadding';
import { useBattery } from '../hooks/useBattery';
import { useTapHandler } from '../hooks/useTapHandler';
import { SettingGroup, SettingRow, Switch } from './SettingRow';
import { SettingSelect } from './SettingSelect';
import { SoonBadge } from './SoonBadge';
import { drawerWidth, styles } from './styles/SettingsDrawer.styles';

/**
 * Read from the manifest, not typed out here.
 *
 * This line said `v0.1.0` while `app.config.ts`, `build.gradle` and
 * `Info.plist` all said 1.0.0 — and it is the only one of the four a player
 * ever sees, so the single wrong copy was the visible one. A version written
 * in two places is a version that disagrees with itself the first time one of
 * them is bumped, and the store build is exactly when nobody is looking at it.
 *
 * `expoConfig` is the config that produced the binary, so this cannot drift
 * from what the store lists.
 */
const VERSION = `${Constants.expoConfig?.name ?? 'Decant'} · v${Constants.expoConfig?.version ?? '1.0.0'}`;

// `detail` comes along now that the options are a list rather than three
// buttons in a row. It is the sentence that makes the choice mean something —
// "Hard" says nothing about what changes, "One more colour, one less place to
// put it" does — and there was nowhere to put it under a segmented control.
const DIFFICULTY_OPTIONS = DIFFICULTIES.map((id) => ({
  id: id as string,
  label: DIFFICULTY_INFO[id].title,
  detail: DIFFICULTY_INFO[id].detail,
}));

/**
 * Settings, as a drawer over whatever screen you were on.
 *
 * It replaced a full screen, and losing the screen is the point. Settings was
 * the fifth seat in a five-seat nav bar — permanent billing next to the four
 * places a player actually moves between — and going there meant leaving the
 * board or the shop and then navigating back. A drawer is a detour rather than
 * a destination: the screen behind it never unmounts, and closing puts you
 * exactly where you were.
 *
 * Mounted only while open. Every row draws its glyph on a Skia canvas, and
 * eleven live surfaces behind a closed drawer is the kind of cost this project
 * has already paid once on Home's rack.
 */
export const SettingsDrawer = memo(function SettingsDrawer() {
  const open = useOverlayStore((state) => state.drawer);
  const close = useOverlayStore((state) => state.closeDrawer);
  const { width } = useWindowDimensions();
  const padding = useScreenPadding();
  const difficulty = useSettingsStore((state) => state.difficulty);

  const onClose = useTapHandler(close);

  const setDifficulty = useCallback((id: string) => {
    if (!isDifficulty(id)) return;
    confirmDifficultyChange(id);
  }, []);

  if (!open) return null;

  return (
    <>
      {/*
        Tapping outside closes, and is deliberately not wrapped in a tap
        handler. Dismissing by pressing away from a surface is the one press in
        the app that should feel like nothing happened.
      */}
      <Animated.View
        style={styles.scrim}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(200)}
      >
        <Pressable
          style={styles.fill}
          onPress={close}
          accessibilityLabel="Close settings"
        />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { width: drawerWidth(width) }, padding.frame]}
        entering={SlideInRight.duration(320)}
        exiting={SlideOutRight.duration(260)}
      >
        <LinearGradient
          colors={gradients.drawer}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fill}
        />
        <View style={styles.edge} pointerEvents="none" />

        <View style={styles.head}>
          <DrawerMark />
          <Text style={styles.name}>DECANT</Text>
          <Pressable
            style={styles.close}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
          >
            <Icon name="close" size={s(15)} color={apothecary.inkMuted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <SettingGroup title="Game">
            {/*
              Names the current mode on the row and opens a list to change it.
              A segmented control could not share a line with its label, so it
              sat underneath and made this row twice the height of every other
              one in the drawer.
            */}
            <SettingSelect
              icon="stats"
              label="Difficulty"
              options={DIFFICULTY_OPTIONS}
              value={difficulty}
              onChange={setDifficulty}
            />
            {/*
              Marked, for the same reason the shop's skins are: the renderer
              paints from the palette and nothing reads an owned theme, so a
              picker here would change the label and not the board.
            */}
            <SettingRow icon="palette" label="Theme">
              <SoonBadge />
            </SettingRow>
            <SettingRow icon="eye" label="Colourblind marks" divider={false}>
              <Toggle setting="colourblind" label="Colourblind marks" />
            </SettingRow>
          </SettingGroup>

          <SettingGroup title="Sound & feel">
            {/*
              Real switches now that the game has a voice: five recorded
              one-shots in `assets/audio`, played through `src/audio/sounds.ts`.
              They were badged for a build with no sound assets at all, because
              a control that visibly moves and changes nothing reads as a broken
              game rather than a missing feature.
            */}
            <SettingRow icon="sound" label="Sound">
              <Toggle setting="sound" label="Sound" />
            </SettingRow>
            {/*
              Still marked, and alone in this group: the effects landed and the
              music tracks did not. `musicTrack` and its three names are already
              in the store, so this is a row waiting on audio rather than on
              code.
            */}
            <SettingRow icon="music" label="Music">
              <SoonBadge />
            </SettingRow>
            <SettingRow icon="tap" label="Sound on tap">
              <Toggle setting="tapSound" label="Sound on tap" />
            </SettingRow>
            {/*
              "In game", not "Vibration" — the switch only covers the board now,
              so a plain label would promise the menus buzz too and read as
              broken when they do not.
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
              Needs a store listing to send a rating to, so it is marked and has
              no `onPress` — not tappable, and no tick promising an action.
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
        </ScrollView>
      </Animated.View>
    </>
  );
});

/**
 * The vial mark, filled to the device's charge.
 *
 * Its own component so the subscription lives *below* the drawer's `open`
 * check. `SettingsDrawer` cannot call `useBattery` itself — hooks run before
 * its early return, so a closed drawer would hold a live receiver for the whole
 * session, which is the one thing this feature must not do.
 */
const DrawerMark = memo(function DrawerMark() {
  const battery = useBattery();
  // `size` is the mark's width now that it lies down; the height follows at
  // half of it, which is roughly the wordmark's cap height beside it.
  return <AppMark size={s(34)} level={battery.level} source={battery.source} />;
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

    // Vibration asks before it goes on — the OS gates it a second time, and the
    // modal is the only place that can say so. Off stays instant.
    if (setting === 'haptics') {
      confirmHaptics();
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
 * Switching it on is a request, not a change: the OS decides. So the setting is
 * only written once permission is actually held, and a refusal leaves the row
 * where it was rather than showing "on" against a system that is blocking it —
 * a state the player cannot diagnose from inside the app.
 *
 * Our own modal comes first, every time the row is switched on. It says what
 * the notifications are before anything is turned on, and on a first run it
 * also stands in front of the system dialog — the single chance this app ever
 * gets. A player who taps "Don't allow" out of reflex has closed that door
 * permanently, and the only thing left to offer them is a trip to system
 * settings.
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

  useSettingsStore.getState().set('dailyReminder', true);
  await syncReminders();
}
