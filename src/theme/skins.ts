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

import { SKIN_PRICES } from '@/game/economy';

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
  /**
   * Price in coins, or `null` for the two that ship unlocked.
   *
   * Two free skins rather than one, on purpose: with a single default there is
   * nothing to switch *between*, so the shop's first job would be selling
   * before the player has ever seen the feature work. Two means the control is
   * real from the first launch, and a locked row then reads as more of
   * something known rather than as a promise.
   */
  price: number | null;
}

/**
 * The straight-sided apothecary vial the game shipped with.
 *
 * Square shoulders at the open mouth, deeply rounded base — a tube rounded on
 * all four corners reads as a pill rather than as glassware.
 */
const VIAL: Vessel = { shoulder: 0, base: 0.5, mouth: 1, neck: 0 };

/**
 * A round-bottomed flask: narrow neck, shoulders flaring into a full body.
 *
 * The neck is deliberately shallow — 12% of the height, about half a segment.
 * Deeper looked better empty and worse full, because the top segment is the one
 * the player is comparing when they decide where to pour, and squeezing it into
 * a stem makes two segments of one colour hard to read as two.
 */
const FLASK: Vessel = { shoulder: 0.16, base: 0.5, mouth: 0.5, neck: 0.12 };

/** A straight-walled beaker: rounded lip, flat base. Locked. */
const BEAKER: Vessel = { shoulder: 0.3, base: 0.12, mouth: 1, neck: 0 };

/** A sealed ampoule: long drawn neck, teardrop body. Locked. */
const AMPOULE: Vessel = { shoulder: 0.5, base: 0.5, mouth: 0.34, neck: 0.2 };

/**
 * The catalogue, in shop order.
 *
 * Prices carry over from the palette skins they replace, and they are a ladder
 * rather than a flat rate because they are priced against what the game pays:
 * The numbers are in `game/economy.ts` with every other price, so the shop can
 * be repriced without opening this file — what lives here is the artwork each
 * price buys.
 */
export const SKINS: readonly Skin[] = [
  {
    id: 'skin.vial',
    name: 'Apothecary vial',
    blurb: 'Square shoulders, rounded base',
    vessel: VIAL,
    price: SKIN_PRICES['skin.vial'] ?? null,
  },
  {
    id: 'skin.flask',
    name: 'Round flask',
    blurb: 'Narrow neck, full body',
    vessel: FLASK,
    price: SKIN_PRICES['skin.flask'] ?? null,
  },
  {
    id: 'skin.beaker',
    name: 'Lab beaker',
    blurb: 'Straight walls, flat base',
    vessel: BEAKER,
    price: SKIN_PRICES['skin.beaker'] ?? null,
  },
  {
    id: 'skin.ampoule',
    name: 'Sealed ampoule',
    blurb: 'Drawn neck, teardrop body',
    vessel: AMPOULE,
    price: SKIN_PRICES['skin.ampoule'] ?? null,
  },
];

export const DEFAULT_SKIN = SKINS[0]!.id;

/** The free ones, which every player has without buying anything. */
export function isFreeSkin(id: string): boolean {
  return SKINS.some((skin) => skin.id === id && skin.price === null);
}

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
