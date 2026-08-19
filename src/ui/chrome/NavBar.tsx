import {
  Canvas,
  LinearGradient as SkiaGradient,
  Path,
  PathOp,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  Easing,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { claimPhase } from '@/game/streak';
import { useEconomyStore } from '@/state/economyStore';
import type { NavDestination } from '@/state/navStore';
import { apothecary } from '@/theme/apothecary';
import { gradients, ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { Icon, type IconName } from '../Icon';
import { useTapBurst } from '../hooks/useTapBurst';
import { useTapHandler } from '../hooks/useTapHandler';
import { useTapScale } from '../hooks/useTapScale';
import {
  NAV_BAR_HEIGHT,
  NAV_RADIUS,
  navBarWidth,
  NOTCH_CENTER_Y,
  NOTCH_RADIUS,
  NOTICE_HALO_START,
  styles,
} from './NavBar.styles';

/**
 * Two tabs, the Home bump, two tabs.
 *
 * Split rather than listed, because the bump is not a fifth item in a row — it
 * sits in a gap the bar is cut around, and the pairs either side have to balance
 * across that gap.
 *
 * **The sides are grouped by subject, and each tab sits beside its sibling.**
 * Left is the game — the levels you can play and the record of the ones you
 * have. Right is the economy — where coins come from and where they go.
 *
 * The order before this paired neither: Stages sat at one end and Progress at
 * the other, Rewards at one end and Shop at the other, so the bar read as four
 * unrelated destinations. A nav bar is the clearest statement of an app's shape
 * a player ever sees, and earn sitting next to spend explains the economy
 * without either screen being opened.
 *
 * It costs something. Stages is the most-visited destination after Home and
 * this moves it from an inner seat to an outer one, which is the harder reach.
 * It is the tab that loses least by moving: Home's Continue card is how a
 * returning player actually resumes, so Stages is for picking a *different*
 * level rather than the next one.
 */
const LEFT: ReadonlyArray<NavItem> = [
  { id: 'stages', icon: 'stages', label: 'Stages' },
  // Label, not id: the screen it opens is titled "Progress", and the bar was
  // the only place still calling it Stats.
  { id: 'stats', icon: 'trophy', label: 'Progress' },
];

const RIGHT: ReadonlyArray<NavItem> = [
  // "Rewards", not "Daily". The destination is what you get, not how often it
  // refreshes — and the screen holds the ad payout and the bonus puzzle too,
  // neither of which is a daily anything.
  { id: 'daily', icon: 'gift', label: 'Rewards' },
  { id: 'shop', icon: 'shop', label: 'Shop' },
];

interface NavItem {
  id: NavDestination;
  icon: IconName;
  label: string;
}

/**
 * The bottom navigation: one rounded panel notched around a raised Home button.
 *
 * Settings used to be the fifth tab and is now the top bar's drawer. A settings
 * screen is somewhere you go once; giving it a permanent seat next to the four
 * places you actually move between made the bar a list of screens rather than a
 * set of destinations.
 *
 * Mounted once in `Root`, not per screen, so navigating never restarts its
 * entrance or pays for a new gradient. `active` marks where you are: a bar that
 * looks identical everywhere is decoration, not navigation.
 */
export const NavBar = memo(function NavBar({
  onNavigate,
  onHome,
  active,
  windowWidth,
  sideInset = 0,
}: {
  onNavigate: (destination: NavDestination) => void;
  onHome: () => void;
  active?: NavDestination;
  windowWidth: number;
  sideInset?: number;
}) {
  const width = navBarWidth(windowWidth, sideInset);

  /**
   * Which destinations have something waiting.
   *
   * Read from the fields rather than through `claimable`, for the reason the
   * rest of this app already follows: a selector returning a store *method*
   * hands back a stable function identity, so the bar would never re-render
   * when the thing behind it changed — and a dot that appears only after an
   * unrelated navigation is worse than no dot.
   *
   * Rewards is the only one with a claim to announce today. Shop sells one free
   * vessel and Stages unlocks in the background; neither has a moment worth
   * interrupting for, and a bar with a dot on every tab teaches players to
   * ignore all of them.
   *
   * `Date.now()` at render rather than a ticking clock: the bar re-renders on
   * every navigation and on every claim, which is often enough for a mark that
   * appears once a day. A timer here would wake the whole app to move a dot.
   */
  const lastClaimAt = useEconomyStore((state) => state.lastClaimAt);
  const dailyWaiting = claimPhase(lastClaimAt, Date.now()) !== 'waiting';

  /**
   * The bar's shape: a rounded rectangle with a circle subtracted from its top
   * edge.
   *
   * A real boolean difference, not a circle painted in the ground color over
   * the bar. The backdrop behind this is a live gradient with drifting motes, so
   * a painted disc would be a flat patch that only matches where the gradient
   * happens to agree — and it would slide out of register the moment the
   * backdrop moved.
   */
  const path = useMemo(() => {
    const bar = Skia.PathBuilder.Make()
      .addRRect(
        Skia.RRectXY(Skia.XYWHRect(0, 0, width, NAV_BAR_HEIGHT), NAV_RADIUS, NAV_RADIUS)
      )
      .detach();
    const notch = Skia.PathBuilder.Make()
      .addCircle(width / 2, NOTCH_CENTER_Y, NOTCH_RADIUS)
      .detach();
    // Falls back to the un-notched bar rather than to nothing: a path op is the
    // one part of this that can return null, and a bar with no bite is a far
    // better failure than no bar at all.
    return Skia.Path.MakeFromOp(bar, notch, PathOp.Difference) ?? bar;
  }, [width]);

  const canvasStyle = useMemo(() => ({ width, height: NAV_BAR_HEIGHT }), [width]);
  const wrapStyle = useMemo(() => ({ width, height: NAV_BAR_HEIGHT }), [width]);
  const gradientEnd = useMemo(() => vec(0, NAV_BAR_HEIGHT), []);
  // Skia's color prop is a mutable array; the palette's ramps are `as const`
  // tuples so two components cannot reach in and edit a shared one.
  const faceColors = useMemo(() => [...gradients.navBar], []);

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <Canvas style={[styles.face, canvasStyle]} pointerEvents="none">
        <Path path={path}>
          <SkiaGradient start={vec(0, 0)} end={gradientEnd} colors={faceColors} />
        </Path>
      </Canvas>

      <View style={styles.row}>
        {LEFT.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            onNavigate={onNavigate}
            active={item.id === active}
          />
        ))}

        {/* The bump's footprint, and its label. The button itself is absolutely
            positioned above the bar, so it cannot be a child of this row. */}
        <View style={styles.spacer}>
          <Text style={styles.spacerLabel}>Home</Text>
        </View>

        {RIGHT.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            onNavigate={onNavigate}
            active={item.id === active}
            notice={item.id === 'daily' && dailyWaiting}
          />
        ))}
      </View>

      <HomeBump onPress={onHome} active={active === undefined} />
    </View>
  );
});

/**
 * The raised Home button sitting in the bar's notch.
 *
 * It is a `Pressable` even when Home is already the screen, unlike the tabs —
 * which disable themselves so a tap that changes nothing is silent. Home here is
 * the way *back* from anything, and the one control a player reaches for without
 * looking; a dead center button is worse than a redundant one.
 */
const HomeBump = memo(function HomeBump({
  onPress,
  active,
}: {
  onPress: () => void;
  active: boolean;
}) {
  const handlePress = useTapHandler(onPress);
  const tap = useTapScale();
  const burst = useTapBurst('dark');

  const onPressIn = useCallback(() => {
    tap.onPressIn();
    burst.fire();
  }, [tap, burst]);

  return (
    <Pressable
      style={styles.bump}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={tap.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel="Home"
    >
      <Animated.View style={[styles.bumpFill, tap.style]}>
        <LinearGradient colors={gradients.gold} style={styles.bumpFill} />
        <View style={styles.bumpGloss} pointerEvents="none" />
      </Animated.View>
      {burst.node}
      <Icon name="home" size={s(25)} color={ui.onGold} />
    </Pressable>
  );
});

/**
 * The unread mark, breathing.
 *
 * **Reanimated, not a Lottie.** The other two marks in this app are Lottie
 * because they are artwork — a vial filling a drop at a time, a burst of coins —
 * and neither can be expressed as a transform. This is a circle scaling and
 * fading, which is two shared values on the UI thread against a native view,
 * a JSON payload and a redraw target for as long as the bar is mounted. The
 * bar is mounted on every screen.
 *
 * The motion is deliberately small: the dot itself swells about six percent
 * while a ring pushes out of it and fades. Anything larger on a mark this size
 * reads as a rendering fault rather than as an invitation, and the bar sits
 * under every screen in the app — a loud pulse there is something a player has
 * to learn to ignore.
 *
 * One reaction driving both layers rather than one each, the same rule the rack
 * and the backdrop follow. Canceled on unmount; nothing in this project loops
 * unattended.
 */
const NoticeDot = memo(function NoticeDot() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  // The ring travels out and fades on the way. `withRepeat(..., false)` restarts
  // rather than reversing, because a ring that shrinks back into the dot reads
  // as it being sucked in.
  const halo = useAnimatedStyle(() => ({
    // Starts at the dot's own size and grows past it. Anything smaller spends
    // the first half of the cycle hidden behind the mark, which is what made
    // the first version look like it was not animating at all — by the time the
    // ring cleared the dot it was already most of the way faded.
    transform: [{ scale: NOTICE_HALO_START + pulse.value * (1 - NOTICE_HALO_START) }],
    opacity: 0.55 * (1 - pulse.value),
  }));

  // The dot's own swell, at a fraction of the ring's travel.
  const mark = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + Math.sin(pulse.value * Math.PI) * 0.14 }],
  }));

  return (
    <>
      <Animated.View style={[styles.noticeHalo, halo]} pointerEvents="none" />
      <Animated.View style={[styles.notice, mark]} pointerEvents="none" />
    </>
  );
});

const NavButton = memo(function NavButton({
  id,
  icon,
  label,
  onNavigate,
  active,
  notice = false,
}: NavItem & {
  onNavigate: (destination: NavDestination) => void;
  active: boolean;
  /** Something is waiting inside. Draws the unread dot on the icon's corner. */
  notice?: boolean;
}) {
  const navigate = useCallback(() => onNavigate(id), [onNavigate, id]);
  const onPress = useTapHandler(navigate);
  const tap = useTapScale();
  const burst = useTapBurst('light');

  const onPressIn = useCallback(() => {
    tap.onPressIn();
    burst.fire();
  }, [tap, burst]);

  /**
   * The pop when a destination becomes the active one.
   *
   * Keyed on `active`, so it fires on arrival rather than on press — the tab
   * you pressed is not the one that animates until the screen actually
   * changes, which is what makes the motion mean "you are here" instead of "I
   * felt that".
   */
  const pop = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    // Snapped to full, then sprung back to rest — the reverse of a press. A
    // spring *to* 1 would settle there and leave the icon permanently larger.
    pop.value = 1;
    pop.value = withSpring(0, { damping: 8, stiffness: 260, mass: 0.5 });
    return () => cancelAnimation(pop);
  }, [active, pop]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pop.value * 0.18 }],
  }));

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={tap.onPressOut}
      // The tab you are already on has nowhere to send you. Left pressable it
      // answered every tap with a buzz and changed nothing.
      disabled={active}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[styles.iconSlot, active && styles.iconSlotActive, tap.style, popStyle]}
      >
        {burst.node}
        <Icon
          name={icon}
          size={s(23)}
          color={active ? apothecary.gold : apothecary.goldLight}
        />
      </Animated.View>
      {/*
        Outside the icon slot and outside the pop, both deliberately. The slot
        clips to its radius, so a dot inside it loses its outer half; and the
        arrival pop is the tab saying "you are here", which is the one moment
        the dot is about to stop being true.
      */}
      {notice ? <NoticeDot /> : null}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
});
