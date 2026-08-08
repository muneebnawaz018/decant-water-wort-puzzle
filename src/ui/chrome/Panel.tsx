import { memo, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { apothecary, HAIRLINE, SPACE } from '@/theme/apothecary';
import { styles } from './styles/Panel.styles';

interface PanelProps {
  children?: ReactNode;
  /** Outer box: width, margin, flex. */
  style?: StyleProp<ViewStyle>;
  /**
   * Inner box: padding, and how the children lay out.
   *
   * Kept separate because the gloss gradient — not the outer view — is what
   * actually contains the children. Passing `flexDirection` or `padding` in
   * `style` lands it on the shadow wrapper, where it silently does nothing.
   */
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  /**
   * A wash over the card's own gloss, for a panel that has to read as a
   * different *kind* of surface — today's reward tile, the grand row.
   *
   * It exists because `backgroundColor` in `contentStyle` silently does
   * nothing: that style lands on the `LinearGradient`, and a gradient paints
   * over the background of the view it belongs to. Every caller that tried it
   * got a card identical to the plain one and no warning — the daily track's
   * gold ring and the grand row's tint were both written that way and neither
   * had ever appeared on screen.
   *
   * Drawn above the gloss and below the children, so it tints the surface
   * without dimming the text on it.
   */
  tint?: string;
}

/**
 * The card surface every screen is built from (spec §3): a vertical gloss from
 * `surfaceTop` down to `surface`, a hairline light border, a drop shadow, and a
 * 1px inner top highlight.
 *
 * The inner highlight is a real 1px view rather than a shadow — RN has no
 * `inset` shadow, and faking it with a second gradient costs a whole layer.
 */
export const Panel = memo(function Panel({
  children,
  style,
  contentStyle,
  radius = SPACE.cardRadius,
  tint,
}: PanelProps) {
  return (
    <View style={[styles.shadow, { borderRadius: radius }, style]}>
      <LinearGradient
        colors={[apothecary.surfaceTop, apothecary.surface]}
        style={[styles.fill, { borderRadius: radius - HAIRLINE }, contentStyle]}
      >
        {tint ? (
          <View
            style={[styles.tint, { backgroundColor: tint, borderRadius: radius }]}
            pointerEvents="none"
          />
        ) : null}
        <View
          style={[styles.topHighlight, { borderRadius: radius }]}
          pointerEvents="none"
        />
        {children}
      </LinearGradient>
    </View>
  );
});
