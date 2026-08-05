import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DIFFICULTY_INFO } from '@/game/difficulty';
import { useEconomyStore, today } from '@/state/economyStore';
import { useGameStore } from '@/state/gameStore';
import { overlay } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { apothecary } from '@/theme/apothecary';
import { colours, gradients, ui } from '@/theme/colors';
import { percentWidth } from '@/utils';
import { CoinPill } from './chrome/CoinPill';
import { GlossButton } from './chrome/GlossButton';
import { HeroRack } from './chrome/HeroRack';
import { NavBar, type NavDestination } from './chrome/NavBar';
import { Panel } from './chrome/Panel';
import { useScreenPadding } from './hooks/useScreenPadding';
import { Icon } from './Icon';
import { PAGE_SIZE } from './StagesScreen';
import { styles } from './styles/HomeScreen.styles';

interface HomeScreenProps {
  onPlay: () => void;
  onNavigate: (destination: NavDestination) => void;
}

/** Entrance stagger, spec §6: 50 / 130 / 210 / 290ms, nav bar at 360ms. */
const STAGGER = [50, 130, 210, 290] as const;
const NAV_DELAY = 360;

export const HomeScreen = memo(function HomeScreen({
  onPlay,
  onNavigate,
}: HomeScreenProps) {
  const padding = useScreenPadding();
  const level = useGameStore((state) => state.level);
  const difficulty = useGameStore((state) => state.difficulty);
  const record = useGameStore((state) => state.record);
  const sound = useSettingsStore((state) => state.sound);
  const music = useSettingsStore((state) => state.music);
  // Subscribing to `lastClaim`, not to `claimable` itself: the selector would
  // return the same function forever, so claiming a reward elsewhere would
  // never re-render this chip.
  const lastClaim = useEconomyStore((state) => state.lastClaim);

  const progress = record[difficulty]!;
  const cleared = Math.max(0, progress.furthestLevel - 1);
  const blockStart = Math.floor((level - 1) / PAGE_SIZE) * PAGE_SIZE;
  const blockDone = Math.min(PAGE_SIZE, Math.max(0, cleared - blockStart));

  const dailyReady = lastClaim !== today(new Date());

  const openDaily = useCallback(() => onNavigate('daily'), [onNavigate]);
  const openStages = useCallback(() => onNavigate('stages'), [onNavigate]);
  // Spec §7, kept exactly: with master sound off the icon is dead and offers to
  // turn it back on; with sound on it cycles the music track.
  const onMusicPress = useCallback(() => {
    const settings = useSettingsStore.getState();
    if (!settings.sound) {
      overlay.modal({
        title: 'Sound is off',
        body: 'Turn sound back on to play music while you sort.',
        confirmLabel: 'Turn on',
        onConfirm: () => useSettingsStore.getState().set('sound', true),
      });
      return;
    }
    overlay.toast(`Now playing · ${settings.cycleMusic()}`);
  }, []);

  return (
    <View style={[styles.root, padding.frame]}>
      <View style={styles.topbar}>
        <CoinPill />
        <Pressable
          style={[styles.iconButton, !sound && styles.iconButtonOff]}
          onPress={onMusicPress}
          accessibilityRole="button"
          accessibilityLabel={sound ? 'Change music track' : 'Sound is off'}
        >
          <Icon
            name={sound && music ? 'sound' : 'mute'}
            size={20}
            color={apothecary.goldLight}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Animated.View
          style={styles.heroSlot}
          entering={FadeInDown.duration(520).delay(STAGGER[0])}
        >
          <HeroRack />
        </Animated.View>

        <View style={styles.stack}>
          <Animated.View entering={FadeInDown.duration(520).delay(STAGGER[1])}>
            <Pressable onPress={onPlay} accessibilityRole="button">
              <Panel contentStyle={styles.continueCard} radius={20}>
                <View style={styles.badge}>
                  <LinearGradient
                    colors={[apothecary.goldLight, apothecary.gold]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.badgeText}>{level}</Text>
                </View>

                <View style={styles.continueInfo}>
                  <Text style={styles.eyebrow}>
                    Continue · {DIFFICULTY_INFO[difficulty].title}
                  </Text>
                  <Text style={styles.continueLevel}>Level {level}</Text>
                  <View style={styles.bar}>
                    <LinearGradient
                      colors={[apothecary.accent, colours.lime]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.barFill,
                        { width: percentWidth(blockDone, PAGE_SIZE) },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.goChip}>
                  <Icon name="play" size={12} color={ui.accentBright} filled />
                </View>
              </Panel>
            </Pressable>
          </Animated.View>

          <Animated.View
            style={styles.chips}
            entering={FadeInDown.duration(520).delay(STAGGER[2])}
          >
            <RewardChip
              icon="gift"
              tint={gradients.gift}
              title="Daily reward"
              detail={dailyReady ? 'Ready to claim' : 'Come back tomorrow'}
              onPress={openDaily}
            />
            <RewardChip
              icon="play"
              tint={gradients.advert}
              title="+50 coins"
              detail="Watch a short ad"
              onPress={openDaily}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(520).delay(STAGGER[3])}>
            <GlossButton label="Play" variant="primary" onPress={openStages} />
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={styles.navSlot}
        entering={FadeInDown.duration(500).delay(NAV_DELAY)}
      >
        <NavBar onNavigate={onNavigate} />
      </Animated.View>
    </View>
  );
});

const RewardChip = memo(function RewardChip({
  icon,
  tint,
  title,
  detail,
  onPress,
}: {
  icon: 'gift' | 'play';
  tint: readonly [string, string];
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.chipPress} onPress={onPress} accessibilityRole="button">
      <Panel contentStyle={styles.chip} radius={16}>
        <LinearGradient colors={tint} style={styles.chipIcon}>
          <Icon name={icon} size={18} color={colours.white} filled={icon === 'play'} />
        </LinearGradient>
        <View style={styles.chipText}>
          <Text style={styles.chipTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.chipDetail} numberOfLines={1}>
            {detail}
          </Text>
        </View>
      </Panel>
    </Pressable>
  );
});
