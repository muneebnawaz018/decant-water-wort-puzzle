import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { colours, ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';

/**
 * The switch travel, exported because the component animates the knob by it.
 * Left as a literal in the handler it drifted from the track the moment the
 * track scaled — the knob slid to the middle of an on state rather than to its
 * end. It is the track's width less the knob and both paddings.
 */
export const KNOB_TRAVEL = s(46) - s(21) - s(3) * 2;

export const styles = StyleSheet.create({
  group: { marginBottom: SPACE.section },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingHorizontal: SPACE.panel,
    paddingVertical: s(13),
  },
  divider: { borderBottomWidth: 1, borderBottomColor: ui.divider },
  /**
   * A row whose control sits under its label rather than beside it.
   *
   * `paddingBottom` only — the label line above brings its own vertical
   * padding, so repeating it here would double the gap between the label and
   * the control it belongs to.
   */
  stack: { paddingBottom: s(13) },
  stackControl: { paddingHorizontal: SPACE.panel },
  rowIcon: {
    width: s(34),
    height: s(34),
    borderRadius: s(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.well,
  },
  rowLabel: { ...text.rowLabel, flex: 1 },
  chevron: { fontSize: s(18), color: apothecary.inkMuted },

  track: {
    width: s(46),
    height: s(27),
    borderRadius: s(14),
    padding: s(3),
    backgroundColor: ui.disabledTrack,
  },
  trackOn: { backgroundColor: apothecary.accent },
  knob: {
    width: s(21),
    height: s(21),
    borderRadius: s(11),
    backgroundColor: colours.white,
    shadowColor: ui.shadow,
    shadowOpacity: 0.4,
    shadowRadius: s(3),
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  segmented: {
    flexDirection: 'row',
    borderRadius: s(12),
    padding: s(3),
    backgroundColor: ui.well,
  },
  segment: {
    paddingHorizontal: s(11),
    paddingVertical: s(6),
    borderRadius: s(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: POPPINS.semibold,
    fontSize: s(12),
    color: apothecary.inkMuted,
  },
  segmentTextOn: {
    fontFamily: POPPINS.semibold,
    fontSize: s(12),
    color: ui.onGold,
  },
});
