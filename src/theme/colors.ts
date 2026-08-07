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

/**
 * One palette colour composited over another, flattened to an opaque hex.
 *
 * The chrome's stroke is `alpha('white', 0.1)`, which is a *border* everywhere
 * it appears — and a border paints over the view's own background, so it
 * resolves against the panel. Drawn instead as the background of a padded
 * wrapper (see `HAIRLINE`, which is how the strokes have to be built on
 * Android) the same colour resolves against the ground behind the card, and
 * comes out visibly darker. Flattening against the face it is meant to edge
 * keeps the two forms identical.
 *
 * Computed rather than written out, so moving `panel` moves the stroke with it.
 */
function blend(over: ColourName, base: ColourName, opacity: number): string {
  const parse = (hex: string): [number, number, number] => {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  };
  const [r1, g1, b1] = parse(raw[over]);
  const [r0, g0, b0] = parse(raw[base]);
  const t = opacity < 0 ? 0 : opacity > 1 ? 1 : opacity;
  const mix = (a: number, b: number): number => Math.round(b + (a - b) * t);
  const hex = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${hex(mix(r1, r0))}${hex(mix(g1, g0))}${hex(mix(b1, b0))}`;
}

/**
 * A palette colour lightened towards white by `amount` (0 keeps it, 1 is
 * white). Opaque, unlike `alpha` — a tint has to hold its own against whatever
 * sits behind it, and a translucent one picks up the backdrop's purple.
 *
 * Mixing in sRGB rather than a perceptual space on purpose. It is the cheaper
 * arithmetic and these are decorative steps, not colours anything is measured
 * against; `glyphOn` still does the real luminance work where legibility is at
 * stake.
 */
export function tint(name: ColourName, amount: number): string {
  const value = parseInt(raw[name].slice(1), 16);
  const clamped = amount < 0 ? 0 : amount > 1 ? 1 : amount;
  const towards = (channel: number): number =>
    Math.round(channel + (0xff - channel) * clamped);

  const r = towards((value >> 16) & 0xff);
  const g = towards((value >> 8) & 0xff);
  const b = towards(value & 0xff);
  return `rgb(${r},${g},${b})`;
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
  /**
   * `line`, flattened against the panel it edges.
   *
   * For a stroke built as a padded background instead of a `borderWidth` — see
   * `HAIRLINE`. Translucent there, it would resolve against the ground behind
   * the card and come out darker than the same stroke on iOS.
   */
  edge: blend('white', 'panel', 0.1),
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
  /**
   * The primary face is gold, not green.
   *
   * Green was the spec's action colour and it never belonged to this app: the
   * chrome, the wordmark, the coins, the active nav pill and the star ratings
   * are all gold, so the one control the player is meant to press was the only
   * element on screen that was not. Two accent colours on a dark purple ground
   * read as two different apps.
   *
   * Green survives where it means a *state* rather than an action — switches
   * that are on, progress that is filled — which is `accent`, below, and is
   * deliberately a separate token from this one.
   */
  buttonFace: [raw.goldLight, raw.gold, raw.goldBronze] as const,
  buttonEdge: alpha('goldPale', 0.55),
  /** `buttonEdge` as an opaque stroke over the gold face — see `edge`. */
  buttonEdgeOpaque: blend('goldPale', 'gold', 0.55),
  buttonGloss: alpha('white', 0.5),
  /** Dark ink on a light face, so the shadow lifts the glyph rather than blurs it. */
  buttonTextShadow: alpha('goldPale', 0.45),
  /**
   * The face of a button that cannot be pressed, stated rather than derived.
   *
   * Dimming with `opacity` was the obvious way and it does not survive two
   * platforms: the result depends on what is behind the button, on whether the
   * shadow fades with it — Android composites `elevation` separately — and on
   * how each renderer blends a translucent gradient. Daily's countdown came out
   * gold on Android and brown on iOS from one style.
   *
   * Opaque colours have none of those degrees of freedom. This is the gold ramp
   * mixed most of the way to the ground, which is what the 42% version was
   * trying to be.
   */
  /**
   * A primary button that cannot be pressed drops to the panel surface.
   *
   * Not the gold ramp faded, and not the gold ramp darkened — both were tried.
   * Fading depends on what is behind the button, on whether the platform fades
   * the shadow with it (Android does not), and on how each renderer blends a
   * translucent gradient, so Daily's countdown came out gold on Android and
   * brown on iOS. Darkening the ramp to opaque colours fixed the disagreement
   * and produced mud on both.
   *
   * A card surface has neither problem. It is opaque, it is already the app's
   * language for "this is a surface, not an action", and an inert control that
   * looks like a card is unambiguous in a way a dim gold button is not.
   */
  buttonFaceOff: [raw.panelTop, raw.panel] as const,
  /** Its label — the same muted ink every inactive thing in the app uses. */
  buttonLabelOff: raw.inkMuted,
  /**
   * The coloured glow a lit button casts, rather than the neutral drop shadow
   * every card gets.
   *
   * This is what "glossy" actually is on a dark ground: a black shadow under a
   * gold button only darkens the purple beneath it, so the button sits in a
   * hole. A gold one spills light instead, and the button reads as the source
   * of it.
   */
  buttonGlow: raw.gold,
  /**
   * The same glow pre-multiplied, for `boxShadow`.
   *
   * `shadowOpacity` is an iOS-only property, so the alpha has to live in the
   * colour for a shadow that both platforms draw. See `primaryShadow`.
   */
  buttonGlowSoft: alpha('gold', 0.5),
  /** The neutral drop shadow, likewise pre-multiplied. */
  shadowSoft: alpha('black', 0.3),
  /**
   * The division between segments on the drawer's vial mark.
   *
   * Darker than the 0.16 the board and Home's rack use for the same idea, and
   * deliberately so: those draw a tube 100dp tall where a whisper is enough,
   * this one is 24dp, where 0.16 measured out at an 8% shift against the fill
   * and vanished on the device. A seam that cannot be seen is not a seam.
   */
  segmentSeam: alpha('black', 0.34),
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
  /** `goldEdge` as an opaque stroke — see `edge`. */
  goldEdgeOpaque: blend('gold', 'panel', 0.55),
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
  /**
   * The specular sweep across a pressed-metal face.
   *
   * Two stops of white over the button's own gradient, cut off at 55% so the
   * shine has an edge rather than fading to nothing — a hard terminator is what
   * makes a surface read as polished instead of merely lighter at the top.
   */
  sheen: [alpha('white', 0.42), alpha('white', 0.06), alpha('white', 0)] as const,
  /**
   * The same sweep for a dark surface.
   *
   * A lit gold face can carry 42% white; a purple panel cannot — at that
   * strength it goes milky and reads as fog on the glass rather than as a
   * polished edge. Same hard terminator, a sixth of the light.
   */
  sheenSoft: [alpha('white', 0.16), alpha('white', 0.03), alpha('white', 0)] as const,
  goldShelf: [raw.goldLight, raw.goldDark] as const,
  coin: [raw.goldPale, raw.gold, raw.goldDark] as const,
  wordmark: [raw.goldPale, raw.goldSheen, raw.goldBronze] as const,
  /** The nav bar sits slightly translucent over the ground. */
  // Opaque, not translucent. The bar floats over the screens, so anything
  // less showed the grid tiles sliding through it as you scrolled.
  navBar: [raw.panelTop, raw.panel] as const,
  /**
   * Behind the nav bar, fading up into the screen. The bar itself is opaque, but
   * content still slid visibly into its top edge; this dissolves it first.
   */
  navFade: [fade('nightDeep'), raw.nightDeep] as const,
  /**
   * The settings drawer, raked rather than vertical.
   *
   * A diagonal ramp because the drawer is tall and narrow: a top-to-bottom
   * gradient over that shape banks all its change into the first third and
   * leaves the rest flat, which is the one place a large surface shows it.
   */
  drawer: [raw.panel, raw.nightDeep] as const,
  /** Reward chips. */
  gift: [raw.mangoLight, raw.mango] as const,
  advert: [raw.blueberryLight, raw.blueberry] as const,
  /** The Continue card's progress bar. */
  progress: [raw.accent, raw.aqua] as const,
  /** Splash vial. */
  splash: [raw.aqua, raw.blueberry] as const,
} as const;
