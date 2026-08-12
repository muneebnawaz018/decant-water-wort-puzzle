import { memo, useEffect, type ReactNode } from 'react';
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
  /**
   * Put the control on its own line under the label.
   *
   * For a control too wide to share a line. A switch or a badge never needs
   * this, and the difficulty picker — the one row that did — now names its
   * value instead, so nothing currently uses it.
   */
  stacked?: boolean;
  /**
   * The trailing `›`, drawn whenever a row is pressable.
   *
   * Off for a row that supplies its own trailing mark. A row that unfolds a
   * list beneath itself wants a downward one, and it must not end up with both:
   * two marks side by side pointing different ways is the row disagreeing with
   * itself about where the press leads.
   */
  chevron?: boolean;
  /**
   * Dim the row: it is reporting a state rather than offering an action.
   *
   * Not the same as having no `onPress`. A row with no handler is often still
   * live information — a value, a badge, a switch someone else owns — and
   * dimming every one of those would grey out half the settings screen. This is
   * for the narrower case where the row *was* an action and is spent: today's
   * bonus puzzle, once it has been played.
   */
  spent?: boolean;
}

/** Stable no-op, so a row without an action still gets one hook call. */
const noop = (): void => {};

export const SettingRow = memo(function SettingRow({
  icon,
  label,
  divider = true,
  children,
  onPress,
  stacked = false,
  chevron = true,
  spent = false,
}: RowProps) {
  // Called unconditionally — `onPress` is optional and a hook cannot be. The
  // wrapped handler is only reachable through the `Pressable` below, which is
  // only rendered when there is something to press.
  const handlePress = useTapHandler(onPress ?? noop);
  const tap = useTapScale();

  const body = (
    <View style={[styles.row, divider && styles.divider, spent && styles.spent]}>
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
      {stacked ? null : children}
      {onPress && chevron ? <Text style={styles.chevron}>›</Text> : null}
    </View>
  );

  if (stacked) {
    return (
      <View style={[styles.stack, divider && styles.divider]}>
        {/* The label line keeps its own divider off — the wrapper carries it,
            so the hairline lands under the control rather than between the two
            halves of one row. */}
        <View style={styles.row}>
          <Animated.View style={styles.rowIcon}>
            <Icon name={icon} size={s(18)} color={apothecary.goldLight} />
          </Animated.View>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <View style={styles.stackControl}>{children}</View>
      </View>
    );
  }

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
 *
 * `disabled` is for a switch that depends on another one — "Taps & buttons"
 * under "All sounds". Naming alone could not carry that: two switches side by
 * side read as independent however they are labelled, so a player turned the
 * master off, saw the dependent one still standing green, and reasonably
 * concluded it was broken. Dimmed and unpressable, the dependency is visible
 * instead of explained. The value underneath is untouched, so it comes back
 * exactly as they left it.
 */
export const Switch = memo(function Switch({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
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
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={disabled && styles.switchOff}
    >
      <View style={[styles.track, value && styles.trackOn]}>
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </Pressable>
  );
});
