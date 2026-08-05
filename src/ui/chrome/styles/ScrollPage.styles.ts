import { StyleSheet } from 'react-native';

import { SPACE } from '@/theme/apothecary';

export const styles = StyleSheet.create({
  // Transparent: Root's shared backdrop shows through every screen.
  root: { flex: 1 },
  page: { flex: 1 },
  content: { paddingHorizontal: SPACE.screen, paddingTop: 4 },
});
