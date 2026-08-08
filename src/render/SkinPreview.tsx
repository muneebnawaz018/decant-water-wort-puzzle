import { Canvas, Group, Path, Rect } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { colours, ui } from '@/theme/colors';
import type { Vessel } from '@/theme/skins';
import { vesselHighlight, vesselPath } from './vessel';

interface SkinPreviewProps {
  vessel: Vessel;
  width: number;
  height: number;
}

const VIALS = 3;
/** Fill levels, so the preview shows liquid meeting the glass at three heights. */
const FILL = [3, 2, 4] as const;
const CAPACITY = 4;

/** Three of the palette's most separated hues, named rather than indexed. */
const TINTS = [colours.aqua, colours.rose, colours.mango] as const;

/**
 * A shop card's picture of a skin: three of the vessel, part-filled.
 *
 * Drawn from the same `vesselPath` the board uses rather than as artwork. A
 * shipped image is a second thing to keep in step, and it would have been wrong
 * the first time a shape was adjusted — which is exactly the change a skin
 * exists to make.
 *
 * Filled to three different levels because an empty outline hides the thing
 * being sold. What differs between these skins is where the glass meets the
 * liquid: a flask's neck only reads as a neck once something is under it.
 */
export const SkinPreview = memo(function SkinPreview({
  vessel,
  width,
  height,
}: SkinPreviewProps) {
  const tubes = useMemo(() => {
    const gap = width * 0.08;
    const tubeWidth = (width - gap * (VIALS - 1)) / VIALS;
    const tubeHeight = Math.min(height, tubeWidth * 2.6);
    const top = (height - tubeHeight) / 2;

    return Array.from({ length: VIALS }, (_, index) => ({
      x: index * (tubeWidth + gap),
      y: top,
      width: tubeWidth,
      height: tubeHeight,
    }));
  }, [width, height]);

  const shapes = useMemo(
    () =>
      tubes.map((tube) => ({
        tube,
        path: vesselPath(tube, vessel),
        highlight: vesselHighlight(tube, vessel, tube.height / CAPACITY),
      })),
    [tubes, vessel]
  );

  if (width < 20 || height < 20) return null;

  return (
    <Canvas style={{ width, height }}>
      {shapes.map(({ tube, path, highlight }, index) => {
        const segment = tube.height / CAPACITY;
        const filled = FILL[index]!;

        return (
          <Group key={index}>
            <Path path={path} color={colours.white} opacity={0.08} />

            <Group clip={path}>
              <Rect
                x={tube.x}
                y={tube.y + tube.height - filled * segment}
                width={tube.width}
                height={filled * segment}
                color={TINTS[index]!}
              />
              {/* The bright lip, the same one the board draws. Without it the
                  liquid stops at a hard line and reads as a flat fill. */}
              <Rect
                x={tube.x}
                y={tube.y + tube.height - filled * segment}
                width={tube.width}
                height={2}
                color={colours.white}
                opacity={0.42}
              />
            </Group>

            <Path path={highlight} color={colours.white} opacity={0.45} />
            <Path
              path={path}
              style="stroke"
              strokeWidth={2}
              strokeJoin="round"
              color={ui.glassEdge}
            />
          </Group>
        );
      })}
    </Canvas>
  );
});
