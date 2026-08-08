import { StyleSheet } from 'react-native';

import { apothecary, HAIRLINE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  slot: { alignItems: 'center', gap: s(5), width: s(64) },
  disabled: { opacity: 0.4 },
  /**
   * Applied to the face, because the opacity above is on the slot — which also
   * holds the caption — and the shadow lives one level down.
   *
   * Android composites `elevation` outside a view's opacity, so a disabled
   * control kept a full-strength glow behind a 40% face. See
   * `GlossButton.styles.ts` for the whole story.
   */
  unlit: { elevation: 0, shadowOpacity: 0 },
  // Stroke as a padded background, not a `borderWidth` — see `HAIRLINE`.
  button: {
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    padding: HAIRLINE,
    backgroundColor: ui.edge,
    overflow: 'hidden',
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(8),
    shadowOffset: { width: 0, height: s(4) },
    elevation: 5,
  },
  buttonFace: {
    flex: 1,
    borderRadius: s(25) - HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Half the face, not a gradient stop — Android and iOS disagreed about a
  // three-stop `locations` list and washed the whole surface. See
  // `GlossButton.styles.ts`.
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: ui.line,
  },
  label: {
    fontFamily: POPPINS.semibold,
    fontSize: s(11),
    color: apothecary.inkMuted,
  },
  /**
   * The price tag, pinned to the button's top-right.
   *
   * **It is only drawn when the press actually costs.** Undo's first few on
   * each level are free, and a price shown against a free action is worse than
   * no price at all — it makes the player hesitate over something that would
   * have cost them nothing.
   *
   * Gold, like the coin it spends, rather than the red a cost is often painted
   * in: this is a price, not a warning, and the button is still the thing to
   * press when it is needed.
   *
   * Sized to be read at a glance rather than to be tucked away. The first
   * version was 9pt with a 9dp coin and was, in practice, an orange smudge —
   * a number nobody can read is a number that is not being disclosed.
   *
   * It sits inside the bounce wrapper, so it presses with the button instead of
   * hanging still while the face moves under it.
   */
  price: {
    position: 'absolute',
    top: -s(6),
    right: -s(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(3),
    paddingLeft: s(5),
    paddingRight: s(7),
    paddingVertical: s(3),
    borderRadius: s(11),
    backgroundColor: apothecary.gold,
    // A ring in the board's own ground, so the badge reads as sitting *on* the
    // button rather than merging into its lit edge. `borderWidth` rather than a
    // padded background here: the badge has no gradient to misalign, which is
    // what `HAIRLINE` exists to avoid elsewhere.
    borderWidth: 2,
    borderColor: apothecary.bg2,
  },
  priceValue: {
    fontFamily: POPPINS.bold,
    fontSize: s(12),
    // `onGold`, the near-black ink this palette prints on gold — not `ink`,
    // which is #F4ECFF and was rendering the price white on yellow.
    color: ui.onGold,
    includeFontPadding: false,
  },
});
