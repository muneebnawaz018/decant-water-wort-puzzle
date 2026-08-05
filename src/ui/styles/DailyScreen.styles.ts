import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { POPPINS } from '@/theme/fonts';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  streak: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  streakText: { flex: 1 },
  streakTitle: text.cardTitle,
  streakDetail: text.caption,

  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  // Four across, so the last row of a seven-day week is not stretched.
  daySlot: { width: `${100 / 4}%`, flexGrow: 1, flexBasis: '22%' },
  day: { paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' },
  dayClaimed: { backgroundColor: ui.accentWash },
  dayToday: { borderColor: apothecary.gold, borderWidth: 2 },
  dayNumber: {
    fontFamily: POPPINS.semibold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: apothecary.inkMuted,
  },
  dayAmount: {
    fontFamily: POPPINS.semibold,
    fontSize: 14,
    color: apothecary.ink,
    marginTop: 5,
  },
  dayUnit: {
    fontFamily: POPPINS.medium,
    fontSize: 10,
    color: apothecary.inkMuted,
  },

  spacer: { height: 14 },
});
