import {
  BlurStyle,
  Canvas,
  Circle,
  ClipOp,
  createPicture,
  Group,
  PaintStyle,
  Picture,
  Rect,
  Skia,
  StrokeJoin,
} from '@shopify/react-native-skia';
import { memo, useCallback, useEffect, useMemo } from 'react';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colours, tint, ui } from '@/theme/colors';
import { useUiValue2 } from './useUiValue';

interface AmbientVialsProps {
  width: number;
  height: number;
  /** Stand the vials on the bottom edge instead of centring them. */
  standing?: boolean;
}

/** One full cycle. Slow on purpose — this is wallpaper, not a game. */
const CYCLE_MS = 5200;

const VIALS = 3;
const CAPACITY = 4;

/** Radius of the outer glow under each segment, spec §3. */
const GLOW_BLUR = 8;

/**
 * How far each segment is lightened from its vial's base colour, bottom to
 * top. Deepest at the base, palest at the lip — the way a lamp above a real
 * vial catches it.
 *
 * The steps widen going up rather than dividing the range evenly. Equal steps
 * in sRGB do not read as equal steps: the light end of a ramp compresses, and
 * four even stops leave the top pair looking like one band, which is the exact
 * problem this arrangement exists to avoid.
 */
const SHADES = [0, 0.2, 0.44, 0.72] as const;

/**
 * The three vials on Home's shelf (spec §4.2).
 *
 * Full, four segments each, bottom segment first — the mockup shows a pleasing
 * arrangement rather than a puzzle mid-solve.
 *
 * One hue per vial, four shades of it. The earlier arrangement gave every
 * segment its own colour, which forced the twelve-colour palette's two dark
 * entries (`fern`, `olive`) onto the shelf; against the bright ten they read
 * as mud. A single-hue ramp gets its separation from lightness instead, so
 * nothing has to be dark to be distinct.
 *
 * The three bases are far apart on the wheel — cyan, pink, orange — so the
 * rack still reads as three different things at a glance.
 *
 * A base has to sit mid-lightness for this to work. `lime` was tried and does
 * not: it is the palette's lightest liquid, above L* 84, so it is already most
 * of the way to white and the ramp runs out of room by the third step. What
 * should be four shades reads as one pale wash.
 *
 * Worth knowing if this is ever revisited: shades are the one arrangement the
 * game itself would never generate, since the board needs colours a player can
 * tell apart at speed. Fine for decoration that never has to be sorted, wrong
 * the moment this rack is reused to preview real play.
 *
 * Named colours, not palette indices: this is decoration with a fixed look,
 * and indices move whenever `pieces` is reordered for separation. Holding
 * indices here silently repainted the whole rack the last time that happened.
 */
const RACK: ReadonlyArray<readonly string[]> = (['aqua', 'rose', 'mango'] as const).map(
  (base) => SHADES.map((amount) => tint(base, amount))
);

/**
 * A decorative rack of vials for Home.
 *
 * Motion is deliberately small: bubbles drifting up, and a meniscus that
 * wobbles. An animated fill level was tried and read as a puzzle solving
 * itself, which competes with the Play button for attention.
 *
 * Cost: one shared value drives everything on the UI thread. React renders
 * this once and never again, and the loop is cancelled on unmount, so leaving
 * Home stops all of it.
 */
export const AmbientVials = memo(function AmbientVials({
  width,
  height,
  standing = false,
}: AmbientVialsProps) {
  const clock = useSharedValue(0);

  useEffect(() => {
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(clock);
  }, [clock]);

  const geometry = useMemo(() => {
    const gap = width * 0.11;
    const vialWidth = Math.min((width - gap * (VIALS - 1)) / VIALS, height * 0.3);
    // The prototype's rack is 42×120 — 2.85 tall per unit of width. The box
    // is sized for that, so height wins and width follows.
    const vialHeight = Math.min(height, vialWidth * 2.85);
    const startX = (width - (vialWidth * VIALS + gap * (VIALS - 1))) / 2;
    const top = standing ? height - vialHeight : (height - vialHeight) / 2;

    return {
      vialWidth,
      vialHeight,
      segmentHeight: vialHeight / CAPACITY,
      // Square shoulders, deeply rounded base — spec §3's `12 12 26 26`.
      topRadius: vialWidth * 0.22,
      bottomRadius: vialWidth * 0.45,
      tubes: Array.from({ length: VIALS }, (_, index) => ({
        x: startX + index * (vialWidth + gap),
        y: top,
      })),
    };
  }, [width, height, standing]);

  const shapes = useMemo(
    () =>
      geometry.tubes.map((tube) => {
        const { vialWidth: w, vialHeight: h, topRadius, bottomRadius } = geometry;
        const rt = Math.min(topRadius, w / 2);
        const rb = Math.min(bottomRadius, w / 2);
        // `Skia.PathBuilder`, not the deprecated mutating `SkPath` methods.
        // `detach()` returns an immutable path, which is what gets memoised.
        return Skia.PathBuilder.Make()
          .moveTo(tube.x, tube.y + rt)
          .quadTo(tube.x, tube.y, tube.x + rt, tube.y)
          .lineTo(tube.x + w - rt, tube.y)
          .quadTo(tube.x + w, tube.y, tube.x + w, tube.y + rt)
          .lineTo(tube.x + w, tube.y + h - rb)
          .quadTo(tube.x + w, tube.y + h, tube.x + w - rb, tube.y + h)
          .lineTo(tube.x + rb, tube.y + h)
          .quadTo(tube.x, tube.y + h, tube.x, tube.y + h - rb)
          .close()
          .detach();
      }),
    [geometry]
  );

  // Same reason as the tube outlines: built once per geometry, not per render.
  const highlights = useMemo(
    () =>
      geometry.tubes.map((tube) =>
        Skia.PathBuilder.Make()
          .addRRect(
            Skia.RRectXY(
              Skia.XYWHRect(
                tube.x + geometry.vialWidth * 0.17,
                tube.y + geometry.segmentHeight * 0.3,
                geometry.vialWidth * 0.1,
                geometry.vialHeight * 0.48
              ),
              geometry.vialWidth * 0.08,
              geometry.vialWidth * 0.08
            )
          )
          .detach()
      ),
    [geometry]
  );

  /**
   * The whole static layer — glass, segments, glows, seams, highlights and
   * strokes — recorded once.
   *
   * It was fourteen draw calls per vial in JSX, twelve of them carrying a
   * `BlurMask`. Skia redraws every node on a canvas whenever any value on it
   * changes, so the bubbles alone were re-rasterising twelve gaussian blurs
   * sixty times a second to produce a pixel-identical result. `RACK` is a
   * constant and the geometry is memoised — none of it can move.
   *
   * A picture replays as one op. The blurs are paid when the geometry changes
   * rather than every frame forever.
   */
  const still = useMemo(() => {
    const { vialWidth: w, vialHeight: h, segmentHeight: sh } = geometry;

    return createPicture(
      (canvas) => {
        const glass = Skia.Paint();
        glass.setAntiAlias(true);
        glass.setColor(Skia.Color(colours.white));
        glass.setAlphaf(0.08);

        const highlight = Skia.Paint();
        highlight.setAntiAlias(true);
        highlight.setColor(Skia.Color(colours.white));
        highlight.setAlphaf(0.42);

        const edge = Skia.Paint();
        edge.setAntiAlias(true);
        edge.setColor(Skia.Color(colours.white));
        edge.setAlphaf(0.32);
        edge.setStyle(PaintStyle.Stroke);
        edge.setStrokeWidth(3);
        edge.setStrokeJoin(StrokeJoin.Round);

        const seam = Skia.Paint();
        seam.setColor(Skia.Color(ui.shadow));
        seam.setAlphaf(0.16);

        // One filter for every glow. Twelve identical mask filters would be
        // twelve allocations carrying one value.
        const bloom = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, GLOW_BLUR, false);

        geometry.tubes.forEach((tube, index) => {
          const shape = shapes[index]!;
          const segments = RACK[index]!;

          // Empty glass.
          canvas.drawPath(shape, glass);

          canvas.save();
          canvas.clipPath(shape, ClipOp.Intersect, true);

          segments.forEach((fill, segment) => {
            const y = tube.y + h - (segment + 1) * sh;
            const colour = Skia.Color(fill);
            const band = Skia.XYWHRect(tube.x, y, w, sh + 0.5);

            // Spec §3 asks for an outer glow per segment. A blurred copy under
            // the flat fill gives the bloom without shading the fill itself
            // into stripes.
            const glow = Skia.Paint();
            glow.setAntiAlias(true);
            glow.setColor(colour);
            glow.setAlphaf(0.55);
            glow.setMaskFilter(bloom);
            canvas.drawRect(band, glow);

            const flat = Skia.Paint();
            flat.setAntiAlias(true);
            flat.setColor(colour);
            canvas.drawRect(band, flat);

            // A hairline at each seam. Without it two adjacent segments of one
            // colour read as a single tall band, and the rack loses the "four
            // units per vial" that tells a player what the game is.
            if (segment < segments.length - 1) {
              canvas.drawRect(Skia.XYWHRect(tube.x, y, w, 1), seam);
            }
          });

          canvas.restore();

          // Glass highlight: one bright stripe down the left shoulder.
          canvas.drawPath(highlights[index]!, highlight);
          canvas.drawPath(shape, edge);
        });
      },
      { width, height }
    );
  }, [geometry, shapes, highlights, width, height]);

  if (width < 40 || height < 40) return null;

  const { vialWidth, segmentHeight, vialHeight } = geometry;

  return (
    <Canvas style={{ width, height }}>
      <Picture picture={still} />

      {/* Only what actually moves stays a live node. */}
      {geometry.tubes.map((tube, index) => {
        const segments = RACK[index]!;
        const topY = tube.y + vialHeight - segments.length * segmentHeight;

        return (
          <Meniscus
            key={index}
            clock={clock}
            index={index}
            x={tube.x + vialWidth * 0.06}
            y={topY}
            width={vialWidth * 0.88}
          />
        );
      })}

      <Bubbles clock={clock} geometry={geometry} />
    </Canvas>
  );
});

/**
 * The bright lip on the top segment, wobbling (spec §6, ~2.6s loop).
 *
 * Width is animated rather than the shape: an `SkPath` written into a shared
 * value does not survive on this Skia version, so animated geometry has to be
 * numeric props.
 */
const Meniscus = memo(function Meniscus({
  clock,
  index,
  x,
  y,
  width,
}: {
  clock: SharedValue<number>;
  index: number;
  x: number;
  y: number;
  width: number;
}) {
  const phase = index * 0.31;

  // One reaction, not two. The x depends on the width — computing them apart
  // meant the same sine twice per frame as well as a second subscription.
  const compute = useCallback(
    (input: number): [number, number] => {
      'worklet';
      const wave = Math.sin((input + phase) * Math.PI * 4);
      const w = width * (0.94 + wave * 0.06);
      // Keep it centred as it narrows.
      return [w, x + (width - w) / 2];
    },
    [phase, width, x]
  );

  const [w, cx] = useUiValue2(clock, compute, compute(0));

  return (
    <Rect x={cx} y={y - 1} width={w} height={3.5} color={colours.white} opacity={0.5} />
  );
});

/** Slow rising bubbles. Cheap, and they sell the liquid as liquid. */
const Bubbles = memo(function Bubbles({
  clock,
  geometry,
}: {
  clock: SharedValue<number>;
  geometry: {
    vialWidth: number;
    vialHeight: number;
    tubes: { x: number; y: number }[];
  };
}) {
  const bubbles = useMemo(
    () =>
      geometry.tubes.flatMap((tube, index) =>
        [0, 1, 2].map((n) => ({
          key: `${index}-${n}`,
          x: tube.x + geometry.vialWidth * (0.3 + n * 0.2),
          baseY: tube.y + geometry.vialHeight,
          travel: geometry.vialHeight * 0.75,
          radius: geometry.vialWidth * (0.05 + n * 0.015),
          offset: index * 0.3 + n * 0.27,
        }))
      ),
    [geometry]
  );

  return (
    <Group>
      {bubbles.map((bubble) => (
        <Bubble key={bubble.key} clock={clock} bubble={bubble} colour={colours.white} />
      ))}
    </Group>
  );
});

const Bubble = memo(function Bubble({
  clock,
  bubble,
  colour,
}: {
  clock: SharedValue<number>;
  bubble: {
    x: number;
    baseY: number;
    travel: number;
    radius: number;
    offset: number;
  };
  colour: string;
}) {
  // Both values come off the same phase, so they share a reaction. Nine
  // bubbles at two subscriptions each was eighteen per frame for nine dots.
  const compute = useCallback(
    (input: number): [number, number] => {
      'worklet';
      const t = (input + bubble.offset) % 1;
      return [
        bubble.baseY - bubble.travel * t,
        // Fade in off the floor, fade out before the surface.
        Math.sin(t * Math.PI) * 0.4,
      ];
    },
    [bubble]
  );

  const [cy, opacity] = useUiValue2(clock, compute, compute(0));

  return (
    <Circle cx={bubble.x} cy={cy} r={bubble.radius} color={colour} opacity={opacity} />
  );
});
