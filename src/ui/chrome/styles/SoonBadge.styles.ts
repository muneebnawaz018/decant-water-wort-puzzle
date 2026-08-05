import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha } from '@/theme/colors';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

export const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: s(8),
    paddingVertical: s(3),
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: alpha('gold', 0.45),
    backgroundColor: alpha('gold', 0.14),
  },
  text: { ...text.eyebrow, fontSize: s(9), color: apothecary.goldLight },
});
