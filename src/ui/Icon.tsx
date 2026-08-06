import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';

/**
 * Feather-style 24×24 outlines. Drawn with Skia rather than shipped as image
 * assets: they scale to any density, tint from the theme, and add nothing to
 * the bundle.
 */
const ICONS = {
  back: 'M15 18 L9 12 L15 6',
  play: 'M7 4 L20 12 L7 20 Z',
  stages: 'M3 3 h7 v7 h-7 Z M14 3 h7 v7 h-7 Z M14 14 h7 v7 h-7 Z M3 14 h7 v7 h-7 Z',
  settings:
    'M12 8.8 a3.2 3.2 0 1 1 0 6.4 a3.2 3.2 0 0 1 0-6.4 Z M12 2.5 v3 M12 18.5 v3 M2.5 12 h3 M18.5 12 h3 M5.2 5.2 l2.1 2.1 M16.7 16.7 l2.1 2.1 M18.8 5.2 l-2.1 2.1 M7.3 16.7 l-2.1 2.1',
  undo: 'M3 8 v6 h6 M5.5 14 a8 8 0 1 0 2-8.5 L3 9',
  redo: 'M21 8 v6 h-6 M18.5 14 a8 8 0 1 1 -2-8.5 L21 9',
  // Nearly a closed loop, so it does not read as a mirrored redo.
  restart: 'M12 4 a8 8 0 1 1 -5.7 2.4 M12 4 L8.5 1 M12 4 L8.5 7',
  next: 'M5 12 h14 M12 5 l7 7 l-7 7',
  lock: 'M5 11 h14 v10 h-14 Z M8 11 V7 a4 4 0 0 1 8 0 v4',
  check: 'M20 6 L9 17 L4 12',
  home: 'M3 11 L12 3 L21 11 V21 h-6 v-7 h-6 v7 H3 Z',

  // Nav bar and reward chips, spec §4.2.
  // Home's nav bar. Daily is a calendar and Shop is a flask — the prototype's
  // own glyphs, not the gift box and shopping bag the generic set would give.
  gift: 'M5.5 5 h13 a2.5 2.5 0 0 1 2.5 2.5 v11 a2.5 2.5 0 0 1 -2.5 2.5 h-13 A2.5 2.5 0 0 1 3 18.5 v-11 A2.5 2.5 0 0 1 5.5 5 Z M3 10 h18 M8 3 v4 M16 3 v4',
  shop: 'M9 3 h6 M10 3 v4 l-4.2 8.4 A3 3 0 0 0 8.5 20 h7 a3 3 0 0 0 2.7-4.6 L14 7 V3',
  stats: 'M4 20 V11 M10 20 V4 M16 20 v-7 M22 20 H2',
  // The music note, per spec §7 — this button cycles tracks, it is not a mute.
  sound:
    'M9 18 V5 l10-2 v11 M9 18 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 Z M19 14 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 Z',
  mute: 'M9 18 V8 M9 18 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 Z M19 3 v8 M4 4 L20 20',
  hint: 'M9 21 h6 M10 18 h4 M12 2 a7 7 0 0 0 -4 12.7 V17 h8 v-2.3 A7 7 0 0 0 12 2 Z',
  addVial: 'M8 2 h8 M9 2 v14 a3 3 0 0 0 6 0 V2 M19 15 v6 M16 18 h6',
  star: 'M12 2.5 L15 9.2 L22 10 L16.8 14.8 L18.3 21.7 L12 18.2 L5.7 21.7 L7.2 14.8 L2 10 L9 9.2 Z',
  flame:
    'M12 2 C12 6 8 7 8 12 a4 4 0 0 0 8 0 c0-2-1-3-1-5 3 2 4 4.5 4 7 a7 7 0 0 1 -14 0 C5 9 12 7 12 2 Z',

  // Settings rows, spec §4.9.
  eye: 'M2 12 s3.5-7 10-7 10 7 10 7 -3.5 7 -10 7 -10-7 -10-7 Z M12 9 a3 3 0 0 1 0 6 a3 3 0 0 1 0-6 Z',
  music:
    'M9 18 V5 l10-2 v11 M9 18 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 Z M19 14 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 Z',
  tap: 'M9 11 V6 a2 2 0 0 1 4 0 v5 M13 8 a2 2 0 0 1 4 0 v4 c0 4 -2 8 -6 8 s-6-4 -6-6 l1-2 2 1',
  vibrate: 'M8 4 h8 v16 H8 Z M4 9 v6 M20 9 v6',
  bell: 'M6 9 a6 6 0 0 1 12 0 c0 6 2 7 2 7 H4 s2-1 2-7 M10 20 a2 2 0 0 0 4 0',
  book: 'M4 4 h13 a2 2 0 0 1 2 2 v14 H6 a2 2 0 0 1 -2-2 Z M6 20 a2 2 0 0 1 0-4 h13',
  shield: 'M12 3 l8 3 v6 c0 5 -3.5 8 -8 9 c-4.5-1 -8-4 -8-9 V6 Z',
  coin: 'M12 3 a9 9 0 1 1 0 18 a9 9 0 0 1 0-18 Z M12 7 v10 M9.5 9.5 h4 a1.5 1.5 0 0 1 0 3 h-3 a1.5 1.5 0 0 0 0 3 h4',
  clock: 'M12 3 a9 9 0 1 1 0 18 a9 9 0 0 1 0-18 Z M12 7 v5 l3.5 2',
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Parsed paths, shared across every instance and every mount.
 *
 * An `SkPath` is a native object; parsing per component meant one allocation
 * per icon per mount, and the nav bar alone mounts five. They are immutable
 * here — nothing scales or transforms the path itself, only the canvas — so
 * one copy per glyph is safe to share.
 */
const PATHS = new Map<IconName, ReturnType<typeof Skia.Path.MakeFromSVGString>>();

function iconPath(name: IconName) {
  let path = PATHS.get(name);
  if (path === undefined) {
    path = Skia.Path.MakeFromSVGString(ICONS[name]);
    PATHS.set(name, path);
  }
  return path;
}

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Solid rather than outlined. Only `play` and `check` read well filled. */
  filled?: boolean;
}

export const Icon = memo(function Icon({
  name,
  size = 24,
  color = apothecary.ink,
  filled = false,
}: IconProps) {
  const path = iconPath(name);
  // `transform` is a fresh array every render otherwise, which defeats the
  // memo on the Skia node below it.
  const transform = useMemo(() => [{ scale: size / 24 }], [size]);
  const canvasStyle = useMemo(() => ({ width: size, height: size }), [size]);

  if (!path) return null;

  return (
    <Canvas style={canvasStyle}>
      <Group transform={transform}>
        <Path
          path={path}
          color={color}
          style={filled ? 'fill' : 'stroke'}
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
        />
      </Group>
    </Canvas>
  );
});

/** Gap between stars, as a fraction of one star's size. */
const STAR_GAP = 0.22;

/**
 * A three-star rating, drawn as stars rather than as dots.
 *
 * One canvas for all three, not three `Icon`s. A stage page holds 50 tiles and
 * every canvas is a native surface — 150 of them to draw six shapes each is the
 * kind of cost this project has already paid once, on Home's rack.
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
  const scale = useMemo(() => size / 24, [size]);

  if (!path) return null;

  return (
    <Canvas style={canvasStyle}>
      {Array.from({ length: total }, (_, i) => (
        <Group key={i} transform={[{ translateX: i * (size + gap) }, { scale }]}>
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
