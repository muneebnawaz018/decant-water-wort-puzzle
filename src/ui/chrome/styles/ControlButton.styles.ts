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
});
