import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { apothecary } from '@/theme/apothecary';
import { Icon, type IconName } from '../Icon';
import { Panel } from './Panel';
import { styles } from './styles/SettingRow.styles';

/** A titled group of rows, as used by Settings, Shop and Daily (spec §4.9). */
export const SettingGroup = memo(function SettingGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <Panel>{children}</Panel>
    </View>
  );
});

interface RowProps {
  icon: IconName;
  label: string;
  /** Hairline below the row. Omitted on the last row of a group. */
  divider?: boolean;
  children?: ReactNode;
  onPress?: () => void;
}

export const SettingRow = memo(function SettingRow({
  icon,
  label,
  divider = true,
  children,
  onPress,
}: RowProps) {
  const body = (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={18} color={apothecary.goldLight} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
});

/**
 * The switch from spec §3: a track that goes green, and a knob that slides.
 * The knob animates on the UI thread so a toggle never costs a React render
 * per frame.
 */
export const Switch = memo(function Switch({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
}) {
  const position = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    position.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, position]);

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value * 19 }],
  }));

  return (
    <Pressable
      onPress={onChange}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.track, value && styles.trackOn]}>
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </Pressable>
  );
});

/** The segmented control from spec §4.9 — gold for the chosen option. */
export const Segmented = memo(function Segmented({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <SegmentButton
          key={option.id}
          id={option.id}
          label={option.label}
          active={option.id === value}
          onChange={onChange}
        />
      ))}
    </View>
  );
});

const SegmentButton = memo(function SegmentButton({
  id,
  label,
  active,
  onChange,
}: {
  id: string;
  label: string;
  active: boolean;
  onChange: (id: string) => void;
}) {
  const onPress = useCallback(() => onChange(id), [onChange, id]);

  if (active) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected: true }}
      >
        <LinearGradient
          colors={[apothecary.goldLight, apothecary.gold]}
          style={styles.segment}
        >
          <Text style={styles.segmentTextOn}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="radio" style={styles.segment}>
      <Text style={styles.segmentText}>{label}</Text>
    </Pressable>
  );
});
