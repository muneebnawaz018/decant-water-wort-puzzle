import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { text } from '@/theme/typography';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  streak: { flexDirection: 'row', alignItems: 'center', gap: s(12), padding: s(15) },
  streakText: { flex: 1 },
  streakTitle: text.cardTitle,
  streakDetail: text.caption,

  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(10),
    marginTop: s(14),
    marginBottom: s(16),
  },
  // Four across, so the last row of a seven-day week is not stretched.
  daySlot: { width: `${100 / 4}%`, flexGrow: 1, flexBasis: '22%' },
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

  spacer: { height: s(14) },
});
