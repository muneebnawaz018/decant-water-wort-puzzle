import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { s } from '@/theme/scale';
import { BUMP_RISE, NAV_BAR_HEIGHT, NAV_OFFSET } from '../chrome/NavBar.styles';
import { NAV_FADE } from '../Root.styles';

/**
 * Breathing room under the last card so it clears the home indicator.
 *
 * At least the nav bar's fade band: content that stops short of it is still
 * inside the dissolve and renders half transparent. The `max` says which
 * constraint is doing the work — raise the fade and the tail follows it.
 */
const SCROLL_TAIL = Math.max(s(30), NAV_FADE);

export interface ScreenPadding {
  /** For a screen root that owns its own header. */
  top: { paddingTop: number };
  /** For a screen that also ends at the bottom edge. */
  frame: { paddingTop: number; paddingBottom: number };
  /**
   * For the content container of a scroll view inside such a screen, including
   * room for the nav bar `Root` floats over every screen below the board.
   */
  scrollTailWithNav: { paddingBottom: number };
  /**
   * Left and right safe-area insets, for anything that spans the full width.
   *
   * Zero in portrait on a phone, which is why this went unnoticed: the insets
   * that are not zero belong to landscape and to iPad, where the home indicator
   * and the display cutout push content in from the sides. A screen adds this
   * to its own padding rather than replacing it.
   */
  sides: { paddingLeft: number; paddingRight: number };
}

/**
 * Safe-area padding, pre-shaped into the forms the screens actually use.
 *
 * Every screen was building these inline, which meant the tail padding under a
 * scroll view was `insets.bottom + 30` in five files and would have drifted the
 * first time anyone tuned one of them. Memoised so the style objects keep their
 * identity between renders and do not defeat the memoised children below.
 */
export function useScreenPadding(): ScreenPadding {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      top: { paddingTop: insets.top },
      frame: { paddingTop: insets.top, paddingBottom: insets.bottom },
      scrollTailWithNav: {
        // Four terms, matching Home's `navSlot`. `BUMP_RISE` because the Home
        // button stands proud of the bar's top edge, and `NAV_OFFSET` because
        // `Root` holds the whole bar that far above the safe area — a tail
        // measured to the bar alone leaves the last card half under a gold
        // disc, and one that forgets the offset stops ten short.
        paddingBottom:
          insets.bottom + SCROLL_TAIL + NAV_BAR_HEIGHT + BUMP_RISE + NAV_OFFSET,
      },
      sides: { paddingLeft: insets.left, paddingRight: insets.right },
    }),
    [insets.top, insets.bottom, insets.left, insets.right]
  );
}
