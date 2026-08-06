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
import { useTapHandler } from '../hooks/useTapHandler';
import { useTapScale } from '../hooks/useTapScale';
import { s } from '@/theme/scale';
import { section } from './styles/section.styles';
import { KNOB_TRAVEL, styles } from './styles/SettingRow.styles';

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
      <Text style={section.title}>{title}</Text>
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

/** Stable no-op, so a row without an action still gets one hook call. */
const noop = (): void => {};

export const SettingRow = memo(function SettingRow({
  icon,
  label,
  divider = true,
  children,
  onPress,
}: RowProps) {
  // Called unconditionally — `onPress` is optional and a hook cannot be. The
  // wrapped handler is only reachable through the `Pressable` below, which is
  // only rendered when there is something to press.
  const handlePress = useTapHandler(onPress ?? noop);
  const tap = useTapScale();

  const body = (
    <View style={[styles.row, divider && styles.divider]}>
      <Animated.View style={[styles.rowIcon, tap.style]}>
        <Icon name={icon} size={s(18)} color={apothecary.goldLight} />
      </Animated.View>
      {/*
        One line, always.
        
        A row is a fixed-height thing with an icon on the left and a control on
        the right; the moment its label wraps, the row grows and both of those
        stop sitting on the same line as the text they belong to. On the
        narrowest phone this app supports, "Watch a short ad" fits and
        "+50 coins — watch a short ad" did not, which is why the payout moved
        to a chip rather than the label being allowed two lines.

        Truncating is the right failure here: a label that no longer fits is a
        wording problem to fix, and an ellipsis says so plainly instead of
        quietly reflowing the row.
      */}
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      {children}
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={tap.onPressIn}
      onPressOut={tap.onPressOut}
      accessibilityRole="button"
    >
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
    transform: [{ translateX: position.value * KNOB_TRAVEL }],
  }));

  const onPress = useTapHandler(onChange);

  return (
    <Pressable
      onPress={onPress}
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
  const select = useCallback(() => onChange(id), [onChange, id]);
  const onPress = useTapHandler(select);

  if (active) {
    // Already chosen: nothing to change, so nothing to press and nothing to
    // feel.
    return (
      <Pressable disabled accessibilityRole="radio" accessibilityState={{ selected: true }}>
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
