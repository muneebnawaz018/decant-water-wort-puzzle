import { SKIN_PRICES } from '@/game/economy';
import {
  DEFAULT_SKIN,
  earnedAccess,
  SKINS,
  skinAccess,
  skinFor,
  skinsUnlockedBetween,
  type Vessel,
} from '../skins';

/**
 * The narrowest glass anywhere on a silhouette, as a fraction of the width.
 * Colourblind glyphs draw at 0.42 of the width, centred — glass tighter than
 * 0.46 clips the accessibility mark, with the 0.04 covering stroke width.
 */
function narrowestGlass(vessel: Vessel): number {
  switch (vessel.kind) {
    case 'tube':
      return 1;
    case 'cone':
    case 'orb':
    case 'pear':
      return vessel.mouth;
    case 'hourglass':
      return vessel.waist;
  }
}

describe('the skin catalogue', () => {
  it('leads with the default vessel', () => {
    expect(SKINS[0]!.id).toBe(DEFAULT_SKIN);
    expect(SKINS[0]!.unlock.kind).toBe('default');
  });

  it('gives every skin a distinct id', () => {
    expect(new Set(SKINS.map((skin) => skin.id)).size).toBe(SKINS.length);
  });

  /**
   * Skin ids are save format, the same way the generator is: `settings.skin`
   * holds one and `economy.owned` holds a list of them, and both records
   * outlive the build that wrote them. An equipped id that goes missing falls
   * back to the default glass — annoying, recoverable. A *purchased* id that
   * goes missing is worse: the coins are spent, the shelf shows nothing, and
   * `buy` would charge again for an item the player already owns.
   *
   * So ids may be added here, never changed or removed. If one ever has to
   * move, the fix is a rename map in the stores' load paths — and then this
   * pin is re-recorded, in that order.
   *
   * Re-recorded once, pre-release: the corner-radii catalogue's ids
   * (`skin.beaker`, `skin.flask`, `skin.ampoule`) were retired before any
   * build shipped, so no wild record can hold one and the fallback covers dev
   * installs. From the first store release, this list only grows.
   */
  it('pins the ids already in the wild', () => {
    expect(SKINS.map((skin) => skin.id)).toEqual([
      'skin.vial',
      'skin.conical',
      'skin.orb',
      'skin.potion',
      'skin.hourglass',
    ]);
  });

  /**
   * A stored id outlives the build that wrote it. Renaming a skin then means
   * every player holding the old id has an unknown one, and the board has to
   * draw *something* — falling back is what stops a rename from shipping a
   * screen with no glass on it.
   */
  it('falls back to the default for an id it does not know', () => {
    expect(skinFor('skin.gone').id).toBe(DEFAULT_SKIN);
    expect(skinFor('').id).toBe(DEFAULT_SKIN);
  });

  /**
   * The complaint that forced the silhouette rewrite, kept as a rule: five
   * variations on one tube read as one skin sold five times. Every skin gets
   * its own family — its own drawing code in `render/vessel.ts` — and a sixth
   * skin reusing a family needs to argue with this test first.
   */
  it('gives every skin its own silhouette family', () => {
    const kinds = SKINS.map((skin) => skin.vessel.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  /**
   * The renderer clamps these, but a skin that needs clamping is a skin drawn
   * wrong. Fractions of the tube's own box, so nothing may exceed one — and a
   * neck is measured against height and may not eat a whole segment.
   */
  it('keeps every vessel fraction inside its box', () => {
    const vessels = SKINS.map((skin) => skin.vessel);

    for (const vessel of vessels) {
      expect(narrowestGlass(vessel)).toBeLessThanOrEqual(1);
    }
    for (const vessel of vessels.filter(
      (v): v is Extract<Vessel, { kind: 'tube' }> => v.kind === 'tube'
    )) {
      expect(vessel.shoulder).toBeGreaterThanOrEqual(0);
      expect(vessel.shoulder).toBeLessThanOrEqual(0.5);
      expect(vessel.base).toBeGreaterThanOrEqual(0);
      expect(vessel.base).toBeLessThanOrEqual(0.5);
    }
    // A cone's neck may run a third of the height — the Erlenmeyer kink needs
    // a real neck above it — but a pear's may not eat a whole segment, or the
    // collar and shoulder swallow the top pour.
    for (const vessel of vessels.filter(
      (v): v is Extract<Vessel, { kind: 'cone' }> => v.kind === 'cone'
    )) {
      expect(vessel.neck).toBeGreaterThan(0);
      expect(vessel.neck).toBeLessThan(0.4);
    }
    for (const vessel of vessels.filter(
      (v): v is Extract<Vessel, { kind: 'pear' }> => v.kind === 'pear'
    )) {
      expect(vessel.neck).toBeGreaterThan(0);
      expect(vessel.neck).toBeLessThan(0.25);
    }
  });

  /**
   * The floor is a measurement, not taste, and it guards the colourblind
   * marks: glyphs draw at 0.42 of the tube's width, centred, so any glass
   * narrower than 0.46 — a mouth, a neck, a waist — clips the one signal a
   * colourblind player has. On a 13-tube board a tube is 29dp wide, and a
   * 0.34 mouth (the first ampoule shipped one) was a ~10dp sliver besides.
   */
  it('keeps every silhouette wide enough for the colourblind marks', () => {
    for (const { vessel } of SKINS) {
      expect(narrowestGlass(vessel)).toBeGreaterThanOrEqual(0.46);
    }
  });
});

describe('the tiers', () => {
  it('prices every coin skin, and only coin skins', () => {
    // A `coins` skin with no price is unsellable; a price for a free skin is
    // a number waiting to be charged by mistake. The two lists must match
    // exactly, and this is the only place they meet — `economy.ts` imports
    // nothing, by its own rule.
    const coinSkins = SKINS.filter((skin) => skin.unlock.kind === 'coins')
      .map((skin) => skin.id)
      .sort();
    expect(Object.keys(SKIN_PRICES).sort()).toEqual(coinSkins);
    for (const price of Object.values(SKIN_PRICES)) {
      expect(price).toBeGreaterThan(0);
    }
  });

  it('spaces the free ladder through the early game', () => {
    const levels = SKINS.flatMap((skin) =>
      skin.unlock.kind === 'level' ? [skin.unlock.level] : []
    );
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(new Set(levels).size).toBe(levels.length);
  });
});

describe('earnedAccess', () => {
  const conical = skinFor('skin.conical');
  const hourglass = skinFor('skin.hourglass');

  it('always unlocks the default', () => {
    expect(earnedAccess(skinFor(DEFAULT_SKIN), 1, [])).toEqual({ state: 'unlocked' });
  });

  it('gates a level skin on the furthest level, inclusive', () => {
    expect(earnedAccess(conical, 49, [])).toEqual({ state: 'locked', level: 50 });
    expect(earnedAccess(conical, 50, [])).toEqual({ state: 'unlocked' });
  });

  it('offers a coin skin for sale until it is owned', () => {
    expect(earnedAccess(hourglass, 9999, [])).toEqual({ state: 'forSale' });
    expect(earnedAccess(hourglass, 1, ['skin.hourglass'])).toEqual({ state: 'unlocked' });
  });

  it('lets ownership beat a level gate', () => {
    // A promotion or a support grant may put a level skin into `owned`; the
    // record wins, because ownership is never second-guessed.
    expect(earnedAccess(conical, 1, ['skin.conical'])).toEqual({ state: 'unlocked' });
  });
});

/**
 * `skinAccess` is `earnedAccess` plus the dev-build bypass, and the release
 * half is the one worth guarding: a cosmetic economy that ships with every
 * skin free is a silent revenue bug.
 *
 * This replaced a test that asserted a `TEST_UNLOCK_ALL_SKINS` constant
 * shipped `false` — permanently red while the shop was unlocked for
 * inspection, which blocked the pre-commit hook on every unrelated commit.
 * Proving both branches beats leaving a reminder nobody can act on.
 */
describe('skinAccess', () => {
  const conical = skinFor('skin.conical');

  /** Jest runs with `__DEV__` true, so the release path needs it swapped. */
  function withDev<T>(value: boolean, run: () => T): T {
    const globals = globalThis as { __DEV__?: boolean };
    const before = globals.__DEV__;
    globals.__DEV__ = value;
    try {
      return run();
    } finally {
      globals.__DEV__ = before;
    }
  }

  it('unlocks everything in a dev build, so skins can be seen on a board', () => {
    expect(withDev(true, () => skinAccess(conical, 1, []))).toEqual({ state: 'unlocked' });
  });

  it('applies the real gates in a release build', () => {
    expect(withDev(false, () => skinAccess(conical, 1, []))).toEqual({
      state: 'locked',
      level: 50,
    });
    expect(withDev(false, () => skinAccess(conical, 50, []))).toEqual({
      state: 'unlocked',
    });
  });
});

describe('skinsUnlockedBetween', () => {
  it('reports a threshold exactly once, on the crossing', () => {
    expect(skinsUnlockedBetween(49, 50).map((skin) => skin.id)).toEqual(['skin.conical']);
    expect(skinsUnlockedBetween(50, 51)).toEqual([]);
    expect(skinsUnlockedBetween(49, 49)).toEqual([]);
  });

  it('collects every threshold a long jump crosses', () => {
    // The hint sweep solves million-level boards; a first completion there
    // crosses the whole ladder at once.
    expect(skinsUnlockedBetween(1, 1_000_000).map((skin) => skin.id)).toEqual([
      'skin.conical',
      'skin.orb',
      'skin.potion',
    ]);
  });
});
