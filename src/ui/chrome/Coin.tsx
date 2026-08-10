import { Canvas, Circle, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { apothecary } from '@/theme/apothecary';
import { colours } from '@/theme/colors';

/**
 * The coin. One drawing, every place coins appear — the balance pill, the
 * reward tiles, the claim button, the win card, and the shower that rains down
 * when coins are paid (`script/make-coins.py` draws the same face).
 *
 * Flat two-tone gold with a milled edge: a darker gold body with notches cut
 * around its rim, a bright face inside it, a hairline ring, and a `$` in the
 * body's own gold. **No black outline and no shading.** Two earlier attempts
 * are worth naming so they are not tried again — a lit sphere with a font `$`,
 * which read as a bead rather than money, and an ink-outlined cartoon coin,
 * which was legible but belonged to a different set of artwork than the
 * reference this now matches.
 *
 * Skia rather than views: the milled edge is 28 radial strokes and the mark is
 * a stroked path, neither of which React Native can draw. A font `$` cannot be
 * stroked at all, and centres by its text box rather than by its ink.
 */
export const Coin = memo(function Coin({ size }: { size: number }) {
  /**
   * Below this, the engraving is dropped.
   *
   * 28 notches around an 18dp pill coin land under a pixel apart — they stop
   * reading as a milled edge and turn the rim into a smear, and the hairline
   * ring closes onto the mark. The face keeps its colours and its `$`, so it is
   * the same coin with less on it, which is what a real one looks like small.
   */
  const detailed = size >= 28;

  /**
   * Geometry in design units — a 60-unit box — scaled to whatever size is
   * asked for, so a 13dp caption coin and a 44dp reward coin are one object.
   */
  const g = useMemo(() => {
    const k = size / 60;
    return {
      centre: size / 2,
      body: 30 * k,
      face: 25.5 * k,
      ring: 20.5 * k,
      ringWidth: 1.6 * k,
      notch: 2.6 * k,
      mark: 4.8 * k,
    };
  }, [size]);

  /**
   * The milled edge and the mark, built once per size.
   *
   * `PathBuilder…detach()` rather than `Skia.Path.Make()` plus mutating calls —
   * the mutating API is deprecated in Skia 2.x and warns on every build, and an
   * immutable path is what a memo wants anyway.
   */
  const paths = useMemo(() => {
    const k = size / 60;
    const c = size / 2;
    const at = (x: number, y: number) => [c + x * k, c + y * k] as const;

    // 28 notches, cut from the rim inward. A count rather than a spacing: the
    // notches have to close the circle exactly, and any fixed gap leaves a
    // wider one where the last meets the first.
    const milling = Skia.PathBuilder.Make();
    for (let i = 0; i < 28; i++) {
      const a = (Math.PI * 2 * i) / 28;
      milling.moveTo(...at(Math.cos(a) * 25.5, Math.sin(a) * 25.5));
      // Out to the body's own edge, not past it: the canvas is exactly the
      // coin's box, so a notch drawn beyond 30 is clipped flat on one side.
      milling.lineTo(...at(Math.cos(a) * 30, Math.sin(a) * 30));
    }

    const mark = Skia.PathBuilder.Make();
    // The S, three cubics.
    mark.moveTo(...at(7.5, -9));
    mark.cubicTo(...at(7.5, -14.5), ...at(-8.5, -15.5), ...at(-8.5, -8));
    mark.cubicTo(...at(-8.5, -1.5), ...at(8.5, -0.5), ...at(8.5, 6.5));
    mark.cubicTo(...at(8.5, 14), ...at(-7.5, 13.5), ...at(-7.5, 8));
    // The bar through it, which is the half of the sign people actually read.
    mark.moveTo(...at(0, -16.5));
    mark.lineTo(...at(0, 15.5));

    return { milling: milling.detach(), mark: mark.detach() };
  }, [size]);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* The body, which is only ever seen as the rim: the face covers the
          rest of it. */}
      <Circle cx={g.centre} cy={g.centre} r={g.body} color={colours.goldBronze} />

      {detailed ? (
        <Path
          path={paths.milling}
          color={colours.goldDark}
          style="stroke"
          strokeWidth={g.notch}
        />
      ) : null}

      <Circle cx={g.centre} cy={g.centre} r={g.face} color={apothecary.gold} />

      {detailed ? (
        <Circle
          cx={g.centre}
          cy={g.centre}
          r={g.ring}
          color={colours.goldBronze}
          style="stroke"
          strokeWidth={g.ringWidth}
        />
      ) : null}

      {/* The mark is a step darker than the rim it matches in hue. At bronze it
          sat too close to the face and read as embossed-and-faded; `goldDark`
          is the same gold with the light taken off it, which is what a struck
          mark in a recess looks like. */}
      <Path
        path={paths.mark}
        color={colours.goldDark}
        style="stroke"
        strokeWidth={g.mark}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
});
