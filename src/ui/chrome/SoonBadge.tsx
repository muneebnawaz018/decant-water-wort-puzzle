import { memo } from 'react';
import { Text, View } from 'react-native';

import { styles } from './styles/SoonBadge.styles';

/**
 * "Soon" — a small pill on anything the UI shows but cannot yet deliver.
 *
 * It exists because the alternative is worse: a Buy button that takes 200 coins
 * and changes nothing on screen is indistinguishable from a bug, and a player
 * who spends into it has been charged for nothing. Marking the gap is honest
 * and costs one component.
 */
export const SoonBadge = memo(function SoonBadge({ label = 'Soon' }: { label?: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
});
