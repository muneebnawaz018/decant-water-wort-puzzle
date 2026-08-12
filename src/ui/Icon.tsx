import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { ICON_VIEWBOX, ICONS, MIRRORED, type IconName } from '@/theme/icons';

/**
 * Draws the glyphs in `theme/icons.ts`. The paths live there as data so that
 * naming an icon costs nothing but a string — see that file's header.
 *
 * `IconName` is re-exported because every consumer that draws an icon already
 * imports this file, and sending them to a second module for the name of the
 * thing they are about to render is friction with no payoff. The stores that
 * only *name* one import it from `theme/icons` directly.
 */
export type { IconName };

/**
 * Parsed paths, shared across every instance and every mount.
 *
 * An `SkPath` is a native object; parsing per component meant one allocation
 * per icon per mount, and the nav bar alone mounts five. They are immutable
 * here — nothing scales or transforms the path itself, only the canvas — so
 * one copy per glyph is safe to share.
 */
const PATHS = new Map<keyof typeof ICONS, ReturnType<typeof Skia.Path.MakeFromSVGString>>();

/**
 * The parsed glyph for a name, mirrored ones included.
 *
 * Keyed by the *source* glyph rather than by the icon name, because a mirrored
 * icon is no longer a path of its own: `prev` and `next` share one `SkPath` and
 * differ only in the canvas transform below. One entry, one native object.
 */
function iconPath(name: IconName) {
  const source = (
    name in MIRRORED ? MIRRORED[name as keyof typeof MIRRORED] : name
  ) as keyof typeof ICONS;

  let path = PATHS.get(source);
  if (path === undefined) {
    path = Skia.Path.MakeFromSVGString(ICONS[source]);
    PATHS.set(source, path);
  }
  return path;
}

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export const Icon = memo(function Icon({
  name,
  size = 24,
  color = apothecary.ink,
}: IconProps) {
  const path = iconPath(name);
  const mirrored = name in MIRRORED;

  /**
   * The canvas transform, which is also where mirroring happens now.
   *
   * It used to reflect the `SkPath` itself with `path.transform()`, and Skia
   * 2.x deprecates that — it warns on every launch and is slated for removal.
   * Reflecting the canvas instead is not just the migration: it is the better
   * shape. A mirrored icon stops being a second native object, so `prev` and
   * `next` share one parsed path, and nothing mutates a path that is about to
   * be cached and shared.
   *
   * The list is outermost-first, so it reads backwards from how the point
   * moves: `translateY` lifts the 960 grid's negative Y into the canvas, then
   * `scale` fits it to the box, then — for a mirrored glyph — `scaleX` flips it
   * about x = 0 and `translateX` slides it back into frame. Without that last
   * step a mirrored icon lands entirely off-canvas, which looks like a missing
   * icon rather than a wrong one.
   *
   * Memoised because a fresh array every render defeats the memo on the Skia
   * node below it.
   */
  const transform = useMemo(
    () =>
      mirrored
        ? [
            { translateX: size },
            { scaleX: -1 },
            { scale: size / ICON_VIEWBOX },
            { translateY: ICON_VIEWBOX },
          ]
        : [{ scale: size / ICON_VIEWBOX }, { translateY: ICON_VIEWBOX }],
    [size, mirrored]
  );
  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  if (!path) return null;

  return (
    <Canvas style={canvasStyle}>
      <Group transform={transform}>
        {/* Always filled. The set has no outline variants here on purpose. */}
        <Path path={path} color={color} style="fill" />
      </Group>
    </Canvas>
  );
});

/** Gap between stars, as a fraction of one star's size. */
const STAR_GAP = 0.22;

/**
 * A three-star rating, drawn as stars rather than as dots.
 *
 * One canvas for all three, not three `Icon`s. A stage page holds 30 tiles
 * (`PAGE_SIZE`) and every canvas is a native surface — 90 of them to draw six
 * shapes each is the kind of cost this project has already paid once, on
 * Home's rack. It is also the floor: one canvas per tile is where the grid
 * stops without a rewrite, for the reason recorded in `AGENTS.md`.
 *
 * Earned stars are filled gold; the rest are the same shape at low opacity, so
 * the row keeps its width and a player can see what is still on the table.
 */
export const Stars = memo(function Stars({
  filled,
  size,
  total = 3,
}: {
  /** How many are earned, 0 to `total`. */
  filled: number;
  /** One star's box. The row is wider by the gaps. */
  size: number;
  total?: number;
}) {
  const path = iconPath('star');
  const gap = size * STAR_GAP;
  const width = size * total + gap * (total - 1);

  const canvasStyle = useMemo(() => ({ width, height: size }), [width, size]);
  const scale = useMemo(() => size / ICON_VIEWBOX, [size]);

  if (!path) return null;

  return (
    <Canvas style={canvasStyle}>
      {Array.from({ length: total }, (_, i) => (
        <Group
          key={i}
          transform={[
            { translateX: i * (size + gap) },
            { scale },
            { translateY: ICON_VIEWBOX },
          ]}
        >
          <Path
            path={path}
            color={i < filled ? apothecary.gold : ui.emptyStar}
            style="fill"
          />
        </Group>
      ))}
    </Canvas>
  );
});
