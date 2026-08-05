import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    paddingHorizontal: SPACE.screen,
    paddingTop: s(12),
    paddingBottom: s(10),
  },
  title: { ...text.screenTitle, flex: 1 },
  trailing: { minWidth: 0 },

  button: {
    width: s(42),
    height: s(42),
    borderRadius: s(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  dimmed: { opacity: 0.42 },
});
