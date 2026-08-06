import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { useTapHandler } from '../hooks/useTapHandler';
import { styles } from './styles/GlossButton.styles';

type Variant = 'primary' | 'neutral' | 'ghost';

/**
 * `regular` is the full face — Home's Play button and the board's controls.
 * `dialog` is for buttons inside a card, where the full size would outweigh
 * everything around it. `compact` is the smallest, for pills in a list row.
 */
type Size = 'regular' | 'dialog' | 'compact';

interface GlossButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Rendered left of the label — an icon, usually. */
  leading?: ReactNode;
  /** Tighter padding. See `Size`. */
  size?: Size;
}

/**
 * The button from spec §3.
 *
 * Note the explicit design correction the spec carries: **no raised bottom
 * lip**. Coloured bottom bevels were tried and rejected. What is left is a flat
 * glossy face — bright top highlight, soft bottom shade, neutral drop shadow —
 * that presses down 2px.
 */
export const GlossButton = memo(function GlossButton({
  label,
  onPress,
  variant = 'neutral',
  disabled = false,
  style,
  leading,
  size = 'regular',
}: GlossButtonProps) {
  const press = useSharedValue(0);
  const handlePress = useTapHandler(onPress);

  const onPressIn = useCallback(() => {
    press.value = withTiming(1, { duration: 90 });
  }, [press]);
  const onPressOut = useCallback(() => {
    press.value = withTiming(0, { duration: 120 });
  }, [press]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * 2 }],
  }));

  const primary = variant === 'primary';

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        style={style}
      >
        <Animated.View
          style={[
            styles.ghost,
            size === 'dialog' && styles.dialogGhost,
            size === 'compact' && styles.compactGhost,
            animated,
            disabled && styles.disabled,
          ]}
        >
          {leading}
          <Text style={[styles.ghostLabel, size === 'compact' && styles.smallGhostLabel]}>
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={style}
    >
      <Animated.View
        style={[
          primary ? styles.primaryShadow : styles.shadow,
          animated,
          disabled && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={primary ? ui.buttonFace : [apothecary.surfaceTop, apothecary.surface]}
          locations={primary ? [0, 0.55, 1] : [0, 1]}
          style={[
            styles.face,
            primary ? styles.primaryFace : styles.neutralFace,
            size === 'dialog' && styles.dialogFace,
            size === 'compact' && styles.compactFace,
          ]}
        >
          {/* Spec's `inset 0 2px 0 rgba(255,255,255,.5)` top gloss. */}
          <View style={[styles.gloss, { height: primary ? 2 : 1 }]} pointerEvents="none" />
          <View style={styles.content}>
            {leading}
            <Text
              style={[
                primary ? styles.primaryLabel : styles.label,
                size === 'dialog' && styles.dialogLabel,
                size === 'compact' && styles.compactLabel,
              ]}
            >
              {label}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});
