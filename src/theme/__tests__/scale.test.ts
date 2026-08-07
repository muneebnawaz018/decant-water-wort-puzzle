import { Dimensions } from 'react-native';

/**
 * `scale.ts` reads the window once, at module scope — that is the whole design,
 * and it means a test cannot change the device by setting a variable. Each case
 * mocks `Dimensions` first and then imports the module fresh.
 */
const loadScaleFor = (width: number, height: number): typeof import('../scale') => {
  jest.resetModules();
  jest.spyOn(Dimensions, 'get').mockReturnValue({
    width,
    height,
    scale: 3,
    fontScale: 1,
  });
  // `require`, not `import()` — the module has to be re-evaluated after the
  // mock is in place, and a dynamic import is hoisted and cached before it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../scale');
};

// Measured off the simulators, not quoted from a spec sheet.
const IPHONE_17 = [402, 874] as const;
// The narrowest phone still worth holding the line on: if `s()` ever stopped
// being the identity, the smallest screen is where it would hurt first.
const IPHONE_SE = [375, 667] as const;
const PIXEL_8 = [412, 915] as const;
const IPAD_MINI = [744, 1133] as const;
const IPAD_PRO = [1024, 1366] as const;

afterEach(() => {
  jest.restoreAllMocks();
});

describe('scale', () => {
  describe('phones are untouched', () => {
    // The point of the whole module. A tablet regression costs a listing on a
    // form factor nobody has installed yet; a phone regression costs the app.
    it.each([
      ['iPhone 17 Pro', IPHONE_17],
      ['iPhone SE', IPHONE_SE],
      ['Pixel 8', PIXEL_8],
    ])('returns its input unchanged on %s', (_name, [width, height]) => {
      const { s, isTablet } = loadScaleFor(width, height);

      expect(isTablet).toBe(false);
      for (const value of [0, 1, 0.5, 9, 13.5, 24, 46, 74, 150, 214]) {
        expect(s(value)).toBe(value);
      }
    });
  });

  describe('tablets scale up', () => {
    it('grows every value on an iPad mini', () => {
      const { s, isTablet } = loadScaleFor(...IPAD_MINI);

      expect(isTablet).toBe(true);
      expect(s(100)).toBeGreaterThan(100);
    });

    it('caps the multiplier rather than tracking width', () => {
      // A 1024pt iPad is 2.6x the 390pt baseline. Scaling type by that turns a
      // settings row into a billboard, so the factor is clamped.
      const { s } = loadScaleFor(...IPAD_PRO);

      expect(s(100)).toBeLessThanOrEqual(145);
      expect(s(100)).toBeGreaterThan(100);
    });

    it('does not scale a 12.9in iPad more than a 11in one', () => {
      const big = loadScaleFor(...IPAD_PRO);
      const small = loadScaleFor(834, 1194);

      expect(big.s(100)).toBe(small.s(100));
    });

    it('keeps zero at zero', () => {
      const { s } = loadScaleFor(...IPAD_PRO);

      expect(s(0)).toBe(0);
    });
  });

  describe('the tablet threshold', () => {
    it('treats a 600dp shortest side as a tablet', () => {
      // Android's own sw600dp breakpoint, so the two platforms agree.
      const { isTablet } = loadScaleFor(600, 960);

      expect(isTablet).toBe(true);
    });

    it('treats 599dp as a phone', () => {
      const { isTablet } = loadScaleFor(599, 960);

      expect(isTablet).toBe(false);
    });

    it('measures the shortest side, not the width', () => {
      // A landscape phone is still a phone. Reading `width` alone would scale
      // a rotated iPhone up as though it were an iPad.
      const { isTablet } = loadScaleFor(852, 393);

      expect(isTablet).toBe(false);
    });
  });

  describe('columnsFor', () => {
    it('returns the phone fallback untouched below the threshold', () => {
      const { columnsFor } = loadScaleFor(...IPHONE_17);

      expect(columnsFor(345, 76, 14, 4)).toBe(4);
    });

    it('fits more columns on a tablet', () => {
      const { columnsFor } = loadScaleFor(...IPAD_PRO);

      expect(columnsFor(944, 110, 20, 4)).toBeGreaterThan(4);
    });

    it('never drops below the fallback', () => {
      // A narrow tablet window must not produce a one-column stage grid.
      const { columnsFor } = loadScaleFor(...IPAD_MINI);

      expect(columnsFor(200, 300, 14, 4)).toBe(4);
    });
  });

  describe('v() compresses vertical rhythm on short screens only', () => {
    // The counterpart to "phones are untouched": `v()` is allowed to differ
    // between phones — that is its whole reason to exist — so the guarantee it
    // has to keep instead is that it never *grows* anything.
    it.each([
      ['iPhone 17 Pro', IPHONE_17],
      ['Pixel 8', PIXEL_8],
    ])('leaves a tall phone alone on %s', (_name, [width, height]) => {
      const { s, v } = loadScaleFor(width, height);

      for (const value of [6, 8, 12, 20, 24, 28, 150]) {
        expect(v(value)).toBe(s(value));
      }
    });

    it('shrinks on a short phone', () => {
      const { v } = loadScaleFor(...IPHONE_SE);

      expect(v(150)).toBeLessThan(150);
      expect(v(24)).toBeLessThan(24);
    });

    it('never falls below four-fifths, however short the screen', () => {
      // Past this the gaps stop reading as gaps and separate blocks merge.
      const { v } = loadScaleFor(320, 480);

      expect(v(100)).toBeGreaterThanOrEqual(80);
    });

    it('never grows a value', () => {
      const devices: ReadonlyArray<readonly [number, number]> = [
        IPHONE_17,
        IPHONE_SE,
        PIXEL_8,
        IPAD_MINI,
        IPAD_PRO,
      ];

      for (const [width, height] of devices) {
        const { s, v } = loadScaleFor(width, height);

        expect(v(100)).toBeLessThanOrEqual(s(100));
      }
    });

    it('applies the tablet factor once, not twice', () => {
      // `v()` calls `s()` internally. Passing it an already-scaled token would
      // square the factor, which is a silent 2x on an iPad.
      const { s, v } = loadScaleFor(...IPAD_PRO);

      expect(v(24)).toBe(s(24));
    });
  });
});

describe('the splash vial is not scaled', () => {
  /**
   * `assets/splash-icon.png` is drawn at a fixed dp size by the OS on every
   * device. If the React vial scaled and the native one did not, the handoff
   * the two splashes were built around would jump — on tablets only, which is
   * exactly where nobody would look for it.
   */
  it('keeps the shared numbers free of any device dependency', () => {
    const onPhone = loadScaleFor(...IPHONE_17);
    const onTablet = loadScaleFor(...IPAD_PRO);

    // Both loads see the same module, since `splash.ts` imports nothing.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const splash = require('../splash') as typeof import('../splash');

    expect(onPhone.isTablet).toBe(false);
    expect(onTablet.isTablet).toBe(true);
    expect(splash.VIAL_WIDTH).toBe(54);
    expect(splash.VIAL_HEIGHT).toBe(150);
  });
});
