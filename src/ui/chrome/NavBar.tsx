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
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

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
  NOTCH_CENTRE_Y,
  NOTCH_RADIUS,
  styles,
} from './styles/NavBar.styles';

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
   * The bar's shape: a rounded rectangle with a circle subtracted from its top
   * edge.
   *
   * A real boolean difference, not a circle painted in the ground colour over
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
      .addCircle(width / 2, NOTCH_CENTRE_Y, NOTCH_RADIUS)
      .detach();
    // Falls back to the un-notched bar rather than to nothing: a path op is the
    // one part of this that can return null, and a bar with no bite is a far
    // better failure than no bar at all.
    return Skia.Path.MakeFromOp(bar, notch, PathOp.Difference) ?? bar;
  }, [width]);

  const canvasStyle = useMemo(() => ({ width, height: NAV_BAR_HEIGHT }), [width]);
  const wrapStyle = useMemo(() => ({ width, height: NAV_BAR_HEIGHT }), [width]);
  const gradientEnd = useMemo(() => vec(0, NAV_BAR_HEIGHT), []);
  // Skia's colour prop is a mutable array; the palette's ramps are `as const`
  // tuples so two components cannot reach in and edit a shared one.
  const faceColours = useMemo(() => [...gradients.navBar], []);

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <Canvas style={[styles.face, canvasStyle]} pointerEvents="none">
        <Path path={path}>
          <SkiaGradient start={vec(0, 0)} end={gradientEnd} colors={faceColours} />
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
 * looking; a dead centre button is worse than a redundant one.
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

const NavButton = memo(function NavButton({
  id,
  icon,
  label,
  onNavigate,
  active,
}: NavItem & {
  onNavigate: (destination: NavDestination) => void;
  active: boolean;
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
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
});
