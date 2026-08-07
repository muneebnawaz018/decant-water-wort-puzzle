import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { styles } from './styles/useTapBurst.styles';

/**
 * The burst that plays where a button is pressed, in two tones.
 *
 * One file was not enough: gold rings on a gold face are invisible, which is
 * most of the app's primary buttons. The same animation is drawn a second time
 * in the ink this app prints *on* gold, and the caller says which surface it
 * is on.
 *
 * Both are placeholders — two rings expanding out of the centre. Replace them
 * and every button in the app changes; see `assets/lottie/README.md` for what
 * to check on a downloaded animation.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const BURSTS = {
  /** For a dark face: pale gold rings. */
  light: require('../../../assets/lottie/tap.json'),
  /** For a lit gold face: dark rings, the same ink as the label. */
  dark: require('../../../assets/lottie/tap-dark.json'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

export type BurstTone = keyof typeof BURSTS;

export interface TapBurst {
  /** Render inside the button's clipped face, above the fill. */
  node: ReactNode;
  /** Call on press. Restarts from frame zero if one is already running. */
  fire: () => void;
}

/**
 * A Lottie flourish on press, shared by every button.
 *
 * One animation for the whole app rather than one per icon, and that is the
 * point rather than a compromise. Thirty free icon animations come from thirty
 * authors and never match; a single burst is one file, one style, and it plays
 * over whatever glyph the button happens to carry.
 *
 * It is driven imperatively through the ref, not by mounting a fresh player on
 * every tap. Mounting is what a `key` bump would do, and it costs a native view
 * per press — visible as a hitch on Android, where the player is inflated
 * rather than reused.
 *
 * `autoPlay` is off and the view is mounted from the start. A player that
 * appears on first press has to be inflated during the press, which is exactly
 * when there is no frame budget for it.
 */
export function useTapBurst(tone: BurstTone = 'light'): TapBurst {
  const lottie = useRef<LottieView>(null);

  const fire = useCallback(() => {
    lottie.current?.play(0);
  }, []);

  /**
   * Clear the player on mount, and again the moment a burst ends.
   *
   * Fabric recycles native views by class, and `lottie-react-native`'s Android
   * view manager resets nothing when a view is dropped — it implements no
   * `prepareToRecycleView`. So the `LottieAnimationView` behind a button that
   * has been pressed is handed to the *next* button of the same kind that
   * mounts, carrying Lottie's own `playAnimationWhenShown` flag with it, and
   * that flag fires `playAnimation()` on re-attach. The symptom is a burst
   * playing by itself when you navigate back to a screen, with nobody having
   * touched anything.
   *
   * `autoPlay={false}` cannot prevent it: it is a mount-time prop applied to a
   * view that was already told to play. Only clearing the state does, hence
   * both halves — on mount for a view arriving dirty, on finish so this one
   * never leaves in that state to begin with.
   */
  const clear = useCallback(() => {
    lottie.current?.reset();
  }, []);

  useEffect(clear, [clear]);

  const node = (
    // The wrapper carries `pointerEvents`: `LottieView` does not take it, and
    // it covers the whole face, so without it the button stops answering taps
    // after the first one.
    <View style={styles.burst} pointerEvents="none">
      <LottieView
        ref={lottie}
        source={BURSTS[tone]}
        autoPlay={false}
        loop={false}
        onAnimationFinish={clear}
        resizeMode="cover"
        style={styles.fill}
      />
    </View>
  );

  return { node, fire };
}
