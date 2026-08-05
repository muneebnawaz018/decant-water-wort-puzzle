import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha } from '@/theme/colors';
import { text } from '@/theme/typography';

export const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: alpha('gold', 0.45),
    backgroundColor: alpha('gold', 0.14),
  },
  text: { ...text.eyebrow, fontSize: 9, color: apothecary.goldLight },
});
