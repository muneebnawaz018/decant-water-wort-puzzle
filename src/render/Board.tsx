import {
  Blur,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Paint,
  Path,
  Rect,
  Shader,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { memo, useCallback, useMemo } from 'react';
import { type SharedValue } from 'react-native-reanimated';

import type { Colour, WaterState } from '@/core/types';
import { apothecary, type Theme } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { ColourMark } from './ColourMark';
import type { BoardLayout, TubeRect } from './layout';
import {
  extension,
  GOO_MATRIX,
  GRAVITY,
  PHASE,
  phaseProgress,
  pourGeometry,
  lipDrips,
  splashParticles,
  type Drip,
  type Particle,
  type PourGeometry,
} from './pour';
import { rgba } from './liquid';
import { liquidEffect } from './liquidEffect';
import { useUiValue } from './useUiValue';

/** How far a selected tube lifts, doc §7. */
const SELECTION_LIFT = 8;

export interface PourAnimation {
  from: number;
  to: number;
  count: number;
  colour: Colour;
  /** Segments in the destination before this pour landed. */
  destFilled: number;
}

interface BoardProps {
  state: WaterState;
  layout: BoardLayout;
  width: number;
  height: number;
  selected: number | null;
  /** Set while a pour is playing. The board renders mid-pour when present. */
  animation?: PourAnimation | null;
  /** 0 to 1 across the pour. Lives on the UI thread. */
  progress?: SharedValue<number>;
  /** Draw a glyph on each segment, doc §9. */
  marks?: boolean;
  theme?: Theme;
}

/**
 * A vial outline: square shoulders at the open mouth, rounded base. A tube
 * rounded on all four corners reads as a pill, not glassware.
 */
function tubePath(tube: TubeRect, radius: number): SkPath {
  const { x, y, width, height } = tube;
  const r = Math.min(radius, width / 2, height / 2);
  const path = Skia.Path.Make();

  path.moveTo(x, y);
  path.lineTo(x + width, y);
  path.lineTo(x + width, y + height - r);
  path.quadTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadTo(x, y + height, x, y + height - r);
  path.close();

  return path;
}

export const Board = memo(function Board({
  state,
  layout,
  width,
  height,
  selected,
  animation = null,
  progress,
  marks = false,
  theme = apothecary,
}: BoardProps) {
  const paths = useMemo(
    () => layout.tubes.map((tube) => tubePath(tube, layout.radius)),
    [layout]
  );

  // Built once per layout, not once per render. These were being allocated
  // inline in the tube loop, so every re-render churned one native SkPath per
  // tube — up to a dozen on a hard board, on every move.
  const highlights = useMemo(
    () =>
      layout.tubes.map((tube) =>
        Skia.Path.Make().addRRect(
          Skia.RRectXY(
            Skia.XYWHRect(
              tube.x + tube.width * 0.16,
              tube.y + layout.segmentHeight * 0.45,
              tube.width * 0.07,
              tube.height - layout.segmentHeight
            ),
            tube.width * 0.035,
            tube.width * 0.035
          )
        )
      ),
    [layout]
  );

  const geometry = useMemo(
    () =>
      animation
        ? pourGeometry(layout, animation.from, animation.to, animation.destFilled)
        : null,
    [layout, animation]
  );

  const live = animation && progress && geometry ? { animation, progress, geometry } : null;

  return (
    <Canvas style={{ width, height }}>
      {layout.tubes.map((tube, tubeIndex) => {
        const isSelected = tubeIndex === selected;
        const path = paths[tubeIndex]!;

        // Mid-pour the destination is drawn short: the arriving liquid is
        // animated in instead, so the level rises as the stream lands.
        const full = state.tubes[tubeIndex] ?? [];
        const segments =
          live && tubeIndex === live.animation.to
            ? full.slice(0, Math.max(0, full.length - live.animation.count))
            : full;

        const body = (
          <>
            {/* Empty glass. Liquid is clipped to this same shape. */}
            <Path path={path} color={colours.white} opacity={0.08} />

            <Group clip={path}>
              {segments.map((colour, segmentIndex) => {
                const fill = theme.pieces[colour % theme.pieces.length]!;
                const y = tube.y + tube.height - (segmentIndex + 1) * layout.segmentHeight;

                // Flat fill, no gradient: a gradient makes one colour read as
                // several shades, which is exactly what breaks a cartoon look
                // and makes matching segments hard to compare at a glance.
                const isTop = segmentIndex === segments.length - 1;

                return (
                  <Group key={segmentIndex}>
                    <Rect
                      x={tube.x}
                      y={y}
                      width={tube.width}
                      height={layout.segmentHeight + 0.5}
                      color={fill}
                    />

                    {/* Seam between stacked segments, so a run of one colour
                        still reads as N units rather than one tall block. */}
                    {segmentIndex < segments.length - 1 ? (
                      <Rect
                        x={tube.x}
                        y={y}
                        width={tube.width}
                        height={1}
                        color={ui.shadow}
                        opacity={0.16}
                      />
                    ) : null}

                    {/* Meniscus: liquid climbs the glass, so the top segment
                        gets a bright lip. Only the top one — a highlight on
                        every segment is the banding that made one colour read
                        as three. */}
                    {isTop ? (
                      <Rect
                        x={tube.x + tube.width * 0.06}
                        y={y - 1}
                        width={tube.width * 0.88}
                        height={3}
                        color={colours.white}
                        opacity={0.42}
                      />
                    ) : null}

                    {marks ? (
                      <ColourMark
                        symbol={theme.symbols[colour % theme.symbols.length]!}
                        fill={fill}
                        cx={tube.x + tube.width / 2}
                        cy={y + layout.segmentHeight / 2}
                        size={Math.min(tube.width, layout.segmentHeight) * 0.42}
                      />
                    ) : null}
                  </Group>
                );
              })}

              {live && tubeIndex === live.animation.from ? (
                <Reservoir
                  tube={tube}
                  layout={layout}
                  animation={live.animation}
                  progress={live.progress}
                  remaining={segments.length}
                  theme={theme}
                />
              ) : null}

              {live && tubeIndex === live.animation.to ? (
                <RisingLevel
                  tube={tube}
                  layout={layout}
                  animation={live.animation}
                  progress={live.progress}
                  theme={theme}
                />
              ) : null}
            </Group>

            {/* Specular highlight down the left edge. */}
            <Path path={highlights[tubeIndex]!} color={colours.white} opacity={0.5} />

            {/* A bold, dark outline is what reads as drawn rather than
                rendered. Thin grey hairlines look like a chart. */}
            <Path
              path={path}
              style="stroke"
              strokeWidth={isSelected ? 5 : 3.5}
              strokeJoin="round"
              color={isSelected ? theme.accent : colours.white}
              opacity={isSelected ? 1 : 0.32}
            />
          </>
        );

        // The pouring tube leaves the rack entirely: it flies to the
        // destination and tips over its lip, so it is drawn last and moved.
        if (live && tubeIndex === live.animation.from) {
          return (
            <FlyingTube key={tubeIndex} geometry={live.geometry} progress={live.progress}>
              {body}
            </FlyingTube>
          );
        }

        return (
          <Group
            key={tubeIndex}
            transform={[{ translateY: isSelected ? -SELECTION_LIFT : 0 }]}
          >
            {body}
          </Group>
        );
      })}

      {live ? (
        <PourFx
          layout={layout}
          animation={live.animation}
          geometry={live.geometry}
          progress={live.progress}
          destPath={paths[live.animation.to]!}
          theme={theme}
        />
      ) : null}
    </Canvas>
  );
});

/**
 * Carries the pouring tube out of the rack and tips it over its lip. Rotation
 * happens about the pouring corner, so that corner — and therefore the stream
 * leaving it — stays put once the tube has arrived.
 */
const FlyingTube = memo(function FlyingTube({
  geometry,
  progress,
  children,
}: {
  geometry: PourGeometry;
  progress: SharedValue<number>;
  children: React.ReactNode;
}) {
  const compute = useCallback(
    (input: number) => {
      'worklet';
      const out = extension(input);
      return [
        { translateX: (geometry.target.x - geometry.pivot.x) * out },
        { translateY: (geometry.target.y - geometry.pivot.y) * out },
        { rotate: geometry.tilt * out },
      ];
    },
    [geometry]
  );

  const transform = useUiValue(progress, compute, compute(0));

  return (
    <Group transform={transform} origin={vec(geometry.pivot.x, geometry.pivot.y)}>
      {children}
    </Group>
  );
});

/**
 * What is still waiting to leave the pouring tube. It drains as the stream
 * flows, so the tube visibly empties rather than teleporting its contents.
 */
const Reservoir = memo(function Reservoir({
  tube,
  layout,
  animation,
  progress,
  remaining,
  theme,
}: {
  tube: TubeRect;
  layout: BoardLayout;
  animation: PourAnimation;
  progress: SharedValue<number>;
  remaining: number;
  theme: Theme;
}) {
  const fill = theme.pieces[animation.colour % theme.pieces.length]!;
  const total = animation.count * layout.segmentHeight;
  const base = tube.y + tube.height - remaining * layout.segmentHeight;

  const computeY = useCallback(
    (input: number) => {
      'worklet';
      const poured = phaseProgress(input, PHASE.pourStart, PHASE.fillEnd);
      return base - total * (1 - poured);
    },
    [base, total]
  );

  const computeHeight = useCallback(
    (input: number) => {
      'worklet';
      const poured = phaseProgress(input, PHASE.pourStart, PHASE.fillEnd);
      return Math.max(0, total * (1 - poured));
    },
    [total]
  );

  const y = useUiValue(progress, computeY, computeY(0));
  const height = useUiValue(progress, computeHeight, computeHeight(0));

  return <Rect x={tube.x} y={y} width={tube.width} height={height} color={fill} />;
});

/**
 * The arriving liquid, growing upward from the existing surface with a
 * decaying wave across its top. A flat edge is what reads as a rectangle
 * sliding up a tube rather than liquid settling.
 */
const RisingLevel = memo(function RisingLevel({
  tube,
  layout,
  animation,
  progress,
  theme,
}: {
  tube: TubeRect;
  layout: BoardLayout;
  animation: PourAnimation;
  progress: SharedValue<number>;
  theme: Theme;
}) {
  const fill = theme.pieces[animation.colour % theme.pieces.length]!;
  const target = animation.count * layout.segmentHeight;
  const surface = tube.y + tube.height - animation.destFilled * layout.segmentHeight;

  // Drawn region covers the whole arriving column plus headroom for the wave;
  // the shader decides which pixels inside it are liquid.
  const headroom = layout.segmentHeight * 0.5;
  const regionY = surface - target - headroom;
  const regionHeight = target + headroom;

  const colour = useMemo(() => rgba(fill), [fill]);

  const uniforms = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        const t = phaseProgress(input, PHASE.fillStart, PHASE.fillEnd);

        // The surface keeps moving after the pour stops, and the wave decays
        // as it settles — liquid does not arrive and freeze.
        const settle = phaseProgress(input, PHASE.fillStart, 1);
        const decay = (1 - settle) * (1 - settle);

        return {
          origin: [tube.x, regionY],
          size: [tube.width, regionHeight],
          surface: surface - target * t,
          amp: layout.segmentHeight * 0.22 * decay,
          phase: input * 26,
          fill: colour,
        };
      },
      [tube, layout, surface, target, regionY, regionHeight, colour]
    ),
    {
      origin: [tube.x, regionY],
      size: [tube.width, regionHeight],
      surface,
      amp: 0,
      phase: 0,
      fill: colour,
    }
  );

  if (!liquidEffect) {
    // Shader failed to compile: fall back to a flat fill rather than a blank
    // board. Should never happen, but a blank tube would be unplayable.
    return null;
  }

  return (
    <Rect x={tube.x} y={regionY} width={tube.width} height={regionHeight}>
      <Shader source={liquidEffect} uniforms={uniforms} />
    </Rect>
  );
});

/**
 * The falling stream and the droplets it throws off, drawn into a single
 * blurred, alpha-thresholded layer — the metaball trick. Overlapping shapes
 * fuse into one surface with real tension instead of reading as separate
 * circles, and the whole spray costs one path and one draw call.
 */
const PourFx = memo(function PourFx({
  layout,
  animation,
  geometry,
  progress,
  destPath,
  theme,
}: {
  layout: BoardLayout;
  animation: PourAnimation;
  geometry: PourGeometry;
  progress: SharedValue<number>;
  destPath: SkPath;
  theme: Theme;
}) {
  const fill = theme.pieces[animation.colour % theme.pieces.length]!;
  const particles = useMemo(() => splashParticles(), []);
  const drips = useMemo(() => lipDrips(), []);
  const reach = layout.segmentHeight * 1.4;
  const rise = animation.count * layout.segmentHeight;

  // Where the stream currently ends: the surface climbs toward the lip as the
  // destination fills, so the falling column shortens as it pours.
  const impactY = useCallback(
    (input: number) => {
      'worklet';
      const filled = phaseProgress(input, PHASE.fillStart, PHASE.fillEnd);
      return geometry.surfaceY - rise * filled;
    },
    [geometry, rise]
  );

  const computeTop = useCallback(
    (_input: number) => {
      'worklet';
      return geometry.target.y;
    },
    [geometry]
  );

  const computeHeight = useCallback(
    (input: number) => {
      'worklet';
      const flow = phaseProgress(input, PHASE.pourStart, PHASE.pourEnd);
      if (flow <= 0 || flow >= 1) return 0;
      // The head of the stream accelerates down to the surface, then the whole
      // column stays connected until the pour ends.
      const bottom = impactY(input);
      // The head takes a beat to reach the surface rather than snapping down.
      const reachDown = (bottom - geometry.target.y) * Math.min(1, flow * 5);
      return Math.max(0, reachDown);
    },
    [geometry, impactY]
  );

  const computeWidth = useCallback(
    (input: number) => {
      'worklet';
      const flow = phaseProgress(input, PHASE.pourStart, PHASE.pourEnd);
      if (flow <= 0 || flow >= 1) return 0;
      // Necks in as it starts and pinches out at the end of the pour.
      const taper = Math.sin(Math.min(1, flow * 1.6) * Math.PI * 0.5);
      const closing = 1 - Math.pow(Math.max(0, flow - 0.7) / 0.3, 2);
      return geometry.width * taper * Math.max(0.2, closing);
    },
    [geometry]
  );

  const streamY = useUiValue(progress, computeTop, computeTop(0));
  const streamHeight = useUiValue(progress, computeHeight, computeHeight(0));
  const streamWidth = useUiValue(progress, computeWidth, computeWidth(0));
  const streamX = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        const w = computeWidth(input);
        return geometry.streamX - w / 2;
      },
      [geometry, computeWidth]
    ),
    geometry.streamX
  );

  return (
    <Group
      layer={
        <Paint>
          <Blur blur={layout.segmentHeight * 0.09} />
          <ColorMatrix matrix={GOO_MATRIX} />
        </Paint>
      }
    >
      <Rect
        x={streamX}
        y={streamY}
        width={streamWidth}
        height={streamHeight}
        color={fill}
      />

      {/* Splash stays inside the glass. Liquid thrown clear of the tube reads
          as debris, not as a splash. */}
      <Group clip={destPath}>
        {particles.map((particle, index) => (
          <SplashDrop
            key={index}
            particle={particle}
            geometry={geometry}
            impactY={impactY}
            segmentHeight={layout.segmentHeight}
            reach={reach}
            colour={fill}
            progress={progress}
          />
        ))}
      </Group>

      {drips.map((drip, index) => (
        <LipDrip
          key={`drip-${index}`}
          drip={drip}
          geometry={geometry}
          impactY={impactY}
          segmentHeight={layout.segmentHeight}
          colour={fill}
          progress={progress}
        />
      ))}
    </Group>
  );
});

/**
 * One thrown droplet, integrated under gravity. Numeric props only: Skia
 * tracks animated numbers, and a per-frame path would not survive the trip
 * into a shared value.
 */
const SplashDrop = memo(function SplashDrop({
  particle,
  geometry,
  impactY,
  segmentHeight,
  reach,
  colour,
  progress,
}: {
  particle: Particle;
  geometry: PourGeometry;
  impactY: (input: number) => number;
  segmentHeight: number;
  reach: number;
  colour: string;
  progress: SharedValue<number>;
}) {
  const local = useCallback(
    (input: number) => {
      'worklet';
      const window = phaseProgress(input, PHASE.splashStart, PHASE.splashEnd);
      return (window - particle.delay) / particle.life;
    },
    [particle]
  );

  const cx = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        const t = local(input);
        return geometry.streamX + particle.vx * reach * Math.max(0, t);
      },
      [geometry, particle, reach, local]
    ),
    geometry.streamX
  );

  const cy = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        const t = Math.max(0, local(input));
        return impactY(input) + (particle.vy * t + 0.5 * GRAVITY * t * t) * reach;
      },
      [impactY, particle, reach, local]
    ),
    geometry.surfaceY
  );

  const r = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        const t = local(input);
        if (t <= 0 || t >= 1) return 0;
        // Droplets shed mass in flight and vanish rather than blink out.
        return segmentHeight * particle.radius * (1 - t * 0.5);
      },
      [particle, segmentHeight, local]
    ),
    0
  );

  return <Circle cx={cx} cy={cy} r={r} color={colour} />;
});

/**
 * A drop that beads up on the lip after the stream stops, hangs, then falls.
 * Liquid never cuts off cleanly, and the tail of drips is most of what sells
 * a pour as liquid rather than as a shape that stopped being drawn.
 */
const LipDrip = memo(function LipDrip({
  drip,
  geometry,
  impactY,
  segmentHeight,
  colour,
  progress,
}: {
  drip: Drip;
  geometry: PourGeometry;
  impactY: (input: number) => number;
  segmentHeight: number;
  colour: string;
  progress: SharedValue<number>;
}) {
  const local = useCallback(
    (input: number) => {
      'worklet';
      const window = phaseProgress(input, PHASE.dripStart, PHASE.dripEnd);
      return (window - drip.delay) / (1 - drip.delay);
    },
    [drip]
  );

  const cy = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        const t = local(input);
        if (t <= 0) return geometry.target.y;
        // Hangs while it swells, then accelerates away.
        const fall = t * t;
        return geometry.target.y + (impactY(input) - geometry.target.y) * fall;
      },
      [geometry, impactY, local]
    ),
    geometry.target.y
  );

  const cx = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        return geometry.streamX + drip.drift * segmentHeight * Math.max(0, local(input));
      },
      [geometry, drip, segmentHeight, local]
    ),
    geometry.streamX
  );

  const r = useUiValue(
    progress,
    useCallback(
      (input: number) => {
        'worklet';
        const t = local(input);
        if (t <= 0 || t >= 1) return 0;
        // Swells on the lip, then stretches thin as it falls.
        const swell = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) * 0.5;
        return segmentHeight * drip.radius * swell;
      },
      [drip, segmentHeight, local]
    ),
    0
  );

  return <Circle cx={cx} cy={cy} r={r} color={colour} />;
});
