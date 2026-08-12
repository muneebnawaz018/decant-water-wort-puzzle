import { Skia, type SkPath } from '@shopify/react-native-skia';

import type { Vessel } from '@/theme/skins';
import type { TubeRect } from './layout';

type Builder = ReturnType<typeof Skia.PathBuilder.Make>;

/**
 * Vessel geometry: one trace function per silhouette family, dispatched on
 * `kind`. The first cut of this file was a single parametric builder — four
 * corner radii on one straight tube — and it could only ever draw the same
 * tube with different corners, which is exactly what the shop got caught
 * selling. A skin is a different silhouette, and a cone, a bulb and a waist
 * are different drawing code, not different numbers fed to the same walls.
 *
 * Every trace starts at the right edge of the mouth and ends at the left,
 * without closing. That one contour serves both jobs the board has:
 *
 * - `vesselPath` closes it — the straight line back across the mouth — and is
 *   what liquid, seams and marks clip to. The clip needs a sealed region.
 * - `vesselOutline` leaves it open, and is what the glass is *stroked* with.
 *   A stroke across the mouth read as a lid on every tube — glassware is open
 *   until something closes it, and the thing that closes it is `vesselCap`,
 *   drawn only on a completed tube.
 *
 * `Skia.PathBuilder`, not `Skia.Path.Make()`: the mutating path methods are
 * deprecated in Skia 2.x, and `detach()` hands back an immutable path, which
 * is what a memoised layout wants anyway.
 *
 * Every family keeps its narrowest glass at or above `0.46` of the tube's
 * width, pinned in `skins.test.ts`: the colourblind glyphs are drawn at `0.42`
 * of the width, centred, and glass narrower than that clips the accessibility
 * mark.
 */
export function vesselPath(tube: TubeRect, vessel: Vessel): SkPath {
  return trace(tube, vessel).close().detach();
}

/** The same contour left open at the mouth — see the file comment. */
export function vesselOutline(tube: TubeRect, vessel: Vessel): SkPath {
  return trace(tube, vessel).detach();
}

function trace(tube: TubeRect, vessel: Vessel): Builder {
  switch (vessel.kind) {
    case 'tube':
      return traceTube(tube, vessel.shoulder, vessel.base);
    case 'cone':
      return traceCone(tube, vessel.mouth, vessel.neck);
    case 'orb':
      return traceOrb(tube, vessel.mouth);
    case 'pear':
      return tracePear(tube, vessel.mouth, vessel.neck);
    case 'hourglass':
      return traceHourglass(tube, vessel.waist);
  }
}

/** The straight-walled tube the game shipped with: two corner radii, no neck. */
function traceTube(tube: TubeRect, shoulderFrac: number, baseFrac: number): Builder {
  const { x, y, width, height } = tube;
  const half = width / 2;

  // Radii are clamped to half the width: a skin is numbers a human types, and
  // a corner wider than the tube produces a path Skia will happily draw as a
  // knot rather than refuse.
  const shoulder = Math.min(shoulderFrac * width, half);
  const base = Math.min(baseFrac * width, half, height / 2);

  const builder = Skia.PathBuilder.Make();
  builder.moveTo(x + width - shoulder, y);
  if (shoulder > 0) builder.quadTo(x + width, y, x + width, y + shoulder);
  builder.lineTo(x + width, y + height - base);
  if (base > 0) builder.quadTo(x + width, y + height, x + width - base, y + height);
  builder.lineTo(x + base, y + height);
  if (base > 0) builder.quadTo(x, y + height, x, y + height - base);
  builder.lineTo(x, y + shoulder);
  if (shoulder > 0) builder.quadTo(x, y, x + shoulder, y);
  return builder;
}

/**
 * An Erlenmeyer flask: a rolled lip, a straight neck a third of the height,
 * then walls that run dead straight to the full-width base. The slant is the
 * whole skin, so no curve blends the neck into the body — a hard corner there
 * is what reads as lab glass rather than as a melted tube.
 */
function traceCone(tube: TubeRect, mouth: number, neck: number): Builder {
  const { x, y, width, height } = tube;
  const cx = x + width / 2;
  const halfMouth = (mouth * width) / 2;
  const lip = width * 0.06;
  const lipDrop = height * 0.03;
  const neckBottom = y + height * neck;
  // Near-flat: the flask stands on its base.
  const base = width * 0.1;

  const builder = Skia.PathBuilder.Make();
  builder.moveTo(cx + halfMouth + lip, y);
  builder.lineTo(cx + halfMouth, y + lipDrop);
  builder.lineTo(cx + halfMouth, neckBottom);
  builder.lineTo(x + width, y + height - base);
  builder.quadTo(x + width, y + height, x + width - base, y + height);
  builder.lineTo(x + base, y + height);
  builder.quadTo(x, y + height, x, y + height - base);
  builder.lineTo(cx - halfMouth, neckBottom);
  builder.lineTo(cx - halfMouth, y + lipDrop);
  builder.lineTo(cx - halfMouth - lip, y);
  return builder;
}

/**
 * Where the orb's neck stops being a neck, in radians round the bulb from its
 * top. The shoulder fillet is tangent to the bulb here, so this also decides
 * how much of the circle the arc actually draws.
 */
const ORB_SHOULDER = Math.PI / 4;

/**
 * The shoulder join, shared by the outline and the highlight.
 *
 * Two places deriving the same curve is how they drift apart, and the stripe
 * follows this wall closely enough that a few percent shows.
 */
function orbGeometry(tube: TubeRect, mouth: number) {
  const { y, width, height } = tube;
  const r = width / 2;
  const centreY = y + height - r;
  const halfMouth = (mouth * width) / 2;

  // Where the fillet touches the bulb, and the bulb's tangent direction there.
  const sin = Math.sin(ORB_SHOULDER);
  const cos = Math.cos(ORB_SHOULDER);
  const touchHalf = r * sin;
  const touchY = centreY - r * cos;

  // The corner the fillet rounds off: where that tangent crosses the neck
  // wall. Distance along the tangent is negative — the crossing is back up
  // toward the mouth, which is what makes the neck flare outward into the
  // shoulder rather than pinch inward.
  const reach = (r * sin - halfMouth) / cos;
  const cornerY = touchY - reach * sin;

  return { r, centreY, halfMouth, touchHalf, touchY, cornerY, startY: cornerY - reach };
}

/**
 * A round-bottom flask: a spherical bulb one tube-width tall under a long
 * narrow neck, the two joined by a flared shoulder.
 *
 * The bulb is a real arc rather than stitched quads — a boiling flask is one
 * circle, and an approximated one reads as a sagging bag at board size.
 *
 * The shoulder is a fillet, and it has to be. Running the neck's vertical
 * wall straight into the sphere is geometrically honest and looks broken: the
 * bulb's tangent where a `0.48r` wall crosses it is about 60° off vertical,
 * so the outline arrived at a hard notch on each side. The fillet leaves the
 * neck vertically and meets the bulb along its tangent, so both joins are
 * smooth and the arc starts where the glass is already heading that way.
 */
function traceOrb(tube: TubeRect, mouth: number): Builder {
  const { x, y, width, height } = tube;
  const cx = x + width / 2;
  const lip = width * 0.06;
  const lipDrop = height * 0.025;
  const { r, centreY, halfMouth, touchHalf, touchY, cornerY, startY } = orbGeometry(
    tube,
    mouth
  );

  // Skia measures degrees from three o'clock, clockwise in screen
  // coordinates. The arc runs from the right tangent point, under the bulb,
  // to its mirror on the left.
  const shoulderDeg = (ORB_SHOULDER * 180) / Math.PI;
  const oval = Skia.XYWHRect(x, centreY - r, width, width);

  const builder = Skia.PathBuilder.Make();
  builder.moveTo(cx + halfMouth + lip, y);
  builder.lineTo(cx + halfMouth, y + lipDrop);
  builder.lineTo(cx + halfMouth, startY);
  builder.quadTo(cx + halfMouth, cornerY, cx + touchHalf, touchY);
  builder.arcToOval(oval, shoulderDeg - 90, 360 - 2 * shoulderDeg, false);
  builder.quadTo(cx - halfMouth, cornerY, cx - halfMouth, startY);
  builder.lineTo(cx - halfMouth, y + lipDrop);
  builder.lineTo(cx - halfMouth - lip, y);
  return builder;
}

/**
 * A potion bottle: a collar ring at the mouth, a short neck, and a pear body
 * that swells to full width low on the tube. The collar is a square step —
 * the ring a cork seats against — and the swell is one cubic each side, ending
 * vertical at the widest point so the body does not kink into the base.
 */
function tracePear(tube: TubeRect, mouth: number, neck: number): Builder {
  const { x, y, width, height } = tube;
  const cx = x + width / 2;
  const halfMouth = (mouth * width) / 2;
  const halfCollar = halfMouth + width * 0.09;
  const collarBottom = y + height * 0.05;
  const neckBottom = y + height * neck;
  const wideY = y + height * 0.62;
  const base = width * 0.3;

  const builder = Skia.PathBuilder.Make();
  builder.moveTo(cx + halfCollar, y);
  builder.lineTo(cx + halfCollar, collarBottom);
  builder.lineTo(cx + halfMouth, collarBottom);
  builder.lineTo(cx + halfMouth, neckBottom);
  builder.cubicTo(
    cx + halfMouth,
    y + height * 0.38,
    x + width,
    y + height * 0.45,
    x + width,
    wideY
  );
  builder.lineTo(x + width, y + height - base);
  builder.quadTo(x + width, y + height, x + width - base, y + height);
  builder.lineTo(x + base, y + height);
  builder.quadTo(x, y + height, x, y + height - base);
  builder.lineTo(x, wideY);
  builder.cubicTo(
    x,
    y + height * 0.45,
    cx - halfMouth,
    y + height * 0.38,
    cx - halfMouth,
    neckBottom
  );
  builder.lineTo(cx - halfMouth, collarBottom);
  builder.lineTo(cx - halfCollar, collarBottom);
  builder.lineTo(cx - halfCollar, y);
  return builder;
}

/**
 * An hourglass: two full-width chambers pinched to a waist at half height.
 * Each wall is two cubics meeting at the waist with vertical tangents, so the
 * pinch is a smooth S-curve rather than a corner — a kink there reads as a
 * broken mould. At capacity four the waist lands exactly on a segment
 * boundary, which is a happy accident worth keeping.
 */
function traceHourglass(tube: TubeRect, waist: number): Builder {
  const { x, y, width, height } = tube;
  const cx = x + width / 2;
  const halfWaist = (waist * width) / 2;
  const waistY = y + height / 2;
  const corner = width * 0.14;

  const builder = Skia.PathBuilder.Make();
  builder.moveTo(x + width - corner, y);
  builder.quadTo(x + width, y, x + width, y + corner);
  builder.cubicTo(
    x + width,
    y + height * 0.34,
    cx + halfWaist,
    y + height * 0.36,
    cx + halfWaist,
    waistY
  );
  builder.cubicTo(
    cx + halfWaist,
    y + height * 0.64,
    x + width,
    y + height * 0.66,
    x + width,
    y + height - corner
  );
  builder.quadTo(x + width, y + height, x + width - corner, y + height);
  builder.lineTo(x + corner, y + height);
  builder.quadTo(x, y + height, x, y + height - corner);
  builder.cubicTo(
    x,
    y + height * 0.66,
    cx - halfWaist,
    y + height * 0.64,
    cx - halfWaist,
    waistY
  );
  builder.cubicTo(cx - halfWaist, y + height * 0.36, x, y + height * 0.34, x, y + corner);
  builder.quadTo(x, y, x + corner, y);
  return builder;
}

/**
 * The stopper a completed tube wears: a rounded slab straddling the rim, a
 * little wider than the mouth it seals. The mouth's own width differs per
 * family — a pear seals over its collar, an hourglass over its whole top — so
 * the slab asks the silhouette rather than assuming the tube's width.
 *
 * One shape, on purpose, second time around: a per-family set (bung, ball
 * stopper, T-cork, end plate) was built and rolled back on review — the slab
 * read best on the board. Geometry only: the board paints it in the colour of
 * the liquid it seals, so the cap keeps saying which colour is finished after
 * the meniscus is hidden under it.
 *
 * Drawn only when a tube holds one colour at full capacity: an open mouth is
 * the resting state, and the cap arriving is the reward for closing one out.
 */
export function vesselCap(tube: TubeRect, vessel: Vessel): SkPath {
  const { x, y, width } = tube;
  const mouthHalf = mouthHalfWidth(tube, vessel);
  const capWidth = 2 * (mouthHalf + width * 0.06);
  const capHeight = width * 0.2;
  const radius = width * 0.07;

  return Skia.PathBuilder.Make()
    .addRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          x + width / 2 - capWidth / 2,
          y - capHeight * 0.55,
          capWidth,
          capHeight
        ),
        radius,
        radius
      )
    )
    .detach();
}

/** Half the outer width of the opening, per family — lip and collar included. */
function mouthHalfWidth(tube: TubeRect, vessel: Vessel): number {
  const { width } = tube;
  switch (vessel.kind) {
    case 'tube':
      return width / 2;
    case 'cone':
    case 'orb':
      return (vessel.mouth * width) / 2 + width * 0.06;
    case 'pear':
      return (vessel.mouth * width) / 2 + width * 0.09;
    // Full width: `waist` pinches the middle, not the opening. Reading the
    // waist here made the cap narrower than the glass it sealed, and since
    // the outline is open at the mouth, the rim stuck out past both ends of
    // the stopper as two bare stubs.
    case 'hourglass':
      return width / 2;
  }
}

/**
 * The specular stripe down the glass — a **centreline**, stroked by the
 * caller with `strokeWidth = HIGHLIGHT_WIDTH * tube.width` and round caps.
 *
 * It follows the wall. The first version was a straight rect pushed down to
 * wherever each family got wide enough to hold it, which meant the vial had a
 * full-length stripe and every curved vessel had a stub ending at its
 * shoulder — the light stopped where the glass bent, which is precisely where
 * real glass is brightest. Sampling `wallHalfWidth` down the tube gives one
 * unbroken highlight that curves with the neck on all five silhouettes.
 *
 * A polyline rather than a filled outline so the thickness is the stroke's
 * job: an outline would need two sampled edges kept in step, and round caps
 * come free.
 */
export function vesselHighlight(tube: TubeRect, vessel: Vessel): SkPath {
  const cx = tube.x + tube.width / 2;
  const top = tube.y + tube.height * STRIPE_INSET;
  const bottom = tube.y + tube.height * (1 - STRIPE_INSET);

  // Samples are spread evenly down the tube, so the count has to satisfy the
  // *tightest* curve on it, not the average. At 16 the orb's bulb — a full
  // circle inside the bottom quarter of the height — collected about four of
  // them and the stripe rounded it in visible flat chords. The path is built
  // once per layout, so a generous count costs nothing per frame.
  const STEPS = 64;
  const builder = Skia.PathBuilder.Make();

  for (let step = 0; step <= STEPS; step++) {
    const y = top + ((bottom - top) * step) / STEPS;
    const half = wallHalfWidth(tube, vessel, y);
    // A fixed distance in from the wall, never a fraction of the local width:
    // proportional spacing made the gap track the glass, so the stripe was
    // pinched against a narrow neck and adrift in a wide bulb — one bar with
    // two different margins down its own length.
    const x = Math.min(
      cx - half + tube.width * STRIPE_GAP,
      // Guard for glass narrower than the catalogue currently allows: the
      // stripe stays left of centre rather than crossing it.
      cx - tube.width * HIGHLIGHT_WIDTH
    );
    if (step === 0) builder.moveTo(x, y);
    else builder.lineTo(x, y);
  }

  return builder.detach();
}

/** Stroke width for `vesselHighlight`, as a fraction of the tube's width. */
export const HIGHLIGHT_WIDTH = 0.07;

/**
 * Distance from the glass to the middle of the stripe, as a fraction of the
 * tube's width. Constant, so the light keeps one margin off the wall the
 * whole way down whatever the glass is doing behind it.
 */
const STRIPE_GAP = 0.11;

/**
 * Air above and below the stripe, as a fraction of the tube's height — the
 * **same at both ends and the same on every family**.
 *
 * It was a per-family table of two numbers, and the two were never equal:
 * each end had been nudged until that silhouette looked right, which left
 * every vessel with a different gap above its bar than below it. One number
 * is also what makes the bars agree across skins, so swapping vessels does
 * not move the light.
 *
 * Symmetry is only possible because `wallHalfWidth` models the curve into the
 * base. The table existed to stop the stripe overshooting there; now it
 * follows the glass inward instead, which is what light on a rounded bottom
 * actually does.
 */
const STRIPE_INSET = 0.07;

/**
 * Half the width of the glass at a given y — the same walls `trace` draws,
 * solved for one height instead of stepped through.
 *
 * The curved families are approximated (a smoothstep for the pear's cubic
 * swell, a sine for the hourglass's pinch) and that is safe because the
 * stripe sits a third of the local half-width inside the wall: an
 * approximation off by a few percent moves the highlight, it cannot push it
 * outside the glass.
 */
function wallHalfWidth(tube: TubeRect, vessel: Vessel, y: number): number {
  const { width, height } = tube;
  const half = width / 2;
  const t = (y - tube.y) / height;

  switch (vessel.kind) {
    // Straight walls between two corner curves. The base one matters: at the
    // vial's `0.5` it is an eighth of the tube's height, and a stripe that
    // ignored it would run past the glass at the bottom left.
    case 'tube': {
      const shoulder = Math.min(vessel.shoulder * width, half);
      const base = Math.min(vessel.base * width, half, height / 2);
      const fromTop = y - tube.y;
      const fromBottom = tube.y + height - y;

      if (shoulder > 0 && fromTop < shoulder) {
        const d = shoulder - fromTop;
        return half - shoulder + Math.sqrt(Math.max(0, shoulder * shoulder - d * d));
      }
      if (base > 0 && fromBottom < base) {
        const d = base - fromBottom;
        return half - base + Math.sqrt(Math.max(0, base * base - d * d));
      }
      return half;
    }

    case 'cone': {
      const halfMouth = (vessel.mouth * width) / 2;
      if (t <= vessel.neck) return halfMouth;
      // The wall runs straight from the neck to the base.
      const baseT = 1 - (width * 0.1) / height;
      const k = Math.min(1, (t - vessel.neck) / (baseT - vessel.neck));
      return halfMouth + (half - halfMouth) * k;
    }

    // Neck, then the shoulder fillet, then the bulb. The fillet is a
    // quadratic, degree-elevated to a cubic so one solver covers every curve
    // in this file.
    case 'orb': {
      const { r, centreY, halfMouth, touchHalf, touchY, cornerY, startY } = orbGeometry(
        tube,
        vessel.mouth
      );
      if (y <= startY) return halfMouth;
      if (y < touchY) {
        return cubicXAtY(
          [halfMouth, halfMouth, touchHalf + (2 / 3) * (halfMouth - touchHalf), touchHalf],
          [
            startY,
            startY + (2 / 3) * (cornerY - startY),
            touchY + (2 / 3) * (cornerY - touchY),
            touchY,
          ],
          y
        );
      }
      const dy = y - centreY;
      return Math.max(halfMouth, Math.sqrt(Math.max(0, r * r - dy * dy)));
    }

    // The swell is the same cubic `tracePear` draws, solved for y rather than
    // walked by t.
    case 'pear': {
      const halfMouth = (vessel.mouth * width) / 2;
      const neckBottom = tube.y + height * vessel.neck;
      const wideY = tube.y + height * 0.62;
      if (y <= neckBottom) return halfMouth;
      if (y >= wideY) return half;
      return (
        half -
        cubicXAtY(
          [half - halfMouth, half - halfMouth, 0, 0],
          [neckBottom, tube.y + height * 0.38, tube.y + height * 0.45, wideY],
          y
        )
      );
    }

    // Two cubics meeting at the waist, again the ones `traceHourglass` draws.
    // A sine stood in for them at first and was visibly wrong: the real wall
    // holds near full width down to about a third of the height and then
    // pinches hard, where a sine starts narrowing immediately — so the stripe
    // pulled away from the glass across the whole upper chamber.
    case 'hourglass': {
      const halfWaist = (vessel.waist * width) / 2;
      const waistY = tube.y + height / 2;
      const corner = width * 0.14;

      if (y <= tube.y + corner || y >= tube.y + height - corner) return half;

      return y <= waistY
        ? half -
            cubicXAtY(
              [0, 0, half - halfWaist, half - halfWaist],
              [tube.y + corner, tube.y + height * 0.34, tube.y + height * 0.36, waistY],
              y
            )
        : half -
            cubicXAtY(
              [half - halfWaist, half - halfWaist, 0, 0],
              [
                waistY,
                tube.y + height * 0.64,
                tube.y + height * 0.66,
                tube.y + height - corner,
              ],
              y
            );
    }
  }
}

/**
 * How far a cubic has travelled sideways by the time it reaches `y`.
 *
 * The wall curves are Béziers in `t`, and the stripe is sampled in `y`, so the
 * parameter has to be recovered before the offset can be read off. Bisection
 * rather than solving the cubic: every wall here is monotonic in y (each is
 * one side of a vessel that never doubles back), 24 halvings put t inside a
 * ten-millionth, and this runs once per layout.
 *
 * Both control arrays are the four Bézier controls — `xs` measured as inset
 * from the wall's extreme, `ys` in canvas coordinates.
 */
function cubicXAtY(
  xs: [number, number, number, number],
  ys: [number, number, number, number],
  y: number
): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(ys, mid) < y) lo = mid;
    else hi = mid;
  }
  return bezier(xs, (lo + hi) / 2);
}

function bezier(p: [number, number, number, number], t: number): number {
  const u = 1 - t;
  return u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3];
}
