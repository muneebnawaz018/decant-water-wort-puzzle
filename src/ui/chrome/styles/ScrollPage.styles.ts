import { StyleSheet } from 'react-native';

import { SPACE } from '@/theme/apothecary';
import { s } from '@/theme/scale';

export const styles = StyleSheet.create({
  // Transparent: Root's shared backdrop shows through every screen.
  root: { flex: 1 },
  page: { flex: 1 },
  content: { paddingHorizontal: SPACE.screen, paddingTop: s(4) },
});
