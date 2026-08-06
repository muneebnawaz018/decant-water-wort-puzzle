import { LinearGradient } from 'expo-linear-gradient';
import { memo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { s } from '@/theme/scale';
import { useTapHandler } from '../hooks/useTapHandler';
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
      <View style={styles.filler} />
      <View style={styles.trailing}>{trailing}</View>
      {/*
        The title is out of flow and spans the whole header, so it lies over
        both buttons. `pointerEvents` has to be on a `View` for that to be
        harmless: on Android a `Text` swallows the touch regardless of the
        prop, which left the back arrow dead on every Android device while iOS
        behaved. A wrapper is the portable form.
      */}
      <View style={styles.titleSlot} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
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
  /** Nothing left in this direction. Greys the button and stops the press —
   * a control that looks spent should not answer a tap, least of all with a
   * buzz that says something happened. */
  dimmed?: boolean;
}) {
  const handlePress = useTapHandler(onPress);

  return (
    <Pressable
      onPress={handlePress}
      disabled={dimmed}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: dimmed }}
    >
      <LinearGradient
        colors={[apothecary.surfaceTop, apothecary.surface]}
        style={[styles.button, dimmed && styles.dimmed]}
      >
        <Icon name={icon} size={s(20)} color={apothecary.goldLight} />
      </LinearGradient>
    </Pressable>
  );
});
