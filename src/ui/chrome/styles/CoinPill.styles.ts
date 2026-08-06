import { StyleSheet } from 'react-native';

import { apothecary, GRADIENT_BORDER_FILL } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    borderRadius: s(16),
    borderWidth: s(2),
    borderColor: ui.goldEdge,
    // Android insets the background by the border width, leaving a ring of
    // the screen showing between the stroke and the gradient. See
    // `GRADIENT_BORDER_FILL`.
    backgroundColor: GRADIENT_BORDER_FILL,
    paddingLeft: s(8),
    paddingRight: s(15),
    paddingVertical: s(8),
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  coin: {
    width: s(20),
    height: s(20),
    borderRadius: s(10),
    overflow: 'hidden',
  },
  value: {
    fontFamily: POPPINS.bold,
    fontSize: s(15),
    color: apothecary.ink,
  },
});
