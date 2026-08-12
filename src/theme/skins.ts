/**
 * Vessel skins — the shape of the glass the puzzle is played in.
 *
 * Spec §4.7 is explicit that nothing bought here may affect play, and a
 * silhouette cannot: capacity, colours, generation and par are all untouched.
 * What changes is the outline the liquid is clipped to.
 *
 * **Shape, not colour.** The shop used to sell "Ocean glass" and "Berry glass",
 * which were palettes — and a palette is the one cosmetic this game cannot
 * sell. Board colours are picked for separation and pinned by a test that
 * fails if any two come within ΔE 30; letting a purchase repaint them would put
 * an accessibility guarantee behind a paywall, and the colourblind glyphs are
 * index-aligned to that same order. A different vessel is free of all of it.
 *
 * The catalogue, its tiers and every geometry number come from
 * `docs/05-skins.md` — the design pack distilled from the genre study. The
 * short version: silhouette is the whole skin (a recolour is invisible), free
 * shapes unlock by progression because that is the genre's retention pattern,
 * and paid shapes are the coin sink the economy audit called for.
 *
 * Kept free of React and Skia so the geometry can be unit-tested. The renderer
 * turns these numbers into a path; nothing here knows what a canvas is.
 * Prices are deliberately NOT here — `SKIN_PRICES` in `src/game/economy.ts` is
 * the one file allowed to hold a coin figure.
 */

/**
 * A vessel's silhouette: a family, plus that family's own numbers, every value
 * a fraction of the tube's box.
 *
 * A discriminated union, not one bag of corner radii. The first catalogue was
 * four radii on the same straight tube, and the shop got caught selling five
 * copies of one shape with different corners — a skin players can tell apart
 * needs a different *family* of glass, which is different drawing code in
 * `render/vessel.ts`, not different inputs to the same walls. One family per
 * skin, and the catalogue test holds that no two skins share one.
 *
 * Fractions rather than dp because the board sizes tubes from the space it is
 * given — a 12-tube fiendish board on a phone and a 4-tube board on an iPad
 * are the same shape at very different sizes, and a skin that held absolute
 * numbers would be a different object on each.
 *
 * **The narrowest glass in any family stays at or above `0.46` of the width.**
 * Colourblind glyphs draw at `0.42` of the width, centred, and clip against
 * anything tighter — the catalogue test pins the floor per family.
 */
export type Vessel =
  /** Straight walls. Corner radii at the mouth and base, nothing else. */
  | { kind: 'tube'; shoulder: number; base: number }
  /**
   * Erlenmeyer flask: straight neck of `mouth` width and `neck` height, then
   * walls slanting straight out to a full-width, near-flat base.
   */
  | { kind: 'cone'; mouth: number; neck: number }
  /**
   * Round-bottom flask: a spherical bulb one tube-width tall, under a long
   * neck of `mouth` width. The neck's height falls out of the geometry — it
   * runs from the lip to wherever it meets the circle.
   */
  | { kind: 'orb'; mouth: number }
  /**
   * Potion bottle: collar ring at the top, a neck of `mouth` width and `neck`
   * height, and a pear body swelling to full width low on the tube.
   */
  | { kind: 'pear'; mouth: number; neck: number }
  /** Hourglass: two full-width chambers pinched to `waist` at half height. */
  | { kind: 'hourglass'; waist: number };

/**
 * How a skin is obtained.
 *
 * - `default` ships equipped.
 * - `level` unlocks itself when the player's furthest level across all modes
 *   reaches the threshold. Derived from progress, never written to
 *   `economy.owned` — a restored device keeps its unlocks with no migration.
 * - `coins` is bought in the shop at the price `SKIN_PRICES` quotes, and the
 *   purchase is what lands in `economy.owned`.
 */
type SkinUnlock =
  { kind: 'default' } | { kind: 'level'; level: number } | { kind: 'coins' };

export interface Skin {
  id: string;
  name: string;
  /** One line in the shop. What the glass is, not what it costs. */
  blurb: string;
  vessel: Vessel;
  unlock: SkinUnlock;
}

/**
 * The straight-sided apothecary vial the game shipped with.
 *
 * Square shoulders at the open mouth, deeply rounded base — a tube rounded on
 * all four corners reads as a pill rather than as glassware.
 */
const VIAL: Vessel = { kind: 'tube', shoulder: 0, base: 0.5 };

/**
 * The lab triangle. The neck is a third of the height on purpose: at the
 * board's ~4:1 tube a short neck left the slant running nearly the full
 * height, which read as a tapered tube rather than as an Erlenmeyer — the
 * flask is the *kink* between neck and cone, and the kink needs a real neck
 * above it to exist.
 */
const CONICAL: Vessel = { kind: 'cone', mouth: 0.5, neck: 0.3 };

/** A sphere under a long thin neck — the chemistry-set boiling flask. */
const ORB: Vessel = { kind: 'orb', mouth: 0.48 };

/** Pear body, short neck, the collar ring a cork seats against. */
const POTION: Vessel = { kind: 'pear', mouth: 0.5, neck: 0.2 };

/** Chambers pinched at half height. The waist sits on the 0.46 glyph floor. */
const HOURGLASS: Vessel = { kind: 'hourglass', waist: 0.46 };

/**
 * The catalogue, in shop order: the default, the free ladder, then the shop.
 *
 * Level thresholds sit at 50 / 150 / 300 — far enough apart that each unlock
 * lands in a different phase of the game, near enough that the second is
 * visible from the first. The thresholds are data here rather than constants
 * elsewhere because they are part of what a skin *is*, the same way its
 * geometry is.
 *
 * Ids may be added, never changed or removed — they are save format
 * (`settings.skin`, `economy.owned`), and `skins.test.ts` pins them. The
 * corner-radii catalogue's ids (`skin.beaker`, `skin.flask`, `skin.ampoule`)
 * were retired pre-release, before any build shipped: an id from a dev install
 * falls back to the default glass, and nothing was ever bought under one.
 */
export const SKINS: readonly Skin[] = [
  {
    id: 'skin.vial',
    name: 'Apothecary vial',
    blurb: 'Square shoulders, rounded base',
    vessel: VIAL,
    unlock: { kind: 'default' },
  },
  {
    id: 'skin.conical',
    name: 'Conical flask',
    blurb: 'Slant walls, wide flat base',
    vessel: CONICAL,
    unlock: { kind: 'level', level: 50 },
  },
  {
    id: 'skin.orb',
    name: 'Round flask',
    blurb: 'A glass bulb under a long neck',
    vessel: ORB,
    unlock: { kind: 'level', level: 150 },
  },
  {
    id: 'skin.potion',
    name: 'Potion bottle',
    blurb: 'Pear body, collared neck',
    vessel: POTION,
    unlock: { kind: 'level', level: 300 },
  },
  {
    id: 'skin.hourglass',
    name: 'Hourglass',
    blurb: 'Twin chambers, pinched waist',
    vessel: HOURGLASS,
    unlock: { kind: 'coins' },
  },
];

export const DEFAULT_SKIN = SKINS[0]!.id;

/**
 * The skin for an id, falling back to the default.
 *
 * A stored id outlives the build that wrote it, so an unknown one is a skin
 * that was renamed or dropped rather than a bug to throw on. Falling back
 * shows the default glass; throwing would show no board at all.
 */
export function skinFor(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? SKINS[0]!;
}

/** What the shop can do with a skin, given this player's progress and wallet. */
export type SkinAccess =
  /** Equippable now: the default, a reached level unlock, or a purchase. */
  | { state: 'unlocked' }
  /** Level gate not reached yet. The level is for the row to print. */
  | { state: 'locked'; level: number }
  /** Priced in coins and not yet owned. */
  | { state: 'forSale' };

/**
 * Pure, so the rule is testable without a store: `furthest` is the highest
 * level reached across all modes (the same number the daily brew reads), and
 * `owned` is `economy.owned`.
 *
 * `owned` is checked for every kind, not just `coins` — if a level-gated skin
 * ever ends up in someone's purchase list (a promotion, a support grant), the
 * record wins over the gate. Ownership is never second-guessed.
 */
export function earnedAccess(
  skin: Skin,
  furthest: number,
  owned: readonly string[]
): SkinAccess {
  if (owned.includes(skin.id)) return { state: 'unlocked' };
  switch (skin.unlock.kind) {
    case 'default':
      return { state: 'unlocked' };
    case 'level':
      return furthest >= skin.unlock.level
        ? { state: 'unlocked' }
        : { state: 'locked', level: skin.unlock.level };
    case 'coins':
      return { state: 'forSale' };
  }
}

/**
 * What the shop shows: the real rule in a release build, everything unlocked
 * in a dev one.
 *
 * **Tied to `__DEV__` rather than to a hand-flipped constant, and that is the
 * point.** This started as `TEST_UNLOCK_ALL_SKINS = true` with a test
 * asserting it shipped `false` — a deliberately red suite as a reminder to
 * turn it back off. That is a bad trade: the suite is in the pre-commit hook,
 * so one permanent failure blocks every unrelated commit and teaches everyone
 * to read red as normal. A reminder nobody can act on without disabling the
 * gate is not a reminder.
 *
 * `__DEV__` removes the decision. A release build cannot have skins unlocked,
 * because there is no flag to forget — while a simulator build still shows all
 * five without grinding to level 300 or farming 1,500 coins.
 *
 * Read at call time, not module scope, so the release path is testable.
 *
 * The bypass covers the level gate *and* the shop, so nothing in a dev build
 * exercises the purchase flow. Test that in a release build.
 */
export function skinAccess(
  skin: Skin,
  furthest: number,
  owned: readonly string[]
): SkinAccess {
  if (__DEV__) return { state: 'unlocked' };
  return earnedAccess(skin, furthest, owned);
}

/**
 * Level-gated skins whose threshold sits inside `(before, after]` — the ones
 * a completion just unlocked.
 *
 * `furthestLevel` only ever advances, so calling this where progress is
 * recorded toasts each unlock exactly once with nothing stored: the crossing
 * itself is the once-only event.
 */
export function skinsUnlockedBetween(before: number, after: number): Skin[] {
  return SKINS.filter(
    (skin) =>
      skin.unlock.kind === 'level' &&
      skin.unlock.level > before &&
      skin.unlock.level <= after
  );
}
