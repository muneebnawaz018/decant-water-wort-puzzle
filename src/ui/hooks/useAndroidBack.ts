import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Android's back gesture and button, routed to one handler.
 *
 * RN does not wire this up for anything: the platform sends the event to the
 * app and, with no subscriber, Android's default is to finish the activity. So
 * back from the shop closed the whole game rather than returning home, on every
 * Android device — the one navigation control the platform guarantees, doing
 * the worst possible thing.
 *
 * The handler returns true when it has dealt with the press, and false to let
 * Android have it. False is the right answer exactly once, on Home: backing out
 * of the top of the app is the platform behavior and overriding it traps the
 * player in a game they cannot leave.
 *
 * iOS has no such event and `BackHandler` is a no-op there, so this needs no
 * platform check.
 */
export function useAndroidBack(onBack: () => boolean): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, [onBack]);
}
