import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { AmbientVials } from '@/render/AmbientVials';
import { apothecary } from '@/theme/apothecary';
import { s } from '@/theme/scale';
import { Wordmark } from './Wordmark';
import { RACK_HEIGHT, SHELF_HEIGHT, styles, VIAL_WIDTH } from './HeroRack.styles';

/**
 * The home lockup (spec §4.2): glowing vials standing on a gold shelf, the
 * wordmark below, then the tagline.
 *
 * The vials are the existing ambient loop rather than a static drawing — a
 * frozen board reads as a paused game instead of an invitation.
 *
 * The vial area measures itself rather than taking the parent's full height.
 * Handed the whole slot it would draw over the wordmark and out through the
 * top bar, because its height is the parent's, not what is left after the
 * title.
 */
export const HeroRack = memo(function HeroRack() {
  return (
    <View style={styles.root}>
      <View style={styles.vialArea}>
        <View style={styles.vialBox}>
          <AmbientVials width={VIAL_WIDTH} height={RACK_HEIGHT - SHELF_HEIGHT} standing />
        </View>
        <LinearGradient
          colors={[apothecary.goldLight, apothecary.goldDark]}
          style={styles.shelf}
        >
          <View style={styles.shelfGloss} />
        </LinearGradient>
      </View>

      <View style={styles.title}>
        <Wordmark size={s(38)} />
        <Text style={styles.tagline}>an apothecary of color</Text>
      </View>
    </View>
  );
});
