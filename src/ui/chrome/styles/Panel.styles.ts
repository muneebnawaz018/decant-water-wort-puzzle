import { StyleSheet } from 'react-native';

import { HAIRLINE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  // The stroke lives here, as a padded background rather than a `borderWidth`
  // on the gradient below — see `HAIRLINE`.
  shadow: {
    backgroundColor: ui.edge,
    padding: HAIRLINE,
    shadowColor: ui.shadow,
    shadowOpacity: 0.32,
    shadowRadius: s(20),
    shadowOffset: { width: 0, height: s(8) },
    elevation: 8,
  },
  fill: { overflow: 'hidden' },
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
