import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DIFFICULTY_INFO } from '@/game/difficulty';
import type { NavDestination } from '@/state/navStore';
import { useGameStore } from '@/state/gameStore';
import { overlay } from '@/state/overlayStore';
import { apothecary } from '@/theme/apothecary';
import { colours, gradients, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { countdown, percentWidth } from '@/utils';
import { CoinPill } from './chrome/CoinPill';
import { GlossButton } from './chrome/GlossButton';
import { HeroRack } from './chrome/HeroRack';
import { ChromeIconButton } from './chrome/ScreenHeader';
import { Panel } from './chrome/Panel';
import { useScreenPadding } from './hooks/useScreenPadding';
import { useClaimTimer } from './hooks/useClaimTimer';
import { useTapBurst } from './hooks/useTapBurst';
import { useTapHandler } from './hooks/useTapHandler';
import { Icon } from './Icon';
import { PAGE_SIZE } from './StagesScreen';
import { styles } from './styles/HomeScreen.styles';
import { EARNINGS } from '@/game/economy';

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
  // The whole card is the tap target, but the burst belongs in the chip: it is
  // the only round, clipped face on the card, and a ring drawn across a
  // 300dp-wide panel reads as a flash rather than as a press.
  const burst = useTapBurst();
  const openDaily = useCallback(() => onNavigate('daily'), [onNavigate]);
  const openStages = useCallback(() => onNavigate('stages'), [onNavigate]);
  /*
    The music button is gone from this corner.

    Spec §7 gives it real behaviour — cycle the track and toast its name, or
    offer to turn master sound back on when it is off — and that is what it did
    until there was no audio in the build to cycle. What was left was a dimmed
    control whose entire function was to say "not yet", sitting in the top-right
    of the first screen a player sees, beside the one button up there that does
    something.

    The three "Soon" rows in the settings drawer already carry that message,
    where a player is looking for settings rather than being told about one.
    Restore the §7 logic here when there are sound files to play; it is in the
    git history at this line.
  */

  return (
    <View style={[styles.root, padding.frame]}>
      <View style={styles.topbar}>
        <CoinPill />
        {/* Settings lives behind this, not in the nav bar. See
            `SettingsDrawer`. */}
        <ChromeIconButton icon="menu" onPress={overlay.drawer} label="Settings" />
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
            <Pressable onPress={play} onPressIn={burst.fire} accessibilityRole="button">
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
                  {/* An arrow, not a play triangle. The card says Continue, and
                      a media glyph promises a start rather than a resume. */}
                  <Icon name="next" size={s(18)} color={ui.accentBright} />
                  {burst.node}
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
              title={`+${EARNINGS.rewardedAd} coins`}
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
          <Icon name={icon} size={s(18)} color={colours.white} />
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
