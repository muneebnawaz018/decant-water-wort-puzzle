import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: SPACE.screen,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: { ...text.screenTitle, flex: 1 },
  trailing: { minWidth: 0 },

  button: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  dimmed: { opacity: 0.42 },
});
