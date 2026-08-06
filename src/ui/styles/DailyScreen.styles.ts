import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { text } from '@/theme/typography';
import { s } from '@/theme/scale';

/** Days across the reward track. Seven rewards do not divide by it. */
export const DAY_COLUMNS = 4;

const DAY_GAP = s(10);

/**
 * A slot's share of the row, gaps removed first.
 *
 * Percentages alone cannot express this: four tiles at 25% plus three gaps is
 * wider than the row, so the fourth wraps and the track silently becomes three
 * across. Subtracting the gaps before dividing is what keeps four on a line.
 */
const DAY_SLOT_WIDTH = `${(100 - 3.2 * (DAY_COLUMNS - 1)) / DAY_COLUMNS}%` as const;

export const styles = StyleSheet.create({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    padding: SPACE.panel,
  },
  streakText: { flex: 1 },
  streakTitle: text.cardTitle,
  streakDetail: text.caption,

  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DAY_GAP,
    marginTop: SPACE.section,
    marginBottom: SPACE.section,
  },

  /**
   * Four across, seven days — so the last row holds three and the grid has to
   * be told what to do with the empty fourth slot.
   *
   * It used to hold `width`, `flexBasis` and `flexGrow: 1` together, which is
   * three answers to one question. `flexBasis` wins over `width` in flex
   * layout, so the width was dead, and `flexGrow: 1` handed the leftover space
   * to whatever was in the row: four tiles came out 78dp wide and the last
   * three came out 107dp. The comment above it claimed the row was not
   * stretched, which is exactly what it was.
   *
   * This is the failure `src/theme/grid.ts` exists to prevent — the shop hit
   * it first, with one skin alone on a row at three times the size of the one
   * above. The rule it records: an explicit width has to come with an explicit
   * `flexGrow: 0`. Daily missed it by hand-rolling its grid.
   *
   * `DailyScreen` now pads the short row with an empty slot, the same fix
   * `StagesScreen` uses for a 50-tile page that never divides by four.
   */
  daySlot: { flexGrow: 0, flexBasis: DAY_SLOT_WIDTH },
  day: { paddingVertical: s(12), paddingHorizontal: s(4), alignItems: 'center' },
  dayClaimed: { backgroundColor: ui.accentWash },
  dayToday: { borderColor: apothecary.gold, borderWidth: 2 },
  dayNumber: {
    fontFamily: POPPINS.semibold,
    fontSize: s(9.5),
    letterSpacing: s(0.5),
    color: apothecary.inkMuted,
  },
  dayAmount: {
    fontFamily: POPPINS.semibold,
    fontSize: s(14),
    color: apothecary.ink,
    marginTop: s(5),
  },
  dayUnit: {
    fontFamily: POPPINS.medium,
    fontSize: s(10),
    color: apothecary.inkMuted,
  },

  spacer: { height: SPACE.section },
});
