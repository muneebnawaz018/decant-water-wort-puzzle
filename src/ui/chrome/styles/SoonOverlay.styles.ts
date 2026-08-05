import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha } from '@/theme/colors';
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: alpha('gold', 0.5),
    backgroundColor: alpha('nightDeep', 0.9),
  },
  text: { ...text.eyebrow, fontSize: 10, color: apothecary.goldLight },
});
