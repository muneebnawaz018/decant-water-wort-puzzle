import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useState } from 'react';
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

import { privacyOptionsRequired, showPrivacyOptions } from '@/ads/setup';
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
import { drawerWidth, styles } from './SettingsDrawer.styles';

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
/**
 * The hosted policy, which both stores require and AdMob makes unavoidable.
 *
 * The trailing slash is the canonical form — the site sets `trailingSlash` in
 * its Next config, so the unslashed path 308s. Same string is filed in Play
 * Console and AdMob; if the site ever moves off this host, all three move
 * together or the app links somewhere the listing does not.
 */
const PRIVACY_URL = 'https://decant-website-rho.vercel.app/privacy/';

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
  /**
   * Whether to offer the ad-privacy row, asked once per open.
   *
   * UMP reads its answer from local state, so this settles in a tick and the
   * row simply is not there on the first frame rather than appearing late. A
   * `false` from a failed check is the same as a player who is owed nothing,
   * which is the right way for this to fail.
   */
  const [showAdChoices, setShowAdChoices] = useState(false);

  useEffect(() => {
    let live = true;
    void privacyOptionsRequired().then((required) => {
      if (live) setShowAdChoices(required);
    });
    return () => {
      live = false;
    };
  }, []);

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
            <SettingRow icon="eye" label="Colorblind marks" divider={false}>
              <Toggle setting="colourblind" label="Colorblind marks" />
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
            {/*
              "All sounds", not "Sound" — the two rows are a master and a
              dependent, and side by side under near-identical names they read
              as a pair of equals. A player who turned "Sound" off and saw
              "Sound on tap" still green had no way to know one governed the
              other, and reported the tap switch as broken.

              Named as the umbrella, and the row below is dimmed while this is
              off, so the hierarchy is visible rather than something the player
              has to work out.
            */}
            <SettingRow icon="sound" label="All sounds">
              <Toggle setting="sound" label="All sounds" />
            </SettingRow>
            {/*
              No Music row, and its absence is a decision rather than a gap.
              The game has no background track and is not getting one: a puzzle
              with no timer is what people play with a podcast or their own
              music on, and an app that starts singing is the one they silence
              outright — which costs the effects too. The store fields, the
              three track names and the cycling icon went with it; a setting
              for a feature nobody is building is just a row that has to keep
              being explained.
            */}
            {/*
              "Taps & buttons" says what it actually covers: the tick on a vial
              *and* the click on every button in the app, which are two
              different cues under one switch. "Sound on tap" named neither
              clearly and sat one word away from the master above it.
            */}
            <SettingRow icon="tap" label="Taps & buttons">
              <Toggle setting="tapSound" label="Taps & buttons" dependsOnSound />
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
              divider={showAdChoices}
              onPress={privacy}
            />
            {/*
              Only where a form is genuinely owed — see `privacyOptionsRequired`.
              Google's consent message promises this button exists, and the US
              states message has no console-side entry point at all, so the app
              is the only place it can live.
            */}
            {showAdChoices && (
              <SettingRow
                icon="shield"
                label="Ad privacy choices"
                divider={false}
                onPress={() => void showPrivacyOptions()}
              />
            )}
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
 * `dependsOnSound` marks a switch that the master silences — it dims and stops
 * taking presses while `sound` is off. Its stored value is left alone, so
 * turning the master back on restores whatever the player chose rather than a
 * default.
 */
const Toggle = memo(function Toggle({
  setting,
  label,
  dependsOnSound = false,
}: {
  setting: ToggleKey;
  label: string;
  dependsOnSound?: boolean;
}) {
  const value = useSettingsStore((state) => state[setting]);
  const master = useSettingsStore((state) => state.sound);

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
  }, [setting]);

  return (
    <Switch
      value={value}
      onChange={onChange}
      label={label}
      disabled={dependsOnSound && !master}
    />
  );
});

function howToPlay(): void {
  overlay.modal({
    title: 'How to play',
    body: 'Tap a vial to lift it, tap another to pour. Only pour onto a matching color or an empty vial. Sort every vial to a single color to win.',
    confirmLabel: 'Got it',
    cancelLabel: null,
  });
}

function privacy(): void {
  overlay.modal({
    title: 'Your privacy',
    body: 'Decant keeps progress on your device only. No account, no personal data collected. Ads are served by Google, which collects its own data — the full policy says what and why.',
    confirmLabel: 'Read policy',
    onConfirm: () => void Linking.openURL(PRIVACY_URL),
    cancelLabel: 'Close',
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
