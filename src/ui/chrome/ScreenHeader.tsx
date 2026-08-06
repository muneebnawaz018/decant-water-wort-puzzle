import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { apothecary } from '@/theme/apothecary';
import { gradients } from '@/theme/colors';
import { s } from '@/theme/scale';
import { usePressBounce } from '../hooks/usePressBounce';
import { useTapBurst } from '../hooks/useTapBurst';
import { useTapHandler } from '../hooks/useTapHandler';
import { useTapScale } from '../hooks/useTapScale';
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
  const tap = useTapScale();
  const burst = useTapBurst();
  const bounce = usePressBounce();

  const onPressIn = useCallback(() => {
    tap.onPressIn();
    bounce.onPressIn();
    burst.fire();
  }, [tap, bounce, burst]);

  const onPressOut = useCallback(() => {
    tap.onPressOut();
    bounce.onPressOut();
  }, [tap, bounce]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={dimmed}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: dimmed }}
    >
      {/* The stroke is the outer view's background showing through its padding,
          not a `borderWidth` — see `HAIRLINE`. */}
      <Animated.View style={[styles.button, dimmed && styles.dimmed, bounce.style]}>
        <LinearGradient
          colors={[apothecary.surfaceTop, apothecary.surface]}
          style={styles.buttonFace}
        >
          {/* The same sweep the buttons carry, so the chrome squares are not
              the one unlit surface on the screen. */}
          <LinearGradient
            colors={gradients.sheenSoft}
            style={styles.sheen}
            pointerEvents="none"
          />
          {burst.node}
          {/* The glyph springs, not the button. Scaling the whole chrome
              square would pull its stroke and its shadow with it. */}
          <Animated.View style={tap.style}>
            <Icon name={icon} size={s(20)} color={apothecary.goldLight} />
          </Animated.View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});
