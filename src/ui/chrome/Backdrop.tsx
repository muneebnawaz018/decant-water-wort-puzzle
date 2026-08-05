import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  advanceDrift,
  ambientMotes,
  ASSUMED_FRAME_MS,
  groundVector,
  lampGlow,
  moteOpacity,
  washGlow,
  type Mote,
} from '@/render/backdrop';
import { useUiValue3 } from '@/render/useUiValue';
import { apothecary, BACKDROP } from '@/theme/apothecary';
import { ui } from '@/theme/colors';

interface BackdropProps {
  width: number;
  height: number;
  /** Ambient motes off — for the board, where nothing should pull the eye. */
  still?: boolean;
}

/** One full clock turn. Slow: this is atmosphere, not an effect. */
const DRIFT_MS = 14000;

/**
 * The layered background from spec §3, drawn once behind the whole app.
 *
 * It sits in `Root` rather than in each screen so it survives screen changes —
 * a backdrop that remounted on every navigation would restart its drift and
 * flash, and would pay for a new Skia surface each time.
 */
export const Backdrop = memo(function Backdrop({
  width,
  height,
  still = false,
}: BackdropProps) {
  const clock = useSharedValue(0);

  /** The panel's frame interval, learned from the frames themselves. */
  const frameMs = useSharedValue(ASSUMED_FRAME_MS);

  /**
   * The drift is accumulated per frame rather than run as a `withTiming`
   * repeat, for two reasons.
   *
   * A timing animation is wall-clock driven, so a stalled UI thread — the next
   * screen building its Skia scene, say — is repaid in a single frame and the
   * motes visibly jump. Adding a clamped delta costs at most one frame of
   * drift no matter how long the stall ran.
   *
   * And pausing here is `setActive(false)`, which leaves the clock where it
   * stopped. Restarting a repeat meant re-seeding it to 0, so every return
   * from the board snapped all fourteen motes back to their starting phase at
   * once.
   *
   * Both the estimate and the clamp are in frames rather than milliseconds, so
   * the drift moves at the same speed per second on any panel and a hitch costs
   * the same number of frames on all of them.
   */
  const frame = useFrameCallback((info) => {
    'worklet';
    const next = advanceDrift(
      { clock: clock.value, frameMs: frameMs.value },
      info.timeSincePreviousFrame ?? 0,
      DRIFT_MS
    );
    clock.value = next.clock;
    frameMs.value = next.frameMs;
  }, false);

  useEffect(() => {
    frame.setActive(!still);
  }, [frame, still]);

  const lamp = useMemo(() => lampGlow(width, height), [width, height]);
  const wash = useMemo(() => washGlow(width, height), [width, height]);
  const ground = useMemo(() => groundVector(width, height), [width, height]);
  const motes = useMemo(() => (still ? [] : ambientMotes()), [still]);

  if (width <= 0 || height <= 0) return null;

  return (
    <>
      {/*
        The three gradients get their own canvas, and it is the whole point of
        splitting this in two.

        Skia redraws every node on a canvas when any value on it changes. With
        the motes sharing this surface, fourteen two-pixel dots were forcing
        three full-screen gradient fills every frame — three times the screen
        in overdraw, sixty times a second, behind every screen in the app, for
        as long as it is open. Nothing here can move, so on its own surface it
        rasterises once and is composited thereafter.
      */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(ground.start.x, ground.start.y)}
            end={vec(ground.end.x, ground.end.y)}
            colors={[apothecary.bg, apothecary.bg2]}
          />
        </Rect>

        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(lamp.cx, lamp.cy)}
            r={lamp.r}
            colors={[BACKDROP.lamp, BACKDROP.lampFade]}
          />
        </Rect>

        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={vec(wash.cx, wash.cy)}
            r={wash.r}
            colors={[BACKDROP.wash, BACKDROP.washFade]}
          />
        </Rect>
      </Canvas>

      {/*
        Only the motes redraw per frame now, and on the board this canvas is
        not mounted at all — so `still` costs one surface rather than a
        per-frame repaint of the gradients underneath it.
      */}
      {motes.length > 0 ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Group>
            {motes.map((mote, index) => (
              <AmbientMote
                key={index}
                mote={mote}
                clock={clock}
                width={width}
                height={height}
              />
            ))}
          </Group>
        </Canvas>
      ) : null}
    </>
  );
});

/**
 * One drifting mote. Position and opacity are numeric shared values written
 * from a worklet — Skia ignores derived values, and an `SkPath` in a shared
 * value does not survive either, so every animated shape here is a `Circle`
 * with animated `cx`/`cy`.
 */
const AmbientMote = memo(function AmbientMote({
  mote,
  clock,
  width,
  height,
}: {
  mote: Mote;
  clock: SharedValue<number>;
  width: number;
  height: number;
}) {
  const rise = height + 40;

  // One reaction per mote rather than three. This runs behind every screen for
  // as long as the app is open, so it is the animation whose cost is always
  // being paid — worth the extra care.
  const compute = useCallback(
    (t: number): [number, number, number] => {
      'worklet';
      const local = (t * mote.speed + mote.offset) % 1;
      return [
        mote.x * width + local * mote.drift * width,
        height + 20 - local * rise,
        moteOpacity(local),
      ];
    },
    [mote.speed, mote.offset, mote.x, mote.drift, width, height, rise]
  );

  const [cx, cy, opacity] = useUiValue3(clock, compute, [mote.x * width, height, 0]);

  return <Circle cx={cx} cy={cy} r={mote.radius} color={ui.mote} opacity={opacity} />;
});
