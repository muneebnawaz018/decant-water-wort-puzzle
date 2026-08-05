import { StyleSheet } from 'react-native';

import { apothecary, SPACE } from '@/theme/apothecary';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  root: { flex: 1 },
  homeButton: { position: 'absolute', top: s(60), left: SPACE.screen, zIndex: 5 },

  burst: {
    position: 'absolute',
    top: '36%',
    left: '50%',
    width: 0,
    height: 0,
  },
  spark: { position: 'absolute', width: s(7), height: s(7), borderRadius: s(2) },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.screen,
  },
  title: {
    fontFamily: POPPINS.bold,
    fontSize: s(32),
    color: apothecary.gold,
    textAlign: 'center',
  },
  stars: { flexDirection: 'row', gap: s(14), marginTop: s(16), marginBottom: s(6) },
  starSlot: { width: s(46), height: s(46) },
  moves: {
    fontFamily: POPPINS.semibold,
    fontSize: s(14),
    color: apothecary.inkMuted,
  },

  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingHorizontal: s(16),
    paddingVertical: s(9),
    marginTop: s(14),
  },
  coin: {
    width: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: apothecary.gold,
  },
  rewardText: {
    fontFamily: POPPINS.semibold,
    fontSize: s(15),
    color: apothecary.goldLight,
  },

  // Stretched across the content width and split evenly, so the two read as a
  // pair. Sized to their labels they came out lopsided — "Level 2" is longer
  // than "Replay", and the wider button looked like the only real one.
  buttons: { flexDirection: 'row', gap: s(12), marginTop: s(30), alignSelf: 'stretch' },
  button: { flex: 1 },
});
