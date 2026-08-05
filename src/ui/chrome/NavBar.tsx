import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { gradients } from '@/theme/colors';
import { Icon, type IconName } from '../Icon';
import { styles } from './styles/NavBar.styles';

export type NavDestination = 'daily' | 'shop' | 'stages' | 'stats' | 'settings';

const ITEMS: ReadonlyArray<{
  id: NavDestination;
  icon: IconName;
  label: string;
}> = [
  { id: 'daily', icon: 'gift', label: 'Daily' },
  { id: 'shop', icon: 'shop', label: 'Shop' },
  { id: 'stages', icon: 'stages', label: 'Stages' },
  { id: 'stats', icon: 'stats', label: 'Stats' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

/**
 * Home's bottom navigation (spec §4.2): one grouped rounded panel, flat icons.
 * Grouped rather than five separate buttons — the panel is what reads as a bar.
 */
export const NavBar = memo(function NavBar({
  onNavigate,
}: {
  onNavigate: (destination: NavDestination) => void;
}) {
  return (
    <LinearGradient colors={gradients.navBar} style={styles.bar}>
      <View style={styles.gloss} pointerEvents="none" />
      {ITEMS.map((item) => (
        <NavButton key={item.id} {...item} onNavigate={onNavigate} />
      ))}
    </LinearGradient>
  );
});

const NavButton = memo(function NavButton({
  id,
  icon,
  label,
  onNavigate,
}: {
  id: NavDestination;
  icon: IconName;
  label: string;
  onNavigate: (destination: NavDestination) => void;
}) {
  const onPress = useCallback(() => onNavigate(id), [onNavigate, id]);

  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={24} color={apothecary.goldLight} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
});
