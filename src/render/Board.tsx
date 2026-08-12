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
import {
  HIGHLIGHT_WIDTH,
  vesselCap,
  vesselHighlight,
  vesselOutline,
  vesselPath,
} from './vessel';
import { DEFAULT_SKIN, skinFor } from '@/theme/skins';

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
  /**
   * The tube a hint is pointing *into*, if one is showing.
   *
   * Separate from `selected`, which carries the source — a hint arms the source
   * exactly as a tap would, so the only thing left to draw is where it goes.
   * Without this the player is shown a lifted tube and left to work out the
   * destination themselves, which is most of the question they asked.
   */
  hintTo?: number | null;
  /** Set while a pour is playing. The board renders mid-pour when present. */
  animation?: PourAnimation | null;
  /** 0 to 1 across the pour. Lives on the UI thread. */
  progress?: SharedValue<number>;
  /** Draw a glyph on each segment, doc §9. */
  marks?: boolean;
  theme?: Theme;
  /**
   * Which vessel the liquid is held in — the one thing the shop sells.
   *
   * Defaulted rather than required so every other caller of `Board` (and the
   * tests) keeps the glass the game shipped with. Purely a silhouette: capacity,
   * colours, generation and par are all untouched by it, which is what lets it
   * be sold at all under spec §4.7.
   */
  skin?: string;
}

export const Board = memo(function Board({
  state,
  layout,
  width,
  height,
  selected,
  hintTo = null,
  animation = null,
  progress,
  marks = false,
  theme = apothecary,
  skin = DEFAULT_SKIN,
}: BoardProps) {
  const vessel = skinFor(skin).vessel;

  // Built once per layout and skin, not once per render. These were being
  // allocated inline in the tube loop, so every re-render churned one native
  // SkPath per tube — up to a dozen on a hard board, on every move.
  const paths = useMemo(
    () => layout.tubes.map((tube) => vesselPath(tube, vessel)),
    [layout, vessel]
  );

  // The stroked glass is the same contour left open at the mouth. Stroking the
  // clip path drew a line across every opening, and a tube with a lidded top
  // reads as sealed shut — the cap below is what closed glass looks like, and
  // only a finished tube earns one.
  const outlines = useMemo(
    () => layout.tubes.map((tube) => vesselOutline(tube, vessel)),
    [layout, vessel]
  );

  const caps = useMemo(
    () => layout.tubes.map((tube) => vesselCap(tube, vessel)),
    [layout, vessel]
  );

  const highlights = useMemo(
    () => layout.tubes.map((tube) => vesselHighlight(tube, vessel)),
    [layout, vessel]
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
        const isHintTarget = tubeIndex === hintTo;
        const path = paths[tubeIndex]!;

        // Mid-pour the destination is drawn short: the arriving liquid is
        // animated in instead, so the level rises as the stream lands.
        const full = state.tubes[tubeIndex] ?? [];
        const segments =
          live && tubeIndex === live.animation.to
            ? full.slice(0, Math.max(0, full.length - live.animation.count))
            : full;

        // A finished tube gets its stopper. `state` already holds the post-pour
        // board, so the check waits out the animation on the receiving tube —
        // the cap lands the moment the liquid does, not while it is arriving.
        const sealed =
          full.length === state.capacity &&
          full.every((colour) => colour === full[0]) &&
          !(live && tubeIndex === live.animation.to);

        // The air gap above a full tube lives in `layout.segmentHeight` (see
        // `FILL_HEADROOM`), so it is the same on every tube whatever its
        // state. It was briefly derived from `sealed` here instead, which
        // re-laid-out the whole column the frame the cap arrived.
        const segmentHeight = layout.segmentHeight;

        const body = (
          <>
            {/* Empty glass. Liquid is clipped to this same shape. */}
            <Path path={path} color={colours.white} opacity={0.08} />

            <Group clip={path}>
              {segments.map((colour, segmentIndex) => {
                const fill = theme.pieces[colour % theme.pieces.length]!;
                const y = tube.y + tube.height - (segmentIndex + 1) * segmentHeight;

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
                      height={segmentHeight + 0.5}
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
                        cy={y + segmentHeight / 2}
                        size={Math.min(tube.width, segmentHeight) * 0.42}
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

            {/* Specular highlight down the left edge — a centreline stroked
                to width, so it follows the wall on a curved vessel. */}
            <Path
              path={highlights[tubeIndex]!}
              style="stroke"
              strokeWidth={tube.width * HIGHLIGHT_WIDTH}
              strokeCap="round"
              strokeJoin="round"
              color={colours.white}
              opacity={0.5}
            />

            {/*
              A bold, dark outline is what reads as drawn rather than
              rendered. Thin grey hairlines look like a chart.

              Three states, and the hint's is gold rather than a second accent.
              A selection and a hint destination can be on screen together — a
              hint arms the source and marks the target — so they have to be
              told apart at a glance, and reusing the selection colour for both
              would say "these two tubes are the same kind of thing" when one is
              held and the other is a suggestion. Gold is the chrome colour
              everywhere else in the app, which is the right register for a
              prompt.
            */}
            <Path
              path={outlines[tubeIndex]!}
              style="stroke"
              strokeWidth={isSelected || isHintTarget ? 5 : 3.5}
              strokeJoin="round"
              strokeCap="round"
              color={isSelected ? theme.accent : isHintTarget ? theme.gold : colours.white}
              opacity={isSelected || isHintTarget ? 1 : 0.32}
            />

            {/* The stopper. Gold, like everything the game hands out as a
                reward — and drawn after the stroke so it sits on the rim. */}
            {sealed ? (
              <>
                {/* Painted in the liquid it seals, so the finished colour
                    stays readable with the meniscus hidden under it. The dark
                    stroke is what separates cap from liquid where the two
                    meet at the rim in the same colour. */}
                <Path
                  path={caps[tubeIndex]!}
                  color={theme.pieces[full[0]! % theme.pieces.length]!}
                />
                <Path
                  path={caps[tubeIndex]!}
                  style="stroke"
                  strokeWidth={2.5}
                  strokeJoin="round"
                  color={ui.shadow}
                  opacity={0.55}
                />
              </>
            ) : null}
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

      {/* Glyphs travel with the liquid, so they are drawn over the rack
          rather than inside the destination's clip — for most of the flight
          they are above its mouth, and a clip would swallow them. */}
      {marks && live
        ? Array.from({ length: live.animation.count }, (_, arrival) => (
            <TravellingMark
              key={`mark-${arrival}`}
              tube={layout.tubes[live.animation.to]!}
              layout={layout}
              animation={live.animation}
              geometry={live.geometry}
              progress={live.progress}
              arrival={arrival}
              theme={theme}
            />
          ))
        : null}
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
 * How much of the pour a glyph spends in the air, as a fraction of the whole
 * animation. It leaves the source's lip this far ahead of the moment its own
 * segment finishes filling, so mark and liquid land together.
 */
const MARK_FLIGHT = 0.3;

/**
 * One colourblind glyph carried from the pouring tube into the receiving one.
 *
 * It leaves the source's lip with the stream, rides down beside it and sinks
 * into its slot as that segment fills. Two earlier versions were wrong in the
 * same way and it is worth naming: the first stamped the whole set in when
 * the animation ended, the second floated them down from the *destination's*
 * mouth — both meant the glyph belonged to the tube it landed in. It belongs
 * to the liquid, and the liquid comes from somewhere.
 *
 * Drawn unclipped over the rack, because for most of its flight it is above
 * the destination's mouth and the tube's own clip would cut it in half.
 *
 * Two reactions per mark (the transform array and the fade), at most four
 * marks, alive only for the pour — the same transient budget the splash
 * droplets already spend three per particle on.
 */
const TravellingMark = memo(function TravellingMark({
  tube,
  layout,
  animation,
  geometry,
  progress,
  arrival,
  theme,
}: {
  /** The destination tube: where this glyph is headed. */
  tube: TubeRect;
  layout: BoardLayout;
  animation: PourAnimation;
  geometry: PourGeometry;
  progress: SharedValue<number>;
  /** 0-based order of arrival: 0 is the first segment to land. */
  arrival: number;
  theme: Theme;
}) {
  const seg = layout.segmentHeight;
  const finalCx = tube.x + tube.width / 2;
  const finalCy =
    tube.y + tube.height - (animation.destFilled + arrival + 1) * seg + seg / 2;

  // Where it starts: the lip of the tilted source tube, the same point the
  // stream leaves from.
  const startCx = geometry.streamX;
  const startCy = geometry.target.y;

  // Its own window. `arriveAt` is the moment this segment's liquid finishes
  // landing; the flight is backdated from there and clamped so a glyph never
  // sets off before the tube has tipped.
  const arriveAt =
    PHASE.fillStart + ((arrival + 1) / animation.count) * (PHASE.fillEnd - PHASE.fillStart);
  const departAt = Math.max(PHASE.pourStart, arriveAt - MARK_FLIGHT);
  const width = tube.width;

  const computeTransform = useCallback(
    (input: number) => {
      'worklet';
      const local = phaseProgress(input, departAt, arriveAt);
      // Sinks a touch past its slot and rises back — settling, not stopping.
      const overshoot = 1.2;
      const t = local - 1;
      const eased = 1 + (overshoot + 1) * t * t * t + overshoot * t * t;
      const left = 1 - eased;
      // A damped drift across the fall, so it floats down rather than drops.
      const sway = Math.sin(local * Math.PI * 3) * width * 0.07 * (1 - local);
      return [
        { translateX: (startCx - finalCx) * left + sway },
        { translateY: (startCy - finalCy) * left },
      ];
    },
    [departAt, arriveAt, startCx, startCy, finalCx, finalCy, width]
  );

  const computeOpacity = useCallback(
    (input: number) => {
      'worklet';
      // Fades up over the first slice of the flight; a glyph appearing at full
      // strength on the lip reads as popping out of the glass.
      return Math.min(1, phaseProgress(input, departAt, arriveAt) * 4);
    },
    [departAt, arriveAt]
  );

  const transform = useUiValue(progress, computeTransform, computeTransform(0));
  const opacity = useUiValue(progress, computeOpacity, computeOpacity(0));

  return (
    <Group transform={transform} opacity={opacity}>
      <ColourMark
        symbol={theme.symbols[animation.colour % theme.symbols.length]!}
        fill={theme.pieces[animation.colour % theme.pieces.length]!}
        cx={finalCx}
        cy={finalCy}
        size={Math.min(width, seg) * 0.42}
      />
    </Group>
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
