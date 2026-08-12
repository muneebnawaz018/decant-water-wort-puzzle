import type { ReactNode } from 'react';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { styles } from './ScreenTransition.styles';

interface ScreenTransitionProps {
  /** Changing this key replays the transition — one per screen. */
  transitionKey: string;
  /** Forward navigation slides; going back just crossfades. */
  direction?: 'forward' | 'fade';
  children: ReactNode;
}

const DURATION = 220;

/**
 * Screen change animation. Entering and exiting animations are declared, so
 * Reanimated runs them on the UI thread and tears them down on unmount — there
 * is no timer or shared value left alive behind the new screen.
 */
export function ScreenTransition({
  transitionKey,
  direction = 'fade',
  children,
}: ScreenTransitionProps) {
  return (
    <Animated.View
      key={transitionKey}
      style={styles.fill}
      entering={
        direction === 'forward'
          ? SlideInRight.duration(DURATION)
          : FadeIn.duration(DURATION)
      }
      exiting={FadeOut.duration(DURATION * 0.6)}
    >
      {children}
    </Animated.View>
  );
}
