import { Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { glyphOn } from '@/theme/colors';
import type { PieceSymbol } from '@/theme/apothecary';

/**
 * Colourblind marks, doc §9 and spec §9.
 *
 * One distinct glyph per liquid colour, so colour is never the only signal.
 * Drawn on a 24×24 grid and scaled. These stayed hand-authored when the icons
 * moved to Material Symbols: a colourblind mark's job is to be unlike the other
 * marks on the board, which is a constraint no general icon set is drawn for.
 *
 * Filled shapes, not outlines: an outline on a saturated fill is hard to read
 * at segment size, and these have to be legible at a glance while the player
 * is comparing two tubes.
 */
const GLYPHS: Record<PieceSymbol, { path: string; stroke: boolean }> = {
  dot: { path: 'M12 5 a7 7 0 1 1 0 14 a7 7 0 0 1 0-14 Z', stroke: false },
  triangle: { path: 'M12 4 L20 19 H4 Z', stroke: false },
  star: {
    path: 'M12 3 L14.6 9.4 L21.5 10 L16.3 14.6 L17.8 21.4 L12 17.8 L6.2 21.4 L7.7 14.6 L2.5 10 L9.4 9.4 Z',
    stroke: false,
  },
  diamond: { path: 'M12 3 L20 12 L12 21 L4 12 Z', stroke: false },
  wave: { path: 'M3 12 q4.5-6 9 0 t9 0', stroke: true },
  plus: { path: 'M12 4 V20 M4 12 H20', stroke: true },
  square: { path: 'M5 5 h14 v14 h-14 Z', stroke: false },
  cross: { path: 'M5 5 L19 19 M19 5 L5 19', stroke: true },
  ring: { path: 'M12 5 a7 7 0 1 1 0 14 a7 7 0 0 1 0-14 Z', stroke: true },
  waves: { path: 'M3 9 q4.5-5 9 0 t9 0 M3 16 q4.5-5 9 0 t9 0', stroke: true },
  stripe: { path: 'M6 19 L18 5', stroke: true },
  grid: { path: 'M4 9 H20 M4 15 H20 M9 4 V20 M15 4 V20', stroke: true },
};

export const ColourMark = memo(function ColourMark({
  symbol,
  fill,
  cx,
  cy,
  size,
}: {
  symbol: PieceSymbol;
  /** The liquid underneath — the mark picks a legible colour against it. */
  fill: string;
  cx: number;
  cy: number;
  size: number;
}) {
  const glyph = GLYPHS[symbol];
  const path = useMemo(() => Skia.Path.MakeFromSVGString(glyph.path), [glyph.path]);

  if (!path) return null;

  const scale = size / 24;

  return (
    <Group
      transform={[{ translateX: cx - size / 2 }, { translateY: cy - size / 2 }, { scale }]}
    >
      <Path
        path={path}
        // The mark picks its own colour: a fixed white glyph vanished on the
        // two liquids above L* 84, which is the accessibility feature failing
        // silently on exactly the colours that need it.
        color={glyphOn(fill)}
        style={glyph.stroke ? 'stroke' : 'fill'}
        strokeWidth={2.6}
        strokeCap="round"
        strokeJoin="round"
      />
    </Group>
  );
});
