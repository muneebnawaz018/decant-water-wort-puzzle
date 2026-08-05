import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Breathing room under the last card so it clears the home indicator. */
const SCROLL_TAIL = 30;

export interface ScreenPadding {
  /** For a screen root that owns its own header. */
  top: { paddingTop: number };
  /** For a screen that also ends at the bottom edge. */
  frame: { paddingTop: number; paddingBottom: number };
  /** For the content container of a scroll view inside such a screen. */
  scrollTail: { paddingBottom: number };
}

/**
 * Safe-area padding, pre-shaped into the three forms the screens actually use.
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
      scrollTail: { paddingBottom: insets.bottom + SCROLL_TAIL },
    }),
    [insets.top, insets.bottom]
  );
}
