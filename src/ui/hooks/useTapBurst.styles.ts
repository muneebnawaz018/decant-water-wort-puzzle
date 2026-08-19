import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  /**
   * Fills the button's face, and clips to it.
   *
   * `overflow` is not decoration: the animation's canvas is square and a button
   * is not, so `resizeMode="cover"` always has something hanging over an edge.
   */
  burst: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  /**
   * Percentages, not `flex: 1`.
   *
   * On Android `LottieView` measures itself to the composition's own size when
   * its style gives it no resolved width — and `flex: 1` inside an absolutely
   * positioned parent is not one. A 300×300 player then inflated a 42dp chrome
   * button to three times its size, with the composition's bounds showing as a
   * gray square in the corner. iOS resolved the flex and looked correct, which
   * is what made it look like a styling bug rather than a measurement one.
   */
  fill: { width: '100%', height: '100%' },
});
