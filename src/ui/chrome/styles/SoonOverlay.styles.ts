import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha } from '@/theme/colors';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

export const styles = StyleSheet.create({
  // Covers the card it sits in, including the corners — the parent clips it.
  veil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha('nightDeep', 0.5),
  },
  /** Fixed height rather than vertical padding — see `SoonBadge`. */
  pill: {
    flexDirection: 'row',
    height: s(26),
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingHorizontal: s(10),
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: alpha('gold', 0.5),
    backgroundColor: alpha('nightDeep', 0.9),
  },
  /** Same line-box fix as `SoonBadge` — see the comment there. */
  text: {
    ...text.eyebrow,
    fontSize: s(10),
    lineHeight: s(13),
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: apothecary.goldLight,
    marginLeft: s(0.9),
  },
});
