import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { s } from '@/theme/scale';
import { NAV_BAR_HEIGHT } from '../chrome/styles/NavBar.styles';

/** Breathing room under the last card so it clears the home indicator. */
const SCROLL_TAIL = s(30);

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
        paddingBottom: insets.bottom + SCROLL_TAIL + NAV_BAR_HEIGHT,
      },
      sides: { paddingLeft: insets.left, paddingRight: insets.right },
    }),
    [insets.top, insets.bottom, insets.left, insets.right]
  );
}
