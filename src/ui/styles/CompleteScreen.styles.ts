import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { POPPINS } from '@/theme/fonts';
export const styles = StyleSheet.create({
  root: { flex: 1 },
  homeButton: { position: 'absolute', top: 60, left: SPACE.screen, zIndex: 5 },

  burst: {
    position: 'absolute',
    top: '36%',
    left: '50%',
    width: 0,
    height: 0,
  },
  spark: { position: 'absolute', width: 7, height: 7, borderRadius: 2 },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.screen,
  },
  title: {
    fontFamily: POPPINS.bold,
    fontSize: 32,
    color: apothecary.gold,
    textAlign: 'center',
  },
  stars: { flexDirection: 'row', gap: 14, marginTop: 16, marginBottom: 6 },
  starSlot: { width: 46, height: 46 },
  moves: {
    fontFamily: POPPINS.semibold,
    fontSize: 14,
    color: apothecary.inkMuted,
  },

  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 14,
  },
  coin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: apothecary.gold,
  },
  rewardText: {
    fontFamily: POPPINS.semibold,
    fontSize: 15,
    color: apothecary.goldLight,
  },

  buttons: { flexDirection: 'row', gap: 12, marginTop: 30 },
  button: { minWidth: 120 },
});
