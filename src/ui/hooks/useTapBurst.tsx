import LottieView from 'lottie-react-native';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { styles } from './useTapBurst.styles';

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

/**
 * The last frame of each burst, read off the composition it belongs to.
 *
 * **`play(0)` does not mean "play from the start" on Android, and that is not a
 * guess — it is what the view manager does.** The JS layer defaults the second
 * argument to `-1`, and the Android side only takes the restart path when *both*
 * frames are given:
 *
 * ```kotlin
 * val withCustomFrames = startFrame != -1 && endFrame != -1
 * ...
 * if (withCustomFrames) view.playAnimation() else view.resumeAnimation()
 * ```
 *
 * `resumeAnimation` picks up wherever the player happens to be, so a burst that
 * has already run sits at its last frame and a press produces nothing. iOS
 * restarts from the given frame either way, which is exactly why this looked
 * like a rendering problem on one platform rather than an argument problem on
 * both.
 *
 * Passing a real end frame puts Android on `setMinAndMaxFrame` +
 * `playAnimation`, which always starts at the minimum. Read from the JSON's own
 * `op` rather than written down, so replacing an animation cannot leave a stale
 * number behind that silently truncates it.
 */
const LAST_FRAME: Record<BurstTone, number> = {
  light: BURSTS.light.op,
  dark: BURSTS.dark.op,
};

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
    // Both frames, always. See `LAST_FRAME` — one argument is a no-op on
    // Android once the burst has played through.
    lottie.current?.play(0, LAST_FRAME[tone]);
  }, [tone]);

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
        /**
         * `contain`, not `cover`.
         *
         * The rings expand to the full width of their 300×300 canvas. Under
         * `cover` the composition is scaled to fill the button's longer axis,
         * so on any face that is not square the ring runs off the short one —
         * and `styles.burst` clips it there. What you see is not a ring at all
         * but the clip: four straight edges growing outward, a rectangle.
         *
         * `contain` fits the whole canvas inside the face, so the ring never
         * reaches an edge and nothing is cut. It plays smaller on a wide
         * button, which is the right trade — a burst that reads as a burst.
         */
        resizeMode="contain"
        style={styles.fill}
      />
    </View>
  );

  return { node, fire };
}
