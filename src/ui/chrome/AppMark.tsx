import { Canvas, Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { CELLS, chargeFor, type PowerSource } from '@/system/battery';
import { apothecary } from '@/theme/apothecary';

/**
 * The device battery, drawn lying down: outlined casing, terminal on the right,
 * blocks filling from the left.
 *
 * Two earlier versions are worth knowing about, because both failed the same
 * way and this one is the correction.
 *
 * It began as the app's vial — the mark on the launcher, on the reasoning that
 * the drawer should carry the identity. Nobody looking at a gold tube thinks
 * "battery", so the number it carried went unread. Then it became a cell filled
 * with the board's liquid shader, which was closer but still asks the eye to
 * *measure a height*: a moving surface at this size is a fraction to estimate,
 * and it never settles enough to be read at a glance.
 *
 * Blocks ask the eye to count instead, and counting to five is instant and
 * exact. That is the whole argument for this shape, and it is why the ripple is
 * gone rather than merely slowed — the motion was never the problem, the
 * continuous fill was.
 *
 * Horizontal, matching the status bar two inches above it. Upright is the
 * charging-screen convention; lying down is the one people read a hundred times
 * a day without thinking, which is what a glyph this small needs.
 *
 * No animation at all now, which also means no clock, no shader, and nothing to
 * cancel when the drawer closes.
 */

/** Height as a share of width. A battery is about twice as wide as it is tall. */
const ASPECT = 0.5;
/** The terminal, as shares of the mark's width and the body's height. */
const CAP_WIDTH = 0.055;
const CAP_HEIGHT = 0.4;
/** Air between the body and the terminal, as a share of the width. */
const CAP_GAP = 0.02;
/**
 * The outline, as a share of the mark's *height*.
 *
 * Height, not width: the stroke has to clear the blocks inside it, and it is
 * the short side that runs out of room first. Heavy on purpose — the same rule
 * AGENTS.md sets for the board's tubes, where a bold outline reads as drawn and
 * a hairline reads as a chart.
 */
const STROKE = 0.15;
/** Between the outline's inside edge and the blocks, as a share of height. */
const PADDING = 0.1;
/**
 * Between two blocks, as a share of one block's slot.
 *
 * Divided **between** the blocks, not tacked onto each of them. Giving every
 * block a trailing gap leaves one hanging off the last block, so a full battery
 * stops short of its own casing and reads as 90-something percent — the one
 * reading that has to be unambiguous.
 */
const CELL_GAP = 0.24;

/**
 * The charging bolt, in a 0..1 box, built once.
 *
 * Drawn here rather than taken from `Icon.tsx`: every `Icon` is its own Skia
 * canvas, and a second surface inside a 24dp mark to hold six line segments is
 * not a trade worth making. A unit box also means the bolt is positioned by the
 * same geometry as everything else on the mark instead of by a 960-grid
 * transform that would have to be kept in step with it.
 */
const BOLT = Skia.PathBuilder.Make()
  .moveTo(0.62, 0.0)
  .lineTo(0.2, 0.56)
  .lineTo(0.46, 0.56)
  .lineTo(0.38, 1.0)
  .lineTo(0.8, 0.44)
  .lineTo(0.54, 0.44)
  .close()
  .detach();

/**
 * The bolt's height, as a share of a cell's.
 *
 * Matched to the cells, not taller than them. 1.34 was tried and the glyph's
 * two points crossed the casing's top and bottom rails — the outline stopped
 * being a closed container, which is the one thing that makes the shape read as
 * a battery at all. The dark rim adds its own width on top of this, so the bolt
 * still fills the interior at parity.
 */
const BOLT_HEIGHT = 1.0;
/**
 * The bolt's own extent in its unit box, on x.
 *
 * The path is 1 tall but does not start at x 0, so centering it means offsetting
 * by its left edge as well as by half its width. Stated rather than measured:
 * `computeTightBounds` is a native call, and these two numbers are visible in
 * the path above.
 */
const BOLT_X0 = 0.2;
const BOLT_X1 = 0.8;
/**
 * The dark edge carried around the bolt, as a share of the mark's height.
 *
 * Not decoration. The bolt lies across both lit cells and unlit background, and
 * it has to read on both — gold on green and gold on the drawer's purple are
 * each fine on their own, but the boundary between them runs straight through
 * the glyph. A ground-colored stroke separates it from whatever is behind, the
 * same trick the status bar's own bolt uses.
 */
const BOLT_EDGE = 0.11;

/**
 * Places the unit bolt over the battery's body.
 *
 * A transform rather than a rebuilt path: the shape is immutable and shared, so
 * only the canvas moves — the same rule `Icon.tsx` follows for its glyphs, and
 * the reason `BOLT` can be built once at module scope.
 */
function boltTransform(
  bodyWidth: number,
  height: number,
  cellHeight: number
  // Mutable, not `ReadonlyArray` — Skia's transform prop takes an array it
  // reserves the right to write to, the same constraint `NavBar` hits with its
  // gradient colors.
): Array<{ translateX: number } | { translateY: number } | { scale: number }> {
  const boltHeight = cellHeight * BOLT_HEIGHT;
  const boltWidth = boltHeight * (BOLT_X1 - BOLT_X0);

  return [
    // Half the leftover, less the path's own left edge — the glyph starts at
    // `BOLT_X0`, not at zero, so centering on width alone lands it right of
    // center by a fifth of its height.
    { translateX: (bodyWidth - boltWidth) / 2 - BOLT_X0 * boltHeight },
    { translateY: (height - boltHeight) / 2 },
    { scale: boltHeight },
  ];
}

export const AppMark = memo(function AppMark({
  size,
  level = null,
  source = 'unknown',
}: {
  /** The mark's **width**. Height follows from it, since this is not square. */
  size: number;
  /**
   * Battery charge, 0..1, or `null` for no reading.
   *
   * Omitted, the mark draws five green cells — which is what an iOS simulator,
   * a device that will not report, and the frame before the first read all get.
   * Full and green is the one fallback that cannot be misread as bad news.
   */
  level?: number | null;
  source?: PowerSource;
}) {
  const charge = chargeFor(level, source);

  const geometry = useMemo(() => {
    const height = size * ASPECT;
    const stroke = height * STROKE;
    const capWidth = size * CAP_WIDTH;
    const capHeight = height * CAP_HEIGHT;
    const bodyWidth = size - capWidth - size * CAP_GAP;

    // The blocks sit inside the outline, not under it. A stroke is centered on
    // the path it follows, so clearing it costs a whole stroke plus the gap.
    const inset = stroke + height * PADDING;
    const track = bodyWidth - inset * 2;
    // `CELLS - 1` gaps, not `CELLS`. The blocks then span the track exactly.
    const gap = ((track / CELLS) * CELL_GAP * (CELLS - 1)) / CELLS;
    const cellWidth = (track - gap * (CELLS - 1)) / CELLS;

    return {
      height,
      stroke,
      capWidth,
      capHeight,
      bodyWidth,
      cellY: inset,
      cellHeight: height - inset * 2,
      cellWidth,
      slotWidth: cellWidth + gap,
      // Blocks stack from the left, so the first one drawn is the leftmost.
      firstCellX: inset,
      boltEdge: height * BOLT_EDGE,
      // Centered on the *body*, not the mark. The terminal is not part of the
      // battery's face, and a bolt centered over both sits visibly right of
      // where the cells it describes actually are.
      bolt: boltTransform(bodyWidth, height, height - inset * 2),
    };
  }, [size]);

  const canvasStyle = useMemo(
    () => ({ width: size, height: geometry.height }),
    [size, geometry.height]
  );

  return (
    <Canvas style={canvasStyle}>
      {/* The terminal: a stub on the right, not a lid. Any wider and it stops
          reading as a contact and starts reading as part of the case. */}
      <RoundedRect
        x={size - geometry.capWidth}
        y={(geometry.height - geometry.capHeight) / 2}
        width={geometry.capWidth}
        height={geometry.capHeight}
        r={geometry.capWidth * 0.4}
        color={apothecary.inkMuted}
      />

      {/* The casing. Stroked rather than filled, so the unlit part of the
          battery is the drawer showing through rather than a second gray — one
          less color to read, and empty cells are then simply absent. */}
      <RoundedRect
        x={geometry.stroke / 2}
        y={geometry.stroke / 2}
        width={geometry.bodyWidth - geometry.stroke}
        height={geometry.height - geometry.stroke}
        r={geometry.height * 0.3}
        color={apothecary.inkMuted}
        style="stroke"
        strokeWidth={geometry.stroke}
      />

      {Array.from({ length: charge.filled }, (_, index) => (
        <RoundedRect
          key={index}
          x={geometry.firstCellX + index * geometry.slotWidth}
          y={geometry.cellY}
          width={geometry.cellWidth}
          height={geometry.cellHeight}
          r={geometry.cellWidth * 0.2}
          color={charge.color}
        />
      ))}

      {/*
        The charging bolt, over the cells rather than instead of them.

        Color already says plugged in — `chargeFor` holds the healthy green
        instead of dropping to the warning red — but color alone is the signal
        this project does not rely on anywhere else. The board carries glyphs
        for the same reason: green and red are the two hues a deuteranope is
        least able to separate, and "charging" is exactly the state where a
        player would otherwise read 8% as an emergency.

        Stroked first, then filled. The stroke is the ground color and it is
        what makes the glyph survive the boundary it lies across — gold reads on
        green and gold reads on the drawer's purple, but the edge between them
        runs through the middle of the bolt, and a dark rim separates it from
        both at once. The status bar's own bolt does the same thing.
      */}
      {source === 'plugged' ? (
        <Group transform={geometry.bolt}>
          <Path
            path={BOLT}
            color={apothecary.bg}
            style="stroke"
            strokeWidth={geometry.boltEdge / (geometry.cellHeight * BOLT_HEIGHT)}
            strokeJoin="round"
          />
          <Path path={BOLT} color={apothecary.gold} />
        </Group>
      ) : null}
    </Canvas>
  );
});
