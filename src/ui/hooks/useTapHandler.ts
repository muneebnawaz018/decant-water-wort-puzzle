import { useCallback } from 'react';

import { soundClick } from '@/audio/sounds';
import { feedbackControl } from '../feedback';

/**
 * Wraps a press handler. Every pressable in the app's chrome routes through
 * here, which is what lets the two feedback channels hold different scopes
 * without any button having to know about either.
 *
 * **Sound: every button, under its own toggle.** `soundClick` fires on each
 * press and gates itself on `sound` *and* `tapSound`, so the "Taps &
 * buttons" switch is the one place that decides whether the chrome clicks. It is the
 * chrome's *own* cue — a 12ms UI click, not the board's glass tick, so menus
 * do not sound like the game. It sits here rather than in each component for
 * the same reason the haptic does — added per screen it was on four buttons
 * and missing from the rest.
 *
 * **Haptics: only while you play.** The buzz used to fire on every press that
 * went through here too, and that was too much — vibration on every menu
 * button, tab and settings row is constant, and constant feedback carries no
 * information. By the board, the buzz that means "your pour landed" was the
 * fifth identical buzz in ten seconds. So the motor answers the board's taps
 * and the board's own controls (`haptic`), and the menus stay still. The two
 * channels diverging on purpose is the design, not an inconsistency: a click
 * is chrome answering your finger, a buzz is the game answering your move.
 *
 * A disabled `Pressable` never calls `onPress`, so a dead control stays silent
 * on both channels without a check here. That is the rule this exists to
 * hold: feedback means something happened, so a tap that changes nothing must
 * not have any.
 *
 * Identity is stable for a stable `onPress`, so wrapping does not defeat the
 * `memo` on any of these components.
 */
export function useTapHandler(onPress: () => void, haptic = false): () => void {
  return useCallback(() => {
    soundClick();
    if (haptic) feedbackControl();
    onPress();
  }, [onPress, haptic]);
}
