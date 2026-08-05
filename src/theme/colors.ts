/**
 * Every colour in the app. Nothing else may hold a hex or an `rgba()` string.
 *
 * The rule exists because near-duplicates are invisible in review and obvious
 * on screen: the audit that produced this file found the gift chip painted
 * `#FF8A2E` next to a liquid segment of `#FF8A1E`, and the accent green
 * living at three different alphas that were meant to be one.
 *
 * Transparency comes from `alpha()`, never from a second hand-written string.
 * That way a tweak to a base colour carries to every translucent use of it.
 */

/** The raw palette. One entry per colour that actually exists in the design. */
const raw = {
  // Ground and chrome, spec §3.
  night: '#2A1758',
  nightDeep: '#150A34',
  panel: '#3A2670',
  panelTop: '#4A3488',

  ink: '#F4ECFF',
  inkMuted: '#B7A6E6',

  gold: '#FFC94B',
  goldLight: '#FFDE86',
  goldDark: '#B7801C',
  /**
   * Wordmark gradient stops, spec §3. `goldPale` doubles as the coin's
   * highlight and `goldDark` as its shade — they were separate entries within
   * dE 5 of these, which is a difference no one can see and everyone can
   * forget to keep in sync.
   */
  goldPale: '#FFEFB4',
  goldSheen: '#FFD170',
  goldBronze: '#E7A32E',
  /** Text and glyphs printed *on* gold — the only dark ink in the app. */
  onGold: '#3a2306',

  // The action green, light to dark. The button face is a ramp through it.
  greenLight: '#6BEE93',
  green: '#43CE72',
  greenDeep: '#33BC61',
  /** Flat accent: switches, progress fills, selection. */
  accent: '#37D26B',
  accentDark: '#1C9647',
  /** Green legible on a dark translucent chip. */
  accentBright: '#7BF0A6',

  white: '#FFFFFF',
  black: '#000000',
  /** Toast and scrim, near-black with the ground's purple in it. */
  soot: '#0A051A',
  /** Shadow cast by the primary button's own colour. */
  greenShadow: '#003C14',

  // Liquid colours, spec §3. Also used for chips, tabs and shop swatches —
  // there is one palette, not a UI palette and a game palette.
  coral: '#FF4242',
  mango: '#FF8A1E',
  plum: '#A24DFF',
  lime: '#A6E82A',
  aqua: '#22C9EC',
  rose: '#FF4FA6',
  blueberry: '#3B7BFF',
  grape: '#7B3FF2',
  tangerine: '#FFCE1F',
  teal: '#14C7B2',
  /**
   * Slots eleven and twelve. Spec §3 names only ten, and the ten already fill
   * the bright end of the hue wheel — so these sit lower in lightness rather
   * than squeezing between hues that are already adjacent. The near-white
   * `chalk` they replace was dE 3 from the text colour and dE 8 from the glass
   * highlights, which made it unreadable as a liquid on a dark board.
   */
  fern: '#00902D',
  olive: '#5A6C12',

  /** Lighter siblings, for gradients that start above their base colour. */
  mangoLight: '#FFB05A',
  blueberryLight: '#5AA9FF',

  /** The warm lamp hanging above the scene, spec §3. */
  lamp: '#FFBE64',

  /** The emboss under the wordmark — the shadow a gold letter casts on gold. */
  goldEmboss: '#5A3200',
} as const;

export type ColourName = keyof typeof raw;

/**
 * A palette colour at partial opacity.
 *
 * Takes a name rather than a hex so a caller cannot smuggle in a literal, and
 * so renaming a colour breaks the build instead of leaving orphans behind.
 */
export function alpha(name: ColourName, opacity: number): string {
  const value = parseInt(raw[name].slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const clamped = opacity < 0 ? 0 : opacity > 1 ? 1 : opacity;
  return `rgba(${r},${g},${b},${clamped})`;
}

/** Fully transparent, for the far stop of a fading gradient. */
export function fade(name: ColourName): string {
  return alpha(name, 0);
}

export const colours = raw;

/**
 * A glyph colour that stays legible on a given fill, doc §9.
 *
 * A fixed white mark disappears on `lime` and `tangerine` — both above L* 84 —
 * which quietly breaks the one feature colourblind players depend on. Uses
 * relative luminance, the same measure WCAG contrast is built on.
 */
export function glyphOn(fill: string): string {
  const value = parseInt(fill.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel((value >> 16) & 0xff) +
    0.7152 * channel((value >> 8) & 0xff) +
    0.0722 * channel(value & 0xff);

  return luminance > 0.45 ? alpha('night', 0.85) : alpha('white', 0.92);
}

/**
 * Semantic names. Components use these; `colours` is for the rare case where
 * a raw palette entry is genuinely what is meant (a liquid, a swatch).
 */
export const ui = {
  // Background
  ground: raw.night,
  groundDeep: raw.nightDeep,
  lamp: alpha('lamp', 0.16),
  lampFade: fade('lamp'),
  // The magenta wash is plum, not a colour of its own — they were separate
  // entries with identical values, which is exactly how two things that must
  // match drift apart.
  wash: alpha('plum', 0.28),
  washFade: fade('plum'),
  mote: raw.goldPale,

  // Panels
  panel: raw.panel,
  panelTop: raw.panelTop,
  /** Hairline border, and the 1px gloss along a panel's top edge. */
  line: alpha('white', 0.1),
  /** Divider between rows inside a panel. */
  divider: alpha('white', 0.07),
  /** Recessed wells: progress tracks, segmented controls, icon squares. */
  well: alpha('black', 0.24),
  wellDeep: alpha('black', 0.28),

  /** The offset copy behind the wordmark's glyphs (spec §3's drop shadow). */
  emboss: raw.goldEmboss,

  // Text
  ink: raw.ink,
  inkMuted: raw.inkMuted,
  onGold: raw.onGold,
  onAccent: raw.white,

  // Glass, spec §3
  glassFill: alpha('white', 0.08),
  glassEdge: alpha('white', 0.32),
  glassShine: alpha('white', 0.75),
  /** The bright lip where liquid meets air. */
  meniscus: alpha('white', 0.45),

  // Buttons
  buttonFace: [raw.greenLight, raw.green, raw.greenDeep] as const,
  buttonEdge: alpha('white', 0.4),
  buttonGloss: alpha('white', 0.5),
  buttonTextShadow: alpha('greenShadow', 0.3),
  ghost: alpha('white', 0.1),

  // Accent
  accent: raw.accent,
  accentBright: raw.accentBright,
  /** Tinted chip behind an accent glyph. */
  accentWash: alpha('accent', 0.2),

  // Gold
  gold: raw.gold,
  goldLight: raw.goldLight,
  goldDark: raw.goldDark,
  goldEdge: alpha('gold', 0.55),
  goldGloss: alpha('white', 0.5),

  // Overlays
  scrim: alpha('soot', 0.6),
  toast: alpha('soot', 0.94),

  // Shadow
  shadow: raw.black,

  // States
  disabledTrack: alpha('white', 0.16),
  emptyStar: alpha('white', 0.2),
  ghostStar: alpha('white', 0.14),
} as const;

/** Chip and tile gradients, so two components never invent the same pair. */
export const gradients = {
  panel: [raw.panelTop, raw.panel] as const,
  gold: [raw.goldLight, raw.gold] as const,
  goldShelf: [raw.goldLight, raw.goldDark] as const,
  coin: [raw.goldPale, raw.gold, raw.goldDark] as const,
  wordmark: [raw.goldPale, raw.goldSheen, raw.goldBronze] as const,
  /** The nav bar sits slightly translucent over the ground. */
  navBar: [alpha('panelTop', 0.85), alpha('panel', 0.9)] as const,
  /** Reward chips. */
  gift: [raw.mangoLight, raw.mango] as const,
  advert: [raw.blueberryLight, raw.blueberry] as const,
  /** The Continue card's progress bar. */
  progress: [raw.accent, raw.aqua] as const,
  /** Splash vial. */
  splash: [raw.aqua, raw.blueberry] as const,
} as const;
