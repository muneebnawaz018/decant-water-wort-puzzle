import { StyleSheet } from 'react-native';

import { apothecary, GRADIENT_BORDER_FILL } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  shadow: {
    shadowColor: ui.shadow,
    shadowOpacity: 0.32,
    shadowRadius: s(20),
    shadowOffset: { width: 0, height: s(8) },
    elevation: 8,
  },
  fill: {
    borderWidth: 1,
    borderColor: apothecary.line,
    // Android insets the background by the border width, leaving a ring of
    // the screen showing between the stroke and the gradient. See
    // `GRADIENT_BORDER_FILL`.
    backgroundColor: GRADIENT_BORDER_FILL,
    overflow: 'hidden',
  },
  // Spec's `inset 0 1px 0 rgba(255,255,255,.1)`.
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: ui.line,
  },
});
