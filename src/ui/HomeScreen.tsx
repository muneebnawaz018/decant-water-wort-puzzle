import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { showRewarded } from '@/ads/rewarded';
import { DIFFICULTY_INFO } from '@/game/difficulty';
import type { NavDestination } from '@/state/navStore';
import { useEconomyStore } from '@/state/economyStore';
import { useGameStore } from '@/state/gameStore';
import { firstUnsolved } from '@/state/progress';
import { overlay } from '@/state/overlayStore';
import { apothecary } from '@/theme/apothecary';
import { colours, gradients } from '@/theme/colors';
import { s } from '@/theme/scale';
import { countdown, percentWidth } from '@/utils';
import { CoinPill } from './chrome/CoinPill';
import { GlossButton } from './chrome/GlossButton';
import { HeroRack } from './chrome/HeroRack';
import { ChromeIconButton } from './chrome/ScreenHeader';
import { Panel } from './chrome/Panel';
import { useScreenPadding } from './hooks/useScreenPadding';
import { useClaimTimer } from './hooks/useClaimTimer';
import { useMercury } from './hooks/useMercury';
import { useTapBurst } from './hooks/useTapBurst';
import { useTapHandler } from './hooks/useTapHandler';
import { claimToast } from './rewardTrack';
import { PAGE_SIZE } from './StagesScreen';
import { styles } from './styles/HomeScreen.styles';
import { EARNINGS } from '@/game/economy';

interface HomeScreenProps {
  onPlay: () => void;
  onNavigate: (destination: NavDestination) => void;
}

/** Entrance stagger, spec §6: 50 / 130 / 210 / 290ms. */
const STAGGER = [50, 130, 210, 290] as const;

/**
 * The two reward chips' marks — `script/make-gift.py`, `script/make-advert.py`.
 *
 * They replaced static glyphs from `Icon.tsx`, and the reason is what the chips
 * are: both are *offers*, not destinations. One pays coins today, the other pays
 * coins for a watch, and an offer that sits perfectly still is indistinguishable
 * from a label. Everything else on this screen that can be pressed either moves
 * or lights up.
 *
 * Their cycles are deliberately different lengths — 3s and 2.5s — so the row
 * never pulses in unison. Two marks beating together on one row read as a
 * loading state rather than as two separate things worth pressing.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const CHIP_MARKS = {
  gift: require('../../assets/lottie/gift.json'),
  advert: require('../../assets/lottie/advert.json'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

type ChipMark = keyof typeof CHIP_MARKS;

/**
 * The Continue card's own two marks — `script/make-arrow.py`,
 * `script/make-badge.py`.
 *
 * Both loop, and both are covered by the same exemption as the chips below: this
 * screen unmounts when you navigate, so nothing here redraws behind anything
 * else. See `assets/lottie/README.md`.
 *
 * Their cycles are 1.7s and 2.6s against the chips' 2s and 3s. Nothing on this
 * screen shares a useful factor with anything else, so the four marks never fall
 * into step — a home screen pulsing in time reads as a loading state.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const ARROW = require('../../assets/lottie/arrow.json');
const BADGE = require('../../assets/lottie/badge.json');
/* eslint-enable @typescript-eslint/no-require-imports */

export const HomeScreen = memo(function HomeScreen({
  onPlay,
  onNavigate,
}: HomeScreenProps) {
  const padding = useScreenPadding();
  const difficulty = useGameStore((state) => state.difficulty);
  const record = useGameStore((state) => state.record);

  const progress = record[difficulty]!;
  /**
   * The level Continue opens — and it has to be exactly that, or the card
   * promises one level and delivers another.
   *
   * An unfinished board in hand wins, because that is what continuing means.
   * Otherwise the mode's first unfinished level. Both halves matter: reading
   * the *loaded* level offered to continue the board still mounted behind the
   * win screen, and reading `currentLevel` offered whichever level was opened
   * last — so replaying level 3 from the grid moved Home back to level 3.
   */
  const loaded = useGameStore((state) => state.level);
  /**
   * A real level of this mode is in hand — not the daily bonus board.
   *
   * The bonus puzzle runs on the same store with `bonus: true`, and its `level`
   * is a seed-derived number in the tens of thousands rather than a position on
   * the ladder. Without this term, playing it and coming back put "Level 20675"
   * on the card, in a badge sized for two digits, offering to continue a board
   * that is not part of the mode's progress at all.
   *
   * It is not a level to continue for the same reason it pays its own coins and
   * unlocks nothing: it sits outside the track. Home is the shortcut into the
   * track, so it goes back to whatever the mode is actually up to.
   */
  const inProgress = useGameStore(
    (state) => !state.bonus && state.history.length > 0 && !state.solved
  );
  const level = inProgress ? loaded : firstUnsolved(progress);
  const cleared = Math.max(0, progress.furthestLevel - 1);
  const blockStart = Math.floor((level - 1) / PAGE_SIZE) * PAGE_SIZE;
  const blockDone = Math.min(PAGE_SIZE, Math.max(0, cleared - blockStart));

  // `useClaimTimer` subscribes to `lastClaimAt`, so claiming elsewhere
  // re-renders this chip. Selecting `claimable` instead would pin a stable
  // function identity and leave it reading "Ready to claim" forever.
  const { reward, remaining } = useClaimTimer();

  const play = useTapHandler(onPlay);
  const mercury = useMercury();
  // The chip is the tap target, and the burst is drawn inside it. It is the
  // only round, clipped face on the card; a ring drawn across a 300dp-wide
  // panel reads as a flash rather than as a press.
  const burst = useTapBurst();
  const openDaily = useCallback(() => onNavigate('daily'), [onNavigate]);
  const openStages = useCallback(() => onNavigate('stages'), [onNavigate]);

  /**
   * The standalone rewarded offer, and the only one that pays with no
   * precondition.
   *
   * It used to open the Daily screen. That is the worst kind of dead control:
   * not one that does nothing, but one that does something *else* — the chip
   * names a number and a price, and the press delivered navigation to a screen
   * where the number is not on offer.
   *
   * The coins land before the toast is raised, so the balance it quotes is the
   * one the pill is already showing.
   */
  const playAdForCoins = useCallback(() => {
    void showRewarded('free_coins').then((outcome) => {
      if (outcome !== 'earned') {
        overlay.toast(
          outcome === 'dismissed'
            ? 'The ad was closed early — no coins this time'
            : 'No ad available right now'
        );
        return;
      }

      useEconomyStore.getState().add(EARNINGS.rewardedAd);
      const balance = useEconomyStore.getState().coins;

      // The shower, then the receipt. The toast is raised on the burst's finish
      // rather than beside it: the celebration layer is full-screen and drawn
      // above the toast, so one shown at the same moment spends its life behind
      // falling coins.
      overlay.coins(() => overlay.toast(claimToast(EARNINGS.rewardedAd, balance)));
    });
  }, []);

  /**
   * Ask before the ad, not after.
   *
   * The chip used to open a full-screen video on the first tap. That is a
   * thirty-second commitment behind a control the size of a thumb, sitting on
   * the screen the app opens to — a mis-tap cost the player a video they never
   * agreed to watch, and an ad nobody chose is the fastest way to make someone
   * stop trusting the button.
   *
   * The dialog also does something the chip cannot: it names the price. The
   * chip says what you get; this says what it costs, which is the half a player
   * needs before saying yes.
   */
  const watchForCoins = useCallback(() => {
    overlay.modal({
      title: `Watch for ${EARNINGS.rewardedAd} coins`,
      body: `A short video, then the coins are yours. You can close it whenever you like, but the coins only land if it finishes.`,
      confirmLabel: 'Watch',
      confirmIcon: 'video',
      cancelLabel: 'Not now',
      onConfirm: playAdForCoins,
    });
  }, [playAdForCoins]);
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
            <Panel contentStyle={styles.continueCard} radius={20}>
              <View style={styles.badge}>
                <LinearGradient
                  colors={[apothecary.goldLight, apothecary.gold]}
                  style={StyleSheet.absoluteFill}
                />
                {/* Behind the number, never over it. The number is the
                      information; the glint is atmosphere, and its sparkles sit
                      in the corners for exactly that reason. */}
                <LottieView
                  source={BADGE}
                  autoPlay
                  loop
                  resizeMode="cover"
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
                    style={[styles.barFill, { width: percentWidth(blockDone, PAGE_SIZE) }]}
                  >
                    {/*
                        The mercury: a highlight running the length of what has
                        been cleared.

                        Inside the fill rather than over the track, so it marks
                        progress rather than promising it — a shimmer on the
                        empty part would read as work in flight. `styles.bar`
                        clips it, and `useMercury` explains why this one is
                        Reanimated while everything else on the card is Lottie.
                      */}
                    <Animated.View style={[styles.mercury, mercury]} />
                  </LinearGradient>
                </View>
              </View>

              {/*
                  The chip is the only tap target on the card.

                  The whole panel used to be pressable, which put a hit area
                  under the level number, the eyebrow and the progress bar —
                  none of which look like buttons, and all of which a thumb
                  lands on while reading. `hitSlop` gives the chip a target
                  larger than its own 56dp without widening what looks tappable.
                */}
              <Pressable
                style={styles.goChip}
                onPress={play}
                onPressIn={burst.fire}
                hitSlop={s(10)}
                accessibilityRole="button"
                accessibilityLabel={`Continue level ${level}`}
              >
                {/*
                    An arrow, not a play triangle. The card says Continue, and a
                    media glyph promises a start rather than a resume.

                    It points continuously rather than sitting still —
                    `goChip`'s own comment calls it a signpost, and a signpost
                    that never points is a decoration. The disc's
                    `overflow: 'hidden'` clips the ring on its way out, which is
                    what makes it read as light leaving the chip; that clip was
                    already there for the burst.
                  */}
                <LottieView
                  source={ARROW}
                  autoPlay
                  loop
                  resizeMode="contain"
                  style={StyleSheet.absoluteFill}
                />
                {burst.node}
              </Pressable>
            </Panel>
          </Animated.View>

          <Animated.View
            style={styles.chips}
            entering={FadeInDown.duration(520).delay(STAGGER[2])}
          >
            <RewardChip
              mark="gift"
              tint={gradients.gift}
              title="Daily reward"
              detail={
                reward === null ? `Back in ${countdown(remaining)}` : 'Ready to claim'
              }
              onPress={openDaily}
            />
            <RewardChip
              mark="advert"
              tint={gradients.advert}
              title={`+${EARNINGS.rewardedAd} coins`}
              detail="Watch a short ad"
              onPress={watchForCoins}
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
  mark,
  tint,
  title,
  detail,
  onPress,
}: {
  mark: ChipMark;
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
          {/*
            Both marks loop, and they are mounted for as long as Home is. That
            is the exemption argued in `assets/lottie/README.md`: screens mount
            one at a time here, so navigating anywhere unmounts both players
            rather than leaving them redrawing behind whatever is on top.
          */}
          <LottieView
            source={CHIP_MARKS[mark]}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.chipMark}
          />
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
