import { Canvas, Group, Path, Rect } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { colours, ui } from '@/theme/colors';
import type { Vessel } from '@/theme/skins';
import { FILL_HEADROOM } from './layout';
import {
  HIGHLIGHT_WIDTH,
  vesselCap,
  vesselHighlight,
  vesselOutline,
  vesselPath,
} from './vessel';

interface SkinPreviewProps {
  vessel: Vessel;
  width: number;
  height: number;
}

const VIALS = 3;
/** Fill levels, so the preview shows liquid meeting the glass at three heights. */
const FILL = [3, 2, 4] as const;
const CAPACITY = 4;

/**
 * The board's own segment aspect, from `render/layout.ts`. A vial there is
 * `capacity / SEGMENT_ASPECT` times as tall as it is wide — near enough four
 * to one — and the preview has to match it or it is not a preview.
 */
const SEGMENT_ASPECT = 1.05;

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
    /**
     * **Sized from the height, not the width.** Filling the card's width and
     * capping the height at 2.6x was the obvious way round and drew every
     * skin at roughly half its true proportions: the board renders a vial at
     * `capacity / SEGMENT_ASPECT` — 3.8:1 at capacity four — and the card was
     * showing 1.9:1. At that squat aspect a rounded base swallows the body and
     * every vessel reads as the same blob, which is the one thing a shop
     * preview must not do.
     *
     * Deriving width from the height budget keeps the true ratio at any card
     * size, and the row is centred in whatever width is left over.
     */
    // Bottom-aligned with a sliver of headroom: the completed vial's stopper
    // straddles the rim, and at y = 0 the canvas would slice it off.
    const tubeHeight = height * 0.94;
    const tubeWidth = (tubeHeight * SEGMENT_ASPECT) / CAPACITY;
    const gap = tubeWidth * 0.34;
    const rowWidth = VIALS * tubeWidth + (VIALS - 1) * gap;
    const left = Math.max(0, (width - rowWidth) / 2);

    return Array.from({ length: VIALS }, (_, index) => ({
      x: left + index * (tubeWidth + gap),
      y: height - tubeHeight,
      width: tubeWidth,
      height: tubeHeight,
    }));
  }, [width, height]);

  const shapes = useMemo(
    () =>
      tubes.map((tube, index) => ({
        tube,
        path: vesselPath(tube, vessel),
        outline: vesselOutline(tube, vessel),
        // The full vial wears the stopper, exactly as it would on the board —
        // the card previews the reward state as well as the glass.
        cap: FILL[index] === CAPACITY ? vesselCap(tube, vessel) : null,
        highlight: vesselHighlight(tube, vessel),
      })),
    [tubes, vessel]
  );

  if (width < 20 || height < 20) return null;

  return (
    <Canvas style={{ width, height }}>
      {shapes.map(({ tube, path, outline, cap, highlight }, index) => {
        const segment = tube.height / (CAPACITY + FILL_HEADROOM);
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

            <Path
              path={highlight}
              style="stroke"
              strokeWidth={tube.width * HIGHLIGHT_WIDTH}
              strokeCap="round"
              strokeJoin="round"
              color={colours.white}
              opacity={0.45}
            />
            {/* Open at the mouth, like the board: the stroke stops at the rim
                and only a completed vial is closed — by its stopper. */}
            <Path
              path={outline}
              style="stroke"
              strokeWidth={2}
              strokeJoin="round"
              strokeCap="round"
              color={ui.glassEdge}
            />
            {cap ? (
              <>
                {/* The stopper wears its liquid's colour, exactly as it does
                    on the board. */}
                <Path path={cap} color={TINTS[index]!} />
                <Path
                  path={cap}
                  style="stroke"
                  strokeWidth={1.5}
                  strokeJoin="round"
                  color={ui.shadow}
                  opacity={0.55}
                />
              </>
            ) : null}
          </Group>
        );
      })}
    </Canvas>
  );
});
