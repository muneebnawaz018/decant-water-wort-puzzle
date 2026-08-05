import { StyleSheet } from 'react-native';

import { apothecary } from '@/theme/apothecary';
import { POPPINS } from '@/theme/fonts';
export const styles = StyleSheet.create({
  version: {
    fontFamily: POPPINS.regular,
    fontSize: 11,
    textAlign: 'center',
    color: apothecary.inkMuted,
    marginTop: 12,
  },
});
