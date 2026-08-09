import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { apothecary } from '@/theme/apothecary';
import { gradients, ui } from '@/theme/colors';
import { usePressBounce } from '../hooks/usePressBounce';
import { useTapBurst } from '../hooks/useTapBurst';
import { useTapHandler } from '../hooks/useTapHandler';
import { styles } from './styles/GlossButton.styles';

type Variant = 'primary' | 'neutral' | 'ghost';

/**
 * Touch area added back to the shrunken sizes.
 *
 * `dialog` draws at about 40dp and `compact` lower still, both under the 44pt
 * minimum. The face is deliberately small — a dialog's own dismissal should not
 * be the largest thing on screen — so the target is restored invisibly instead
 * of by growing the button back.
 */
const SMALL_HIT_SLOP = { top: 6, bottom: 6, left: 6, right: 6 } as const;

/** Where the lit face's middle stop sits — it holds the colour longer than half. */
const PRIMARY_STOPS = [0, 0.55, 1] as const;
const FLAT_STOPS = [0, 1] as const;

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
  /**
   * Disabled because it *already is* what it says, not because it is dead.
   *
   * Both take the press away; only one should look switched off. "Equipped" on
   * the shop's vessel and the mode you are already in on Stages are states
   * being reported, so they keep the lit gold face — the same rule the active
   * stage tab follows, which is disabled and the brightest thing on the screen.
   * Undo at zero moves is the other kind and stays dimmed.
   *
   * Without this the two collapsed: a disabled primary took the dark panel ramp
   * while its label kept the dark-on-gold ink, and "Equipped" came out unreadable.
   */
  on?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Rendered *after* the label — an icon, usually.
   *
   * On the right on purpose, and app-wide. A leading icon pushes the label off
   * the button's centre, so a row of buttons has its text at a different offset
   * in each one depending on whether it carries a glyph. Trailing, the label
   * stays where a label with no icon would be.
   */
  trailing?: ReactNode;
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
  on = false,
  style,
  trailing,
  size = 'regular',
}: GlossButtonProps) {
  const press = useSharedValue(0);
  const handlePress = useTapHandler(onPress);
  const bounce = usePressBounce();
  const burst = useTapBurst(variant === 'primary' ? 'dark' : 'light');

  const onPressIn = useCallback(() => {
    press.value = withTiming(1, { duration: 90 });
    bounce.onPressIn();
    // Fired on press *in*, not on the handler. A burst that waits for the tap
    // to complete arrives after the finger has already lifted.
    burst.fire();
  }, [press, bounce, burst]);
  const onPressOut = useCallback(() => {
    press.value = withTiming(0, { duration: 120 });
    bounce.onPressOut();
  }, [press, bounce]);

  // The button drops 2px; its icon also pulls in, which is what makes the
  // press feel like it landed on something rather than merely moved it.
  const iconScale = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.12 }],
  }));

  const primary = variant === 'primary';
  const hitSlop = size === 'regular' ? undefined : SMALL_HIT_SLOP;
  // `on` is lit, however disabled it is — see the prop.
  const dim = disabled && !on;
  const face = primary
    ? dim
      ? ui.buttonFaceOff
      : ui.buttonFace
    : ([apothecary.surfaceTop, apothecary.surface] as const);

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        hitSlop={hitSlop}
        style={style}
      >
        <Animated.View
          style={[
            styles.ghost,
            size === 'dialog' && styles.dialogGhost,
            size === 'compact' && styles.compactGhost,
            bounce.style,
            dim && styles.disabled,
          ]}
        >
          {burst.node}
          <Text
            style={[
              styles.ghostLabel,
              size === 'dialog' && styles.dialogGhostLabel,
              size === 'compact' && styles.smallGhostLabel,
            ]}
          >
            {label}
          </Text>
          {trailing ? <Animated.View style={iconScale}>{trailing}</Animated.View> : null}
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
      hitSlop={hitSlop}
      style={style}
    >
      <Animated.View
        style={[
          primary ? styles.primaryShadow : styles.shadow,
          bounce.style,
          // The lit variant drops to the panel surface instead of fading. See
          // `ui.buttonFaceOff`.
          dim && (primary ? styles.unlit : styles.disabled),
          // Lit but not live — see `on`.
          disabled && on && styles.settled,
        ]}
      >
        <View
          style={[
            styles.face,
            primary ? styles.primaryStroke : styles.neutralStroke,
            size === 'dialog' && styles.dialogFace,
            size === 'compact' && styles.compactFace,
          ]}
        >
          <LinearGradient
            colors={face}
            /*
              Derived from the ramp, never stated beside it.

              These were two independent expressions — a three-stop list keyed
              on `primary`, and a colour list keyed on `primary` *and*
              `disabled`. A disabled primary takes the two-colour panel ramp, so
              it got three locations for two colours and expo warned on every
              render. Reading the length is the only form that cannot drift.
            */
            locations={face.length === 3 ? PRIMARY_STOPS : FLAT_STOPS}
            style={[
              styles.fill,
              primary ? styles.primaryFill : styles.neutralFill,
              size === 'dialog' && styles.dialogFill,
              size === 'compact' && styles.compactFill,
            ]}
          >
            {/* Spec's `inset 0 2px 0 rgba(255,255,255,.5)` top gloss. */}
            <View
              style={[styles.gloss, { height: primary ? 2 : 1 }]}
              pointerEvents="none"
            />
            {/*
              The shine. A second gradient over the face's own, ending in a
              hard edge partway down — that terminator is what reads as
              polished; a soft fade just looks lighter at the top.

              The neutral variant takes the same sweep at a sixth of the
              strength. Given the primary's 42% white a dark panel goes milky —
              fog on the glass rather than a polished edge — but with none at
              all it is the one flat surface among lit ones.

              The hard edge comes from the layer's *height*, not from
              `locations`. Android was washing the whole face instead of the
              top half, which turned a gold button tan and left its dark label
              looking grey — the two platforms disagreeing about a stop list is
              not worth diagnosing when half a box is unambiguous.
            */}
            <LinearGradient
              colors={primary && !dim ? gradients.sheen : gradients.sheenSoft}
              style={styles.sheen}
              pointerEvents="none"
            />
            {burst.node}
            <View style={styles.content}>
              <Text
                style={[
                  primary ? styles.primaryLabel : styles.label,
                  // A dead primary swaps to the dark panel ramp, and the lit
                  // face's dark ink goes with it — that pairing is what made
                  // "Equipped" unreadable before `on` existed.
                  primary && dim && styles.primaryLabelOff,
                  size === 'dialog' && styles.dialogLabel,
                  size === 'compact' && styles.compactLabel,
                ]}
              >
                {label}
              </Text>
              {/*
                The icon springs with the press, the label does not — a scaling
                word reads as a rendering glitch, a scaling glyph reads as a
                button.

                Rendered only when there is one. An empty wrapper is still a
                flex child, so `content`'s gap opened between the label and
                nothing and left every icon-less button's text sitting half a
                gap left of centre.
              */}
              {trailing ? (
                <Animated.View style={iconScale}>{trailing}</Animated.View>
              ) : null}
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </Pressable>
  );
});
