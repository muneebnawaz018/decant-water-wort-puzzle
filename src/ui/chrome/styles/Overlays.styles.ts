import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: ui.scrim,
  },
  cardSlot: { width: '100%', maxWidth: 300 },
  card: { padding: 24, paddingBottom: 18, alignItems: 'center' },
  title: {
    fontFamily: POPPINS.semibold,
    fontSize: 18,
    color: apothecary.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: { ...text.body, marginBottom: 20, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  button: { flex: 1 },

  toast: {
    position: 'absolute',
    bottom: 104,
    alignSelf: 'center',
    zIndex: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: apothecary.line,
    backgroundColor: ui.toast,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: { fontFamily: POPPINS.medium, fontSize: 13, color: colours.white },
});
