import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
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
    padding: s(30),
    backgroundColor: ui.scrim,
  },
  // The clamp is the point of this style, and it scales: a dialog held at 300dp
  // on a tablet sits in the middle of the screen with type that has grown
  // around it, which reads as a phone dialog someone forgot to finish.
  cardSlot: { width: '100%', maxWidth: s(300) },
  card: { padding: s(24), paddingBottom: s(18), alignItems: 'center' },
  title: {
    fontFamily: POPPINS.semibold,
    fontSize: s(18),
    color: apothecary.ink,
    marginBottom: s(8),
    textAlign: 'center',
  },
  body: { ...text.body, marginBottom: s(20), textAlign: 'center' },
  /**
   * Two buttons share the width; one does not take it all.
   *
   * `alignSelf: 'stretch'` with `flex: 1` is right for a pair — Cancel and
   * Confirm each get half, and the row reads as a choice. Applied to a lone
   * button it stretches a single "Close" across the full 300dp card, which is
   * how a dismissal ends up looking like the most important thing on screen.
   * A dialog with nothing to decide should not shout.
   */
  buttons: { flexDirection: 'row', gap: s(10), alignSelf: 'stretch' },
  button: { flex: 1 },

  /** One button: sized to its label, floor of 140dp so it stays easy to hit. */
  buttonsSingle: { flexDirection: 'row', alignSelf: 'center' },
  buttonSingle: { minWidth: s(140) },

  toast: {
    position: 'absolute',
    bottom: s(104),
    alignSelf: 'center',
    zIndex: 25,
    borderRadius: s(20),
    borderWidth: 1,
    borderColor: apothecary.line,
    backgroundColor: ui.toast,
    paddingHorizontal: s(18),
    paddingVertical: s(10),
  },
  toastText: {
    fontFamily: POPPINS.medium,
    fontSize: s(13),
    color: colours.white,
  },
});
