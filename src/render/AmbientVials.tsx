import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  Rect,
  Skia,
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

import { colours, ui } from '@/theme/colors';
import { useUiValue } from './useUiValue';

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

/**
 * The three sorted vials on Home's shelf (spec §4.2).
 *
 * They are full and already sorted, each holding four segments — the mockup
 * shows a finished, pleasing arrangement, not a puzzle mid-solve. Bottom
 * segment first, matching the prototype's rack.
 *
 * Named colours, not palette indices: this is decoration with a fixed look,
 * and indices move whenever `pieces` is reordered for separation. Holding
 * indices here silently repainted the whole rack the last time that happened.
 */
const RACK: ReadonlyArray<readonly string[]> = [
  [colours.aqua, colours.teal, colours.lime, colours.lime],
  [colours.plum, colours.grape, colours.rose, colours.rose],
  [colours.mango, colours.tangerine, colours.coral, colours.coral],
];

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
        const path = Skia.Path.Make();
        path.moveTo(tube.x, tube.y + rt);
        path.quadTo(tube.x, tube.y, tube.x + rt, tube.y);
        path.lineTo(tube.x + w - rt, tube.y);
        path.quadTo(tube.x + w, tube.y, tube.x + w, tube.y + rt);
        path.lineTo(tube.x + w, tube.y + h - rb);
        path.quadTo(tube.x + w, tube.y + h, tube.x + w - rb, tube.y + h);
        path.lineTo(tube.x + rb, tube.y + h);
        path.quadTo(tube.x, tube.y + h, tube.x, tube.y + h - rb);
        path.close();
        return path;
      }),
    [geometry]
  );

  // Same reason as the tube outlines: built once per geometry, not per render.
  const highlights = useMemo(
    () =>
      geometry.tubes.map((tube) =>
        Skia.Path.Make().addRRect(
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
      ),
    [geometry]
  );

  if (width < 40 || height < 40) return null;

  const { vialWidth, segmentHeight } = geometry;

  return (
    <Canvas style={{ width, height }}>
      {geometry.tubes.map((tube, index) => {
        const segments = RACK[index]!;

        return (
          <Group key={index}>
            {/* Empty glass. */}
            <Path path={shapes[index]!} color={colours.white} opacity={0.08} />

            <Group clip={shapes[index]!}>
              {segments.map((fill, segment) => {
                const y = tube.y + geometry.vialHeight - (segment + 1) * segmentHeight;
                const isTop = segment === segments.length - 1;

                return (
                  <Group key={segment}>
                    {/* Spec §3 asks for an outer glow per segment. A blurred
                        copy under the flat fill gives the bloom without
                        shading the fill itself into stripes. */}
                    <Rect
                      x={tube.x}
                      y={y}
                      width={vialWidth}
                      height={segmentHeight + 0.5}
                      color={fill}
                      opacity={0.55}
                    >
                      <BlurMask blur={8} style="normal" />
                    </Rect>

                    <Rect
                      x={tube.x}
                      y={y}
                      width={vialWidth}
                      height={segmentHeight + 0.5}
                      color={fill}
                    />

                    {/* A hairline at each seam. Without it two adjacent
                        segments of one colour read as a single tall band, and
                        the rack loses the "four units per vial" that tells a
                        player what the game is. */}
                    {segment < segments.length - 1 ? (
                      <Rect
                        x={tube.x}
                        y={y}
                        width={vialWidth}
                        height={1}
                        color={ui.shadow}
                        opacity={0.16}
                      />
                    ) : null}

                    {isTop ? (
                      <Meniscus
                        clock={clock}
                        index={index}
                        x={tube.x + vialWidth * 0.06}
                        y={y}
                        width={vialWidth * 0.88}
                      />
                    ) : null}
                  </Group>
                );
              })}
            </Group>

            {/* Glass highlight: one bright stripe down the left shoulder. */}
            <Path path={highlights[index]!} color={colours.white} opacity={0.42} />

            <Path
              path={shapes[index]!}
              style="stroke"
              strokeWidth={3}
              strokeJoin="round"
              color={colours.white}
              opacity={0.32}
            />
          </Group>
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

  const computeWidth = useCallback(
    (input: number) => {
      'worklet';
      const wave = Math.sin((input + phase) * Math.PI * 4);
      return width * (0.94 + wave * 0.06);
    },
    [phase, width]
  );

  const computeX = useCallback(
    (input: number) => {
      'worklet';
      const wave = Math.sin((input + phase) * Math.PI * 4);
      // Keep it centred as it narrows.
      return x + (width - width * (0.94 + wave * 0.06)) / 2;
    },
    [phase, width, x]
  );

  const w = useUiValue(clock, computeWidth, computeWidth(0));
  const cx = useUiValue(clock, computeX, computeX(0));

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
  const computeY = useCallback(
    (input: number) => {
      'worklet';
      const t = (input + bubble.offset) % 1;
      return bubble.baseY - bubble.travel * t;
    },
    [bubble]
  );

  const computeOpacity = useCallback(
    (input: number) => {
      'worklet';
      const t = (input + bubble.offset) % 1;
      // Fade in off the floor, fade out before the surface.
      return Math.sin(t * Math.PI) * 0.4;
    },
    [bubble]
  );

  const cy = useUiValue(clock, computeY, computeY(0));
  const opacity = useUiValue(clock, computeOpacity, computeOpacity(0));

  return (
    <Circle cx={bubble.x} cy={cy} r={bubble.radius} color={colour} opacity={opacity} />
  );
});
