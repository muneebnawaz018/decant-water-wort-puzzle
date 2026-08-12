import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha } from '@/theme/colors';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

export const styles = StyleSheet.create({
  /**
   * A fixed height, not vertical padding.
   *
   * Padding sizes the pill from the text box, and the text box is not the same
   * on both platforms — Android's is taller by the font padding it reserves for
   * an ascender and descender this uppercase string never uses. Two paddings
   * around two different heights give two different pills. Stated outright and
   * centred, the glyphs sit in the middle of a box neither platform gets a vote
   * on.
   */
  badge: {
    height: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(8),
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: alpha('gold', 0.45),
    backgroundColor: alpha('gold', 0.14),
  },
  /**
   * `marginLeft` is the eyebrow's own `letterSpacing`, put back on the left.
   *
   * Letter spacing is trailing: it is added after every glyph including the
   * last, so the measured text is one space wider than what is drawn and the
   * lettering sits that far left of the pill's centre. Small enough to look
   * like nothing and just enough to look wrong.
   */
  /**
   * `includeFontPadding: false` drops Android's reserved ascender/descender
   * band, which is both taller than iOS's line box and asymmetric — so it also
   * pushed the lettering above centre. Turning it off leaves the line box
   * undefined, hence the explicit `lineHeight`.
   */
  text: {
    ...text.eyebrow,
    fontSize: s(9),
    lineHeight: s(12),
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: apothecary.goldLight,
    marginLeft: s(0.9),
  },
});
