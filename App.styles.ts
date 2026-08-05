import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';

export const styles = StyleSheet.create({
  // Coloured, not transparent: this is the outermost React view, so it is what
  // shows in the instant between the native splash going away and the screens
  // below painting themselves.
  root: { flex: 1, backgroundColor: apothecary.bg2 },
});
