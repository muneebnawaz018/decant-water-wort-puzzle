import { useCallback } from 'react';

import { feedbackControl } from '../feedback';

/**
 * Wraps a press handler.
 *
 * It used to tick on every press that went through the app's chrome, and that
 * was too much. Vibration on every menu button, tab, settings row and stage
 * tile is constant, and constant feedback carries no information — by the time
 * you reach the board, the buzz that means "your pour landed" is the fifth
 * identical buzz of the last ten seconds.
 *
 * Haptics are now a thing that happens **while you play**: the board's taps,
 * and the board's own controls through `haptic`. Everything else is silent, so
 * a player who wants to feel the game no longer has to feel the menus too.
 *
 * A disabled `Pressable` never calls `onPress`, so a dead control stays silent
 * without a check here. That is the rule this exists to hold: the vibration
 * means something happened, so a tap that changes nothing must not have one.
 *
 * Identity is stable for a stable `onPress`, so wrapping does not defeat the
 * `memo` on any of these components.
 */
export function useTapHandler(onPress: () => void, haptic = false): () => void {
  return useCallback(() => {
    if (haptic) feedbackControl();
    onPress();
  }, [onPress, haptic]);
}
