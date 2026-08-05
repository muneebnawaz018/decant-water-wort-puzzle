import { useCallback } from 'react';

import { feedbackTap } from '../feedback';

/**
 * Wraps a press handler so it ticks before it runs.
 *
 * Lives in the shared button components rather than at their call sites, which
 * is the whole point: a tick added per screen is a tick forgotten per screen,
 * and the app had it on four of its buttons and none of the rest. Every press
 * that goes through this chrome now buzzes, and nothing has to remember to ask.
 *
 * A disabled `Pressable` never calls `onPress`, so a dead control stays silent
 * without a check here. That is the rule this exists to hold: the vibration
 * means something happened, so a tap that changes nothing must not have one.
 *
 * Identity is stable for a stable `onPress`, so wrapping does not defeat the
 * `memo` on any of these components.
 */
export function useTapHandler(onPress: () => void): () => void {
  return useCallback(() => {
    feedbackTap();
    onPress();
  }, [onPress]);
}
