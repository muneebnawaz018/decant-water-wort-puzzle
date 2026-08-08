import { Skia, type SkPath } from '@shopify/react-native-skia';

import type { Vessel } from '@/theme/skins';
import type { TubeRect } from './layout';

/**
 * Builds a vessel outline from a skin's fractions and the box it has to fill.
 *
 * One builder for every skin rather than a path per shape. The alternative —
 * each skin owning its own drawing code — means a new skin is new geometry to
 * get wrong, and the four this ships with differ only in four numbers.
 *
 * `Skia.PathBuilder`, not `Skia.Path.Make()`: the mutating path methods are
 * deprecated in Skia 2.x, and `detach()` hands back an immutable path, which is
 * what a memoised layout wants anyway — a path nobody can mutate cannot drift
 * from the box it was measured for.
 */
export function vesselPath(tube: TubeRect, vessel: Vessel): SkPath {
  const { x, y, width, height } = tube;
  const half = width / 2;

  // Every radius is clamped to half the width. A skin is four numbers a human
  // types, and a shoulder wider than the tube produces a path Skia will happily
  // draw as a knot rather than refuse.
  const shoulder = Math.min(vessel.shoulder * width, half);
  const base = Math.min(vessel.base * width, half, height / 2);

  // How far each wall of the neck sits in from the body.
  const inset = (width * (1 - Math.min(1, Math.max(0.2, vessel.mouth)))) / 2;
  const neck = height * Math.max(0, vessel.neck);

  const builder = Skia.PathBuilder.Make();

  const left = x + inset;
  const right = x + width - inset;
  const sr = Math.min(shoulder, (right - left) / 2);

  // Down the right: lip, neck wall, then the flare out to the body.
  builder.moveTo(left + sr, y);
  builder.lineTo(right - sr, y);
  if (sr > 0) builder.quadTo(right, y, right, y + sr);

  if (inset > 0) {
    builder.lineTo(right, y + neck);
    // A single control point at the corner of the neck and the body turns the
    // step between them into a shoulder. Two straight lines there read as a
    // funnel taped to a jar.
    builder.quadTo(x + width, y + neck, x + width, y + neck + inset);
  }

  builder.lineTo(x + width, y + height - base);
  if (base > 0) builder.quadTo(x + width, y + height, x + width - base, y + height);
  builder.lineTo(x + base, y + height);
  if (base > 0) builder.quadTo(x, y + height, x, y + height - base);

  // Back up the left, mirrored.
  if (inset > 0) {
    builder.lineTo(x, y + neck + inset);
    builder.quadTo(x, y + neck, left, y + neck);
  }

  builder.lineTo(left, y + sr);
  if (sr > 0) builder.quadTo(left, y, left + sr, y);

  return builder.close().detach();
}

/**
 * The specular stripe down the glass, sized to sit inside the body.
 *
 * It starts below the neck rather than at a fixed offset from the top: on a
 * flask the old constant put the highlight across the stem, where it read as a
 * crack in the glass rather than as light on it.
 */
export function vesselHighlight(
  tube: TubeRect,
  vessel: Vessel,
  segmentHeight: number
): SkPath {
  const top = tube.y + Math.max(segmentHeight * 0.45, tube.height * vessel.neck * 1.6);
  const radius = tube.width * 0.035;

  return Skia.PathBuilder.Make()
    .addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          tube.x + tube.width * 0.16,
          top,
          tube.width * 0.07,
          tube.y + tube.height - top - segmentHeight * 0.55
        ),
        radius,
        radius
      )
    )
    .detach();
}
