import { memo } from 'react';
import { Text, View } from 'react-native';

import { Icon } from '../Icon';
import { styles } from './styles/SoonOverlay.styles';

/**
 * A veil over anything the UI shows but cannot yet deliver.
 *
 * Stronger than a corner badge on purpose. The shop's skins were a working-
 * looking Buy button that took 200 coins and changed nothing on screen, and a
 * small "Soon" pill in the corner is easy to miss on the way to pressing it.
 * Dimming the whole card makes the state unmissable while leaving the artwork
 * visible underneath — which is the part that is worth previewing.
 *
 * `pointerEvents="none"`, so whatever is underneath still handles the tap and
 * can explain itself.
 */
export const SoonOverlay = memo(function SoonOverlay({
  label = 'Coming soon',
}: {
  label?: string;
}) {
  return (
    <View style={styles.veil} pointerEvents="none">
      <View style={styles.pill}>
        <Icon name="lock" size={11} color={styles.text.color} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
});
