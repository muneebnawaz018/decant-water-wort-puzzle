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
  /**
   * The celebration's layer: the whole screen, above everything, inert.
   *
   * Full-bleed rather than boxed around a card. Confined, confetti reads as a
   * texture on a panel — it needs somewhere to fall or it is a pattern. It also
   * carries no scrim of its own: the burst is the only thing on screen at that
   * moment, and dimming the page behind it would make the reward feel like an
   * interruption rather than a payout.
   *
   * **Above the modal's scrim, which is what the `zIndex` is for.** Rendering
   * the burst last is not enough: paint order only decides between siblings
   * that have no `zIndex`, and the scrim has one. So the confetti landed behind
   * the dialog it was celebrating — visible around the edges of the card and
   * nowhere near the thing the player had just tapped.
   *
   * It has to stay ahead of `scrim`. The two numbers are a pair; moving one
   * without the other puts the burst back underneath.
   */
  celebration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
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

  /**
   * One button: sized to its label, floor of 104dp so it stays easy to hit.
   *
   * **This is what sets the width, not the button's own padding.** A label like
   * "Close" measures about 50dp, so the floor always wins and `dialogFill`'s
   * `paddingHorizontal` never becomes the constraint — changing it there looks
   * like nothing happening. Same for the two-button row above, where `flex: 1`
   * takes whatever the card gives. Resize a dialog button here or at
   * `cardSlot.maxWidth`.
   */
  buttonsSingle: {
    flexDirection: 'row',
    // Full card width with the button centred inside it, rather than a row
    // shrunk to its content. A shrink-wrapped row is centred by the card's
    // `alignItems`, which puts it at the mercy of anything that measures wide —
    // the primary's glow spills past the face, and the label carries a trailing
    // letter-space. Centring within a known width has nothing to drift against.
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  buttonSingle: { minWidth: s(104) },

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
