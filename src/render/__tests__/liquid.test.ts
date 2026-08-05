import { colours } from '@/theme/colors';
import { LIQUID_SKSL, rgba } from '../liquid';

/**
 * The shader itself compiles on the GPU, so it cannot be executed here. These
 * guard the contract around it: the uniform names the renderer sets, and the
 * colour conversion feeding them.
 */
describe('liquid shader', () => {
  it('declares every uniform the renderer sets', () => {
    for (const uniform of ['origin', 'size', 'surface', 'amp', 'phase', 'fill']) {
      expect(LIQUID_SKSL).toContain(`uniform`);
      expect(LIQUID_SKSL).toMatch(new RegExp(`uniform\\s+\\w+\\s+${uniform}\\s*;`));
    }
  });

  it('returns premultiplied colour, as Skia runtime shaders require', () => {
    expect(LIQUID_SKSL).toContain('fill.rgb * alpha');
  });

  it('pins the wave at both walls', () => {
    // An unpinned wave slides through the glass instead of climbing it.
    expect(LIQUID_SKSL).toContain('envelope');
    expect(LIQUID_SKSL).toContain('sin(u * 3.14159265)');
  });
});

describe('rgba', () => {
  // Real palette entries, not invented hexes: this converter is what every
  // liquid colour passes through on its way to the shader, so the cases worth
  // pinning are the ones the app actually renders.
  it('converts a hex colour to 0..1 components', () => {
    expect(rgba(colours.white)).toEqual([1, 1, 1, 1]);
    expect(rgba(colours.black)).toEqual([0, 0, 0, 1]);
  });

  it('reads the channels in the right order', () => {
    // `mango` is the palette's one strictly-descending colour (FF/8A/1E), so
    // a swapped channel cannot slip through on a tie. `coral` cannot do this
    // job — its green and blue are equal.
    const [r, g, b] = rgba(colours.mango) as [number, number, number, number];
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('carries alpha through', () => {
    expect(rgba(colours.grape, 0.5)[3]).toBe(0.5);
  });
});
