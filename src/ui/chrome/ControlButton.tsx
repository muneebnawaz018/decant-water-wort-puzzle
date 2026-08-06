import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
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
  // The one place chrome still buzzes: undo, redo, hint and the spare vial are
  // moves on the board, not navigation, and they are pressed with the same
  // attention as a pour.
  const handlePress = useTapHandler(onPress, true);
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
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <View style={[styles.slot, disabled && styles.disabled]}>
        <Animated.View style={bounce.style}>
          <View style={[styles.button, disabled && styles.unlit]}>
            <LinearGradient
              colors={[apothecary.surfaceTop, apothecary.surface]}
              style={styles.buttonFace}
            >
              <View style={styles.gloss} pointerEvents="none" />
              {/* The sweep every other button carries. On a round face it also
                  does the work a top-edge hairline cannot: a circle has no
                  edge to catch the light along. */}
              <LinearGradient
                colors={gradients.sheenSoft}
                style={styles.sheen}
                pointerEvents="none"
              />
              {burst.node}
              <Animated.View style={tap.style}>
                <Icon name={icon} size={s(23)} color={apothecary.goldLight} />
              </Animated.View>
            </LinearGradient>
          </View>
        </Animated.View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
});
