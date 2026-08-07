import { Canvas, Group, Path, Rect, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { bandsFor, type PowerSource } from '@/system/battery';
import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';

/**
 * The app's own vial, as drawn on the launcher icon and the splash.
 *
 * Not a glyph from the icon set. `labs`, Material's test tube, was here first
 * and filled at 22dp it loses the neck — what is left is a rounded rectangle
 * with a cap, which reads as a battery. Every icon in `Icon.tsx` is filled by
 * rule, so there was no outline variant to fall back to.
 *
 * The shape is lifted verbatim from `assets/icons/decant-icon.svg`, so the mark
 * in the drawer is the mark on the home screen. What makes it legible at this
 * size is the same thing that makes it legible at 1024: an *outlined* tube with
 * coloured liquid sitting in the bottom of it. Neither half works alone — the
 * outline alone is a battery, the fill alone is a pill.
 */
const VIAL =
  'M362.0 344.0 Q362.0 206.0 500.0 206.0 L524.0 206.0 Q662.0 206.0 662.0 344.0 L662.0 614.0 Q662.0 746.0 530.0 746.0 L494.0 746.0 Q362.0 746.0 362.0 614.0 Z';

/** The artwork's own grid, and the vial's box inside it. */
const LEFT = 362;
const TOP = 206;
const WIDTH = 300;
const HEIGHT = 540;

/**
 * Where the glass is divided, as shares of the tube's height.
 *
 * Quarters, matching the four segments the launcher icon draws and the four a
 * board vial holds. They are what keeps the mark reading as a vial at a full
 * charge, when the liquid would otherwise be one unbroken column.
 */
const SEAMS = [0.25, 0.5, 0.75] as const;

/** In artwork units, so it scales with the mark rather than staying 4dp. */
const SEAM_WEIGHT = 9;

/**
 * Parsed once. An `SkPath` is a native object and this mark is mounted by the
 * drawer every time it opens; the path is never transformed, only the canvas.
 */
const PATH = Skia.Path.MakeFromSVGString(VIAL);

export const AppMark = memo(function AppMark({
  size,
  level = null,
  source = 'unknown',
}: {
  size: number;
  /**
   * Battery charge, 0..1, or `null` for no reading.
   *
   * Omitted, the mark draws the brand's two-band stack — which is what an iOS
   * simulator, a device that will not report, and the frame before the first
   * read all get. A mark that cannot show a level should look like a logo, not
   * like an empty gauge.
   */
  level?: number | null;
  source?: PowerSource;
}) {
  const bands = bandsFor(level, source);

  // Height-driven: the tube is taller than it is wide, so fitting by width
  // would run it off the top and bottom of its box.
  const scale = size / HEIGHT;
  const inset = (size - WIDTH * scale) / 2;

  const transform = useMemo(
    () => [{ translateX: inset }, { scale }, { translateX: -LEFT }, { translateY: -TOP }],
    [inset, scale]
  );
  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  // The stroke is in artwork units, so it scales with everything else rather
  // than staying 13.5dp wide on a 22dp mark.
  const stroke = 13.5;

  if (!PATH) return null;

  return (
    <Canvas style={canvasStyle}>
      <Group transform={transform}>
        {/* Liquid first, clipped to the glass, then the glass drawn over it —
            the same order the icon's own artwork uses. */}
        <Group clip={PATH}>
          {bands.map((band) => (
            <Rect
              key={band.colour}
              x={LEFT}
              y={TOP + HEIGHT * band.top}
              width={WIDTH}
              height={HEIGHT * (1 - band.top)}
              color={band.colour}
            />
          ))}

          {/*
            The seams the board's own segments carry, for the same reason.

            AGENTS.md: two adjacent segments of one colour read as a single tall
            band, and a vial stops looking like four units. That is exactly what
            a full battery did here — one unbroken green column, which is the
            capsule this mark was redrawn to stop being.

            Ruled across the whole tube rather than only the liquid, so the
            divisions are a property of the glass and stay put as the level
            moves. Clipped to the glass by the group, so they cannot escape the
            rounded ends.
          */}
          {SEAMS.map((at) => (
            <Rect
              key={at}
              x={LEFT}
              y={TOP + HEIGHT * at}
              width={WIDTH}
              height={SEAM_WEIGHT}
              color={ui.segmentSeam}
            />
          ))}
        </Group>
        <Path
          path={PATH}
          color={apothecary.goldLight}
          style="stroke"
          strokeWidth={stroke}
        />
      </Group>
    </Canvas>
  );
});
