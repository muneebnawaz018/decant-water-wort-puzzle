import type { TextStyle } from 'react-native';

import { apothecary } from './apothecary';
import { POPPINS } from './fonts';
import { s } from './scale';

/**
 * The type presets the screens share.
 *
 * Every one of these was written out by hand in three or four screens before
 * this file existed, and they had already drifted — the same eyebrow label was
 * 10/0.8 on Home and 10/0.9 in Shop. A preset makes "the same thing" literally
 * the same object; a screen that genuinely needs a different size composes on
 * top with `[text.caption, styles.bigger]` rather than restating the family and
 * the colour.
 *
 * Nothing here sets layout. These are text-only so they can be spread into any
 * position without dragging spacing along.
 *
 * Every size runs through `s()`. That is why the presets have to be the only
 * place a size is written: a hand-rolled `fontSize: 14` in a screen would be
 * the one label that stays phone-sized on a tablet, and it would be invisible
 * until someone looked at an iPad. `letterSpacing` scales with the size it
 * belongs to — tracking is a ratio of the glyph, not an absolute gap.
 */
export const text = {
  /** Screen titles in `ScreenHeader`. */
  screenTitle: {
    fontFamily: POPPINS.semibold,
    fontSize: s(22),
    color: apothecary.ink,
  },

  /** Small uppercase label above a group or inside a card. */
  eyebrow: {
    fontFamily: POPPINS.semibold,
    fontSize: s(10),
    letterSpacing: s(0.9),
    textTransform: 'uppercase',
    color: apothecary.inkMuted,
  },

  /** The headline inside a card. */
  cardTitle: {
    fontFamily: POPPINS.semibold,
    fontSize: s(15),
    color: apothecary.ink,
  },

  /** A settings/list row's label. */
  rowLabel: {
    fontFamily: POPPINS.medium,
    fontSize: s(14),
    color: apothecary.ink,
  },

  /** Paragraph copy — the only preset with a line height, because it wraps. */
  body: {
    fontFamily: POPPINS.regular,
    fontSize: s(13.5),
    lineHeight: s(20),
    color: apothecary.inkMuted,
  },

  /** Secondary one-liners under a title. */
  caption: {
    fontFamily: POPPINS.regular,
    fontSize: s(12),
    color: apothecary.inkMuted,
  },

  /** A muted number or state on the right of a row. */
  meta: {
    fontFamily: POPPINS.medium,
    fontSize: s(13),
    color: apothecary.inkMuted,
  },

  /** A large gold figure, as on the stats tiles. */
  figure: {
    fontFamily: POPPINS.semibold,
    fontSize: s(26),
    color: apothecary.goldLight,
  },
} as const satisfies Record<string, TextStyle>;
