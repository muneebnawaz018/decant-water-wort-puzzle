import { colours, gradients, ui } from './colors';

/**
 * Design tokens, from `docs/decant-handoff/BUILD-SPEC.md` §3.
 *
 * The theme went dark at the handoff: deep purple ground, warm lamp glow, gold
 * chrome, and pure saturated liquids. The old parchment palette is gone.
 *
 * Liquid colours are deliberately loud. On a dark ground a muted palette reads
 * as mud, and the player's whole job is telling two segments apart at a glance.
 */
export interface Theme {
  name: string;

  /** Background gradient, top to bottom. */
  bg: string;
  bg2: string;
  /** Card base and the lighter top of its vertical gloss. */
  surface: string;
  surfaceTop: string;
  /** Hairline borders and top-edge gloss. */
  line: string;

  ink: string;
  inkMuted: string;

  /** Gold chrome: accent, highlight, shadow. */
  gold: string;
  goldLight: string;
  goldDark: string;

  /** Green, the primary action colour. */
  accent: string;
  accentDark: string;

  pieces: string[];
  /** Colourblind glyph per piece, index-aligned with `pieces`. */
  symbols: PieceSymbol[];
}

/** Glyphs from spec §9. One per liquid colour, all visually distinct. */
export type PieceSymbol =
  | 'dot'
  | 'triangle'
  | 'star'
  | 'diamond'
  | 'wave'
  | 'plus'
  | 'square'
  | 'cross'
  | 'ring'
  | 'waves'
  | 'stripe'
  | 'grid';

export const apothecary: Theme = {
  name: 'Apothecary',

  bg: ui.ground,
  bg2: ui.groundDeep,
  surface: ui.panel,
  surfaceTop: ui.panelTop,
  line: ui.line,

  ink: ui.ink,
  inkMuted: ui.inkMuted,

  gold: ui.gold,
  goldLight: ui.goldLight,
  goldDark: ui.goldDark,

  accent: ui.accent,
  accentDark: colours.accentDark,

  /**
   * Ordered by separation, not by the spec's listing order.
   *
   * `paramsForLevel` takes the first N, so this order decides which colours a
   * board actually uses. Farthest-point ordered: the closest pair anywhere in
   * the first eleven is dE 33, and the one tight pair (plum next to grape,
   * dE 10) only ever co-occurs on a twelve-colour board. Listing order put
   * them together from eight colours on — level 201.
   *
   * The index is a piece's identity, so this reordering repaints every board
   * without changing any puzzle: generation, seeds and the saved records all
   * work in indices, never in colours.
   */
  pieces: [
    colours.coral,
    colours.grape,
    colours.teal,
    colours.tangerine,
    colours.olive,
    colours.rose,
    colours.lime,
    colours.blueberry,
    colours.mango,
    colours.fern,
    colours.aqua,
    colours.plum,
  ],
  // Index-aligned with `pieces`, so these moved with them.
  symbols: [
    'dot',
    'cross',
    'waves',
    'ring',
    'grid',
    'plus',
    'diamond',
    'square',
    'triangle',
    'stripe',
    'wave',
    'star',
  ],
};

/** Layered background, spec §3: warm lamp above, magenta wash below. */
export const BACKDROP = {
  lamp: ui.lamp,
  lampFade: ui.lampFade,
  wash: ui.wash,
  washFade: ui.washFade,
} as const;

/** Spacing and shape, spec §3. */
export const SPACE = {
  /** Screen side padding, and the gap between stacked blocks. */
  screen: 24,
  block: 24,
  cardRadius: 20,
  buttonRadius: 16,
  /** Vial glass: square shoulders, round base. */
  vialRadius: { top: 12, bottom: 26 },
} as const;

/** Gold gradient for the wordmark, top to bottom. Spec §3. */
export const WORDMARK_GRADIENT = gradients.wordmark;
