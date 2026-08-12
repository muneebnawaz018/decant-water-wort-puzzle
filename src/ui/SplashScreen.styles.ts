import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { alpha, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { VIAL_HEIGHT, VIAL_RISE, VIAL_WIDTH } from '@/theme/splash';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  // The vial is centred on the screen and nothing else is in the flow, because
  // the OS centres the native splash image the same way. Anything stacked in
  // this column would push the vial off that centre and the handoff would show
  // it moving. The title sits underneath, absolutely placed.
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ─── Not scaled, and it must stay that way ────────────────────────────────
  //
  // Everything from here to `liquidSlot` is the vial lockup, and the vial is
  // the one thing in this app that has to be pixel-identical to something drawn
  // outside it: `assets/splash-icon.png`, the native launch image, which
  // `expo-splash-screen` renders at a fixed dp size on every device. Scaling
  // the glass here would leave the native vial at 54x150 and the React one
  // larger, and the handoff — the whole reason the two splashes were built as
  // one — would show as a jump on tablets only.
  //
  // The radii, stroke and highlight are drawn by `script/make-splash.py` from
  // these same numbers. Change one, change both, regenerate, prebuild.
  vialSlot: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: alpha('aqua', 0.5),
  },
  vial: {
    width: VIAL_WIDTH,
    height: VIAL_HEIGHT,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: ui.glassEdge,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    backgroundColor: alpha('white', 0.06),
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  liquidSlot: { width: '100%' },
  // The glass highlight from spec §3 — one bright stripe, not a gradient sheen.
  shine: {
    position: 'absolute',
    top: 10,
    left: 8,
    width: 9,
    height: 90,
    borderRadius: 6,
    backgroundColor: ui.glassShine,
  },
  // ─── Scaled from here down ────────────────────────────────────────────────
  // The wordmark and taglines are React-only; the native image has no text, so
  // nothing below is measured against it.

  // Placed off the vial's bottom edge rather than stacked after it in the
  // column, so the vial itself stays exactly where the native image left it.
  titleBlock: {
    position: 'absolute',
    top: '50%',
    // Measured off the vial's *risen* bottom edge, not its starting one.
    marginTop: VIAL_HEIGHT / 2 - VIAL_RISE + 30,
    alignItems: 'center',
    gap: s(24),
  },

  tagline: {
    fontFamily: POPPINS.semibold,
    fontSize: s(16),
    letterSpacing: s(0.6),
    color: apothecary.inkMuted,
  },
  hint: {
    position: 'absolute',
    bottom: s(70),
    fontFamily: POPPINS.bold,
    fontSize: s(12),
    letterSpacing: s(3),
    color: apothecary.gold,
  },
});
