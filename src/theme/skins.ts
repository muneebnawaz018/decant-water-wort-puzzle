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
 * Kept free of React and Skia so the geometry can be unit-tested. The renderer
 * turns these numbers into a path; nothing here knows what a canvas is.
 */

/**
 * A vessel's silhouette, every value a fraction of the tube's own box.
 *
 * Fractions rather than dp because the board sizes tubes from the space it is
 * given — a 12-tube fiendish board on a phone and a 4-tube board on an iPad are
 * the same shape at very different sizes, and a skin that held absolute numbers
 * would be a different object on each.
 */
export interface Vessel {
  /** Corner radius at the mouth, as a fraction of width. 0 is a square lip. */
  shoulder: number;
  /** Corner radius at the base, as a fraction of width. */
  base: number;
  /** How wide the mouth is relative to the body. 1 is no neck at all. */
  mouth: number;
  /** Height of the neck, as a fraction of the tube's height. */
  neck: number;
}

export interface Skin {
  id: string;
  name: string;
  /** One line in the shop. What the glass is, not what it costs. */
  blurb: string;
  vessel: Vessel;
}

/**
 * The straight-sided apothecary vial the game shipped with.
 *
 * Square shoulders at the open mouth, deeply rounded base — a tube rounded on
 * all four corners reads as a pill rather than as glassware.
 */
const VIAL: Vessel = { shoulder: 0, base: 0.5, mouth: 1, neck: 0 };

/**
 * The catalogue: one vessel, the one every player starts in.
 *
 * **Nothing is for sale here yet, and the alternatives are gone rather than
 * greyed out.** The shop shipped four shapes — a flask, a beaker, an ampoule —
 * with the last two behind a "coming soon" veil and the flask equippable. That
 * was three promises on a screen that could keep none of them: nothing reads
 * `economyStore.owned`, so a purchase would have taken the coins and changed
 * no pixel, and a row that is permanently arriving later teaches a player to
 * ignore the shop.
 *
 * An array rather than a constant because the shape of this is right and only
 * its length is temporary. The renderer, the setting and the stored id all work
 * the same at one entry as at four, so restoring the catalogue is a matter of
 * adding vessels back — the geometry for the other three is in this file's
 * history, and the prices are in `game/economy.ts` with everything else.
 */
export const SKINS: readonly Skin[] = [
  {
    id: 'skin.vial',
    name: 'Apothecary vial',
    blurb: 'Square shoulders, rounded base',
    vessel: VIAL,
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
