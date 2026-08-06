import { StyleSheet } from 'react-native';

import { apothecary, GRADIENT_BORDER_FILL, SPACE } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { text } from '@/theme/typography';
export const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(14),
    paddingHorizontal: SPACE.screen,
    paddingTop: s(12),
    paddingBottom: s(10),
  },
  /**
   * Centred on the header, not on the space left over beside the buttons.
   *
   * Absolute rather than a flexed middle column: the back button is always
   * there but the trailing slot is empty on Settings and a coin pill on Shop,
   * so a flexed title centres itself somewhere different on each screen. Taken
   * out of the flow it centres on the header, and the two buttons sit over it.
   *
   * The side padding is the button plus the row's gap, so a long title wraps or
   * truncates before it can run under either one.
   */
  titleSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: SPACE.screen + s(42) + s(14),
  },
  title: { ...text.screenTitle, textAlign: 'center' },
  /** Pushes the trailing slot to the right end, now the title is out of flow. */
  filler: { flex: 1 },
  trailing: { minWidth: 0 },

  button: {
    width: s(42),
    height: s(42),
    borderRadius: s(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: apothecary.line,
    // Android insets a view's background by its border width; iOS paints under
    // it. On a `LinearGradient` that leaves a 1dp ring inside the border with
    // the screen showing through it — visible as a gap at every corner, on
    // Android only. A solid fill behind the gradient closes it. See
    // `GRADIENT_BORDER_FILL` for the whole story.
    backgroundColor: GRADIENT_BORDER_FILL,
    shadowColor: ui.shadow,
    shadowOpacity: 0.35,
    shadowRadius: s(14),
    shadowOffset: { width: 0, height: s(5) },
    elevation: 5,
  },
  dimmed: { opacity: 0.42 },
});
