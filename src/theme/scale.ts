import { Dimensions, PixelRatio } from 'react-native';

/**
 * The one place that knows a tablet is wider than a phone.
 *
 * Every fixed dp in this app was written against a phone, and on a 1024pt iPad
 * the result reads as a phone screenshot pinned to the middle of a wall: a
 * 214dp hero rack, 10pt eyebrow labels and 42dp icon buttons floating in three
 * times the space they were drawn for. `s()` multiplies those numbers up so the
 * UI keeps the proportions it was designed with at the size the screen wants.
 *
 * The board is deliberately **not** part of this. `src/render/layout.ts`
 * already derives tube width, gap and radius from the box it is handed, so it
 * scales on its own and a second multiplier would double-count.
 *
 * ## Why this is read once, at module scope
 *
 * The alternative is a hook, which would mean every `Foo.styles.ts` becomes a
 * function of width and every screen rebuilds its styles on each render — and
 * the styles in this project are `StyleSheet.create` singletons precisely so
 * their identity is stable. The app is `orientation: 'portrait'` in
 * `app.config.ts`, so the width this reads cannot change under a rotation.
 *
 * The one case it does not cover is iPad Split View, where the app is handed a
 * narrower window after launch. That resizes the board (which measures) but
 * leaves the chrome at its launch scale until the app is relaunched. Accepted:
 * the alternative costs a re-render of every screen on every frame of a
 * split-view drag, for a case a portrait-only puzzle game barely meets.
 */

/**
 * Logical width of the phone the design was drawn against — iPhone 14/15.
 * Everything below is a ratio to this, so the numbers in the stylesheets stay
 * readable as "what it is on a phone".
 */
const BASELINE_WIDTH = 390;

/**
 * Shortest side, in dp, at or above which a device counts as a tablet. 600 is
 * Android's own `sw600dp` breakpoint and lands just under the smallest iPad
 * (744pt on the mini), so the two platforms agree on what a tablet is.
 */
const TABLET_MIN_WIDTH = 600;

/**
 * Ceiling on the multiplier. A 1024pt iPad is 2.6x the baseline width, and
 * scaling type by that turns a settings row into a billboard — past a point a
 * bigger screen should show a more comfortable UI, not a proportionally huge
 * one. 1.45 is the largest factor where the hero rack still reads as an object
 * on a shelf rather than as furniture.
 */
const MAX_SCALE = 1.45;

const window = Dimensions.get('window');
const shortestSide = Math.min(window.width, window.height);

/**
 * Window width at launch. Only grids need this — everything else expresses
 * itself in scaled dp and lets flex do the arithmetic. Same portrait-only
 * caveat as `SCALE` above.
 */
export const WINDOW_WIDTH = window.width;

/** True on tablets, false on every phone. */
export const isTablet = shortestSide >= TABLET_MIN_WIDTH;

/**
 * The multiplier `s()` applies. Exactly `1` on phones — not "about 1" — so a
 * phone build renders byte-identical styles to the ones this project already
 * shipped, and a regression here cannot reach the platform that matters most.
 */
const SCALE = isTablet ? Math.min(MAX_SCALE, shortestSide / BASELINE_WIDTH) : 1;

/**
 * Scale a phone-authored dp value for the current device.
 *
 * Snapped to the device pixel grid, because a scaled 0.5dp hairline that lands
 * between two physical pixels renders as a grey smear rather than a line.
 */
export const s = (value: number): number =>
  isTablet ? PixelRatio.roundToNearestPixel(value * SCALE) : value;

/**
 * How many columns a grid of `min`-wide tiles should use at the current width.
 *
 * The stage grid was a hardcoded `4`, which on an iPad produced 230dp tiles
 * carrying an 18pt number — the tiles grew but the content in them did not, so
 * the grid read as empty. Deriving the count instead keeps a tile near the size
 * it is on a phone and spends the extra width on more of them.
 */
export const columnsFor = (
  available: number,
  minTileWidth: number,
  gap: number,
  fallback: number
): number => {
  if (!isTablet) return fallback;
  const fit = Math.floor((available + gap) / (minTileWidth + gap));
  return Math.max(fallback, fit);
};
