import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { s } from '@/theme/scale';

/** How far above the bar the fade starts. */
const NAV_FADE = s(40);

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: apothecary.bg2 },
  blank: { flex: 1, backgroundColor: apothecary.bg2 },
  // Floating over the screens rather than in their flow: the bar outlives any
  // one of them, and a screen that reserved space for it would still have to
  // know its height. They pad their scroll tail instead.
  //
  // Full-width and opaque, not just the bar's own width: content passing behind
  // the rounded corners, and through the safe-area strip beneath, was still
  // legible otherwise.
  navSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.screen,
    backgroundColor: apothecary.bg2,
  },
  // A short dissolve above the solid strip. It covers only its own band, so it
  // reaches full opacity exactly where the strip begins — spanning the whole
  // slot instead left it around 70% at the bar's top edge, and content read
  // straight through.
  navFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -NAV_FADE,
    height: NAV_FADE,
  },
});
