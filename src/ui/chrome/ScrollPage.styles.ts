import { StyleSheet } from 'react-native';

import { SPACE } from '@/theme/apothecary';

export const styles = StyleSheet.create({
  // Transparent: Root's shared backdrop shows through every screen.
  root: { flex: 1 },
  page: { flex: 1 },
  // `section` above the first card, the same gap that separates every block
  // below it. At 4 the first group's heading sat against the header and the
  // page read as one crowded column with a title stuck on top.
  content: { paddingHorizontal: SPACE.screen, paddingTop: SPACE.section },
});
