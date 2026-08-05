import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { Icon, type IconName } from '../Icon';
import { styles } from './styles/ScreenHeader.styles';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  /** Rendered at the right end — a second action, usually. */
  trailing?: ReactNode;
}

/** Back button and title, shared by every screen below Home (spec §4). */
export const ScreenHeader = memo(function ScreenHeader({
  title,
  onBack,
  trailing,
}: ScreenHeaderProps) {
  return (
    <View style={styles.head}>
      <ChromeIconButton icon="back" onPress={onBack} label="Back" />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
});

/** The 42px glossy square button used across the chrome (spec §3). */
export const ChromeIconButton = memo(function ChromeIconButton({
  icon,
  onPress,
  label,
  dimmed = false,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  dimmed?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <LinearGradient
        colors={[apothecary.surfaceTop, apothecary.surface]}
        style={[styles.button, dimmed && styles.dimmed]}
      >
        <Icon name={icon} size={20} color={apothecary.goldLight} />
      </LinearGradient>
    </Pressable>
  );
});
