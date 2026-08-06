import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { apothecary } from '@/theme/apothecary';
import { gradients } from '@/theme/colors';
import { s } from '@/theme/scale';
import { Icon, type IconName } from '../Icon';
import { useTapHandler } from '../hooks/useTapHandler';
import { useTapScale } from '../hooks/useTapScale';
import { styles } from './styles/NavBar.styles';

export type NavDestination = 'daily' | 'shop' | 'stages' | 'stats' | 'settings';

const ITEMS: ReadonlyArray<{
  id: NavDestination;
  icon: IconName;
  label: string;
}> = [
  // "Rewards", not "Daily". The destination is what you get, not how often it
  // refreshes — and the screen holds the ad payout and the bonus puzzle too,
  // neither of which is a daily anything.
  { id: 'daily', icon: 'gift', label: 'Rewards' },
  { id: 'shop', icon: 'shop', label: 'Shop' },
  { id: 'stages', icon: 'stages', label: 'Stages' },
  // Label, not id: the screen it opens is titled "Your progress", and the bar
  // was the only place still calling it Stats.
  { id: 'stats', icon: 'stats', label: 'Progress' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

/**
 * The bottom navigation (spec §4.2): one grouped rounded panel, flat icons.
 * Grouped rather than five separate buttons — the panel is what reads as a bar.
 *
 * It is mounted once in `Root`, not per screen, so navigating never restarts
 * its entrance or pays for a new gradient. `active` marks where you are: a bar
 * that looks identical everywhere is decoration, not navigation.
 */
export const NavBar = memo(function NavBar({
  onNavigate,
  active,
}: {
  onNavigate: (destination: NavDestination) => void;
  active?: NavDestination;
}) {
  return (
    <View style={styles.bar}>
      <LinearGradient colors={gradients.navBar} style={styles.barFace}>
        <View style={styles.gloss} pointerEvents="none" />
        {ITEMS.map((item) => (
          <NavButton
            key={item.id}
            {...item}
            onNavigate={onNavigate}
            active={item.id === active}
          />
        ))}
      </LinearGradient>
    </View>
  );
});

const NavButton = memo(function NavButton({
  id,
  icon,
  label,
  onNavigate,
  active,
}: {
  id: NavDestination;
  icon: IconName;
  label: string;
  onNavigate: (destination: NavDestination) => void;
  active: boolean;
}) {
  const navigate = useCallback(() => onNavigate(id), [onNavigate, id]);
  const onPress = useTapHandler(navigate);
  const tap = useTapScale();

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
      style={styles.button}
      onPress={onPress}
      onPressIn={tap.onPressIn}
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
        <Icon
          name={icon}
          size={s(24)}
          color={active ? apothecary.gold : apothecary.goldLight}
        />
      </Animated.View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
});
