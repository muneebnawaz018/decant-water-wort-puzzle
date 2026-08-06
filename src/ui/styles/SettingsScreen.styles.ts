import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { POPPINS } from '@/theme/fonts';
import { s } from '@/theme/scale';
export const styles = StyleSheet.create({
  version: {
    fontFamily: POPPINS.regular,
    fontSize: s(12.5),
    textAlign: 'center',
    color: apothecary.inkMuted,
    marginTop: s(10),
  },
});
