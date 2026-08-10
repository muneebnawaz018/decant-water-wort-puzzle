import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';

/**
 * `loader.json`'s frame is square and hugs the ring, so the box has to be too.
 *
 * `resizeMode="contain"` fits the whole composition into whatever it is given,
 * empty air included — a mismatched box letterboxes the artwork down to a
 * fraction of its height. `brew.json` shipped that way once; see
 * `assets/lottie/README.md`.
 *
 * Small on purpose. A loader is chrome: it says *hold on* and then gets out of
 * the way, and the wait it covers is usually over in about a second.
 */
const MARK_SIZE = s(72);

export const styles = StyleSheet.create({
  /**
   * Above the modal, below the celebration.
   *
   * The daily offer is raised from a dialog's own button, so the veil has to
   * cover a modal that is on its way out — beneath it, the loader appears behind
   * the card that opened it. The burst stays on top: it only ever plays after an
   * offer has settled, and by then this is gone.
   */
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.scrim,
  },
  card: { alignItems: 'center' },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  label: {
    fontFamily: POPPINS.medium,
    fontSize: s(13),
    color: apothecary.ink,
    // Measured from the artwork, not from the box. The animation's frame is
    // tight around the ring, so this is very nearly the gap it looks like.
    marginTop: s(10),
    // The spacing is what stops a two-word caption reading as a label on a
    // control. It is a status line, and status lines in this app are set wide.
    letterSpacing: 0.8,
  },
});
