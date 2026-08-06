import { colours, gradients, ui } from './colors';
import { s } from './scale';

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
   * board actually uses. Two measures are held at once, and the order was
   * searched rather than hand-picked:
   *
   * - Normal vision is a floor, not a goal. Every pair inside the first eleven
   *   stays above dE 30, which is what `liquid separation` enforces. No
   *   ordering that dips below that was considered, however well it scored
   *   otherwise.
   * - Subject to that, the worst pair under simulated protanopia,
   *   deuteranopia and tritanopia is pushed as high as it will go at the board
   *   sizes players actually meet. Four colours went from dE 14 to 30, six
   *   from 5 to 14, eight from 5 to 7.
   *
   * Ten and eleven colours come out marginally worse than the previous order
   *   (4.8 and 0.2, against 5.3 and 0.5) and that is accepted: both numbers are
   *   far below perceptible either way, so nothing is lost that was working,
   *   and those sizes start at level 501. The gain sits on levels 6 to 350,
   *   where nearly every player is.
   *
   * None of this makes colour alone sufficient — see the `colour vision` tests
   * for how badly twelve hues collapse. Colourblind marks remain the mechanism
   * that carries identity; this ordering only decides how much work they have
   * to do, and how early.
   *
   * The index is a piece's identity, so this reordering repaints every board
   * without changing any puzzle: generation, seeds and the saved records all
   * work in indices, never in colours.
   */
  pieces: [
    colours.aqua,
    colours.tangerine,
    colours.rose,
    colours.olive,
    colours.coral,
    colours.mango,
    colours.fern,
    colours.plum,
    colours.teal,
    colours.lime,
    colours.blueberry,
    colours.grape,
  ],
  /**
   * Index-aligned with `pieces`.
   *
   * Ordered on the same principle as the colours, for the same reason: a board
   * takes the first N, so the glyphs that co-occur early have to be the ones
   * least like each other. The set holds six near-pairs — filled against
   * outlined (`dot`/`ring`), one against two (`wave`/`waves`), and rotations of
   * each other (`plus`/`cross`, `square`/`diamond`, `triangle`/`star`,
   * `stripe`/`grid`). The first six entries take one from each pair, so no
   * partner appears until seven colours are on the board.
   *
   * These deliberately do not travel with their old colours. A glyph carries
   * no meaning of its own — only its distinctness from the others on screen
   * matters — so pairing was free to be re-spent on separation.
   */
  symbols: [
    'dot',
    'wave',
    'plus',
    'square',
    'triangle',
    'stripe',
    'ring',
    'waves',
    'cross',
    'diamond',
    'star',
    'grid',
  ],
};

/**
 * Solid fill to put behind a `LinearGradient` that also carries a border.
 *
 * **Android insets a view's background by its border width. iOS paints the
 * background under the border.** With a gradient that difference shows: the
 * gradient stops at the inner edge of the stroke and a 1dp ring of whatever is
 * behind the card shows through, which on this dark purple ground reads as a
 * gap between the border and the fill at all four corners. It is not a rounding
 * error and it does not go away at higher densities.
 *
 * Every gradient in the chrome runs `panelTop → panel`, so the bottom stop
 * fills that ring near-invisibly. It costs one extra solid fill on iOS, where
 * the gradient covers it entirely.
 *
 * Anything that pairs `borderWidth` with a `LinearGradient` needs this.
 */
export const GRADIENT_BORDER_FILL = ui.panel;

/** Layered background, spec §3: warm lamp above, magenta wash below. */
export const BACKDROP = {
  lamp: ui.lamp,
  lampFade: ui.lampFade,
  wash: ui.wash,
  washFade: ui.washFade,
} as const;

/**
 * Spacing and shape, spec §3.
 *
 * Scaled, because side padding is the thing that tells a screen how wide its
 * content is allowed to be. Left at 24 on a tablet, every card ran within 24dp
 * of both bezels and the whole layout read as a stretched phone.
 */
export const SPACE = {
  /** Screen side padding, and the gap between stacked blocks. */
  screen: s(24),
  block: s(24),

  /**
   * The gap under a finished section — a grid, a panel, a reward track —
   * before the next one starts.
   *
   * Named because it was not being shared. Shop and Settings both used 16,
   * Stats used 14 and Daily used 14 above its track and 16 below it. Nobody
   * sees a two-point difference on one screen; what they see is that the app
   * does not quite line up, without being able to say why.
   */
  section: s(16),

  /**
   * Inset for content inside a full-width panel — settings rows, the stats
   * progress card, Daily's streak header.
   */
  panel: s(16),

  /**
   * Inset inside a grid tile. Tighter than `panel` on purpose: a tile is half
   * the width, so the same inset would eat a proportionally larger share of it
   * and leave the content cramped.
   */
  tile: s(12),

  cardRadius: s(20),
  buttonRadius: s(16),
  /** Vial glass: square shoulders, round base. */
  vialRadius: { top: s(12), bottom: s(26) },
} as const;

/** Gold gradient for the wordmark, top to bottom. Spec §3. */
export const WORDMARK_GRADIENT = gradients.wordmark;
