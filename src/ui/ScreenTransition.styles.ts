import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  /**
   * Absolute, not `flex: 1`.
   *
   * For the length of a transition the outgoing screen and the incoming one are
   * both mounted. As flex siblings in a column they divide the height between
   * them — two half-height screens stacked, each with its own header, which is
   * what "the stages overlap" was. Taken out of flow they occupy the same box
   * and simply cross-fade, which is what the animation always meant.
   *
   * Only Android showed it. Reanimated's exiting view keeps its own snapshot on
   * iOS, so the reflow never reached the screen there.
   */
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
