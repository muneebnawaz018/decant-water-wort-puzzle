import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { apothecary } from '@/theme/apothecary';
import { Icon, type IconName } from '../Icon';
import { styles } from './styles/ControlButton.styles';

/**
 * A round board control with a caption underneath (spec §4.4): Undo, Redo,
 * Hint, Add vial.
 *
 * Round rather than the square chrome button, because these sit under the
 * board and need to read as a different class of thing from navigation.
 */
export const ControlButton = memo(function ControlButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const press = useSharedValue(0);

  const onPressIn = useCallback(() => {
    press.value = withTiming(1, { duration: 90 });
  }, [press]);
  const onPressOut = useCallback(() => {
    press.value = withTiming(0, { duration: 120 });
  }, [press]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * 3 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <View style={[styles.slot, disabled && styles.disabled]}>
        <Animated.View style={animated}>
          <LinearGradient
            colors={[apothecary.surfaceTop, apothecary.surface]}
            style={styles.button}
          >
            <View style={styles.gloss} pointerEvents="none" />
            <Icon name={icon} size={23} color={apothecary.goldLight} />
          </LinearGradient>
        </Animated.View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
});
