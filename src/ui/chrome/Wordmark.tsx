import {
  Canvas,
  Group,
  LinearGradient,
  Text as SkiaText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { WORDMARK_GRADIENT } from '@/theme/apothecary';
import { ui } from '@/theme/colors';

interface WordmarkProps {
  size?: number;
  /** Overrides the measured width; useful inside a fixed layout slot. */
  width?: number;
}

const TEXT = 'DECANT';
/** Spec §3: 0.14em tracking. */
const TRACKING = 0.14;

/**
 * "DECANT" in metallic gold (spec §3).
 *
 * Drawn in Skia rather than as an RN `Text`: gradient-filled text needs a
 * shader on the glyphs themselves, and RN can only tint text a flat color.
 * The emboss below is a second copy offset by a pixel, which is what
 * `drop-shadow(0 2px 1px)` amounts to.
 */
export const Wordmark = memo(function Wordmark({ size = 38, width }: WordmarkProps) {
  // The TTF directly, not `matchFont`: the bundled Poppins registers under
  // family names like `Poppins_700Bold`, which name-and-weight matching misses.
  const font = useFont(
    // A Metro asset require, not a module import: `useFont` needs the bundled
    // asset reference, and an ESM import of a .ttf does not produce one.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf'),
    size
  );

  const letterSpacing = size * TRACKING;
  const glyphs = useMemo(() => {
    if (!font) return [];
    let x = 0;
    return TEXT.split('').map((letter) => {
      const at = x;
      x += font.measureText(letter).width + letterSpacing;
      return { letter, x: at };
    });
  }, [font, letterSpacing]);

  const measured = useMemo(() => {
    if (!font || glyphs.length === 0) return 0;
    const last = glyphs[glyphs.length - 1]!;
    return last.x + font.measureText(last.letter).width;
  }, [font, glyphs]);

  const canvasWidth = width ?? measured;
  const height = size * 1.45;
  const baseline = size;

  if (!font || canvasWidth <= 0) return null;

  const offset = (canvasWidth - measured) / 2;

  return (
    <Canvas style={{ width: canvasWidth, height }}>
      {/* Emboss first, so the gold sits on top of it. */}
      <Group transform={[{ translateY: 2 }]} opacity={0.55}>
        {glyphs.map((glyph, index) => (
          <SkiaText
            key={index}
            x={offset + glyph.x}
            y={baseline}
            text={glyph.letter}
            font={font}
            color={ui.emboss}
          />
        ))}
      </Group>

      <Group>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[...WORDMARK_GRADIENT]}
          positions={[0, 0.46, 1]}
        />
        {glyphs.map((glyph, index) => (
          <SkiaText
            key={index}
            x={offset + glyph.x}
            y={baseline}
            text={glyph.letter}
            font={font}
          />
        ))}
      </Group>
    </Canvas>
  );
});
