import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DIFFICULTY_INFO } from '@/game/difficulty';
import { useGameStore } from '@/state/gameStore';
import { overlay } from '@/state/overlayStore';
import { apothecary } from '@/theme/apothecary';
import { colours, gradients, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { countdown, percentWidth } from '@/utils';
import { CoinPill } from './chrome/CoinPill';
import { GlossButton } from './chrome/GlossButton';
import { HeroRack } from './chrome/HeroRack';
import { type NavDestination } from './chrome/NavBar';
import { Panel } from './chrome/Panel';
import { useScreenPadding } from './hooks/useScreenPadding';
import { useClaimTimer } from './hooks/useClaimTimer';
import { useTapHandler } from './hooks/useTapHandler';
import { Icon } from './Icon';
import { PAGE_SIZE } from './StagesScreen';
import { styles } from './styles/HomeScreen.styles';

interface HomeScreenProps {
  onPlay: () => void;
  onNavigate: (destination: NavDestination) => void;
}

/** Entrance stagger, spec §6: 50 / 130 / 210 / 290ms. */
const STAGGER = [50, 130, 210, 290] as const;

export const HomeScreen = memo(function HomeScreen({
  onPlay,
  onNavigate,
}: HomeScreenProps) {
  const padding = useScreenPadding();
  const level = useGameStore((state) => state.level);
  const difficulty = useGameStore((state) => state.difficulty);
  const record = useGameStore((state) => state.record);

  const progress = record[difficulty]!;
  const cleared = Math.max(0, progress.furthestLevel - 1);
  const blockStart = Math.floor((level - 1) / PAGE_SIZE) * PAGE_SIZE;
  const blockDone = Math.min(PAGE_SIZE, Math.max(0, cleared - blockStart));

  // `useClaimTimer` subscribes to `lastClaimAt`, so claiming elsewhere
  // re-renders this chip. Selecting `claimable` instead would pin a stable
  // function identity and leave it reading "Ready to claim" forever.
  const { reward, remaining } = useClaimTimer();

  const play = useTapHandler(onPlay);
  const openDaily = useCallback(() => onNavigate('daily'), [onNavigate]);
  const openStages = useCallback(() => onNavigate('stages'), [onNavigate]);
  /**
   * Says the music is not here yet, and does nothing else.
   *
   * Spec §7 gives this button real behaviour — cycle the track and toast its
   * name, or offer to turn master sound back on when it is off — and that is
   * what it did. But there is no audio in the build, and Settings marks all
   * three sound rows "Soon" for exactly that reason. A button that announces
   * "Now playing · Amberlight" over silence is the same broken promise those
   * badges exist to avoid, just louder for being on the first screen.
   *
   * Restore the §7 logic when there are sound files to play. It is in the git
   * history at this line.
   */
  const musicPress = useCallback(() => {
    overlay.toast('Music arrives in a later update');
  }, []);
  const onMusicPress = useTapHandler(musicPress);

  return (
    <View style={[styles.root, padding.frame]}>
      <View style={styles.topbar}>
        <CoinPill />
        {/* Dimmed and showing the muted glyph: the same "not yet" the Settings
            badges say, in the vocabulary this corner of the screen has. */}
        <Pressable
          style={[styles.iconButton, styles.iconButtonOff]}
          onPress={onMusicPress}
          accessibilityRole="button"
          accessibilityLabel="Music, coming soon"
        >
          <Icon name="mute" size={s(20)} color={apothecary.goldLight} />
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
            <Pressable onPress={play} accessibilityRole="button">
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
                  <Icon name="play" size={s(12)} color={ui.accentBright} filled />
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
              detail={
                reward === null ? `Back in ${countdown(remaining)}` : 'Ready to claim'
              }
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

      {/* Reserves the floating nav bar's space so the Play button never sits
          under it. Root owns the bar itself. */}
      <View style={styles.navSlot} />
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
  const handlePress = useTapHandler(onPress);

  return (
    <Pressable style={styles.chipPress} onPress={handlePress} accessibilityRole="button">
      <Panel contentStyle={styles.chip} radius={16}>
        <LinearGradient colors={tint} style={styles.chipIcon}>
          <Icon name={icon} size={s(18)} color={colours.white} filled={icon === 'play'} />
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
