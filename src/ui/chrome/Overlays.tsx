import LottieView from 'lottie-react-native';
import { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useOverlayStore } from '@/state/overlayStore';
import { GlossButton } from './GlossButton';
import { Panel } from './Panel';
import { styles } from './styles/Overlays.styles';

/**
 * The same placeholder the win screen uses — three gold dots until there is
 * real artwork. One file for both, so a celebration looks the same wherever it
 * is earned; see `assets/lottie/README.md`.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WIN_BURST = require('../../../assets/lottie/win.json');

/** Spec §4.10: toast auto-dismisses after ~1.8s. */
const TOAST_MS = 1800;

/**
 * The global modal and toast (spec §4.10), mounted once above every screen.
 *
 * Both read from `overlayStore`, so a handler anywhere raises one with a
 * single call and nothing below re-renders.
 */
export const Overlays = memo(function Overlays() {
  return (
    <>
      <ModalHost />
      <ToastHost />
      {/* Last, so the burst is above both. It is the loudest thing the app
          ever shows and it lasts 1.6 seconds. */}
      <CelebrationHost />
    </>
  );
});

const ModalHost = memo(function ModalHost() {
  const modal = useOverlayStore((state) => state.modal);
  const closeModal = useOverlayStore((state) => state.closeModal);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    scale.value = modal
      ? withSpring(1, { damping: 14, stiffness: 180 })
      : withTiming(0.9, { duration: 120 });
  }, [modal, scale]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const confirm = useCallback(() => {
    modal?.onConfirm?.();
    // `stayOpen` hands the dismissal to whatever `onConfirm` started — the
    // reward dialog stays up under its burst and closes when the burst does.
    if (!modal?.stayOpen) closeModal();
  }, [modal, closeModal]);

  const secondary = useCallback(() => {
    modal?.onSecondary?.();
    if (!modal?.stayOpen) closeModal();
  }, [modal, closeModal]);

  if (!modal) return null;

  // A secondary action takes the left slot outright: it is an offer, not a way
  // out, and a dialog with Cancel, Watch ad and Collect gives three buttons to
  // a question with two answers. The scrim still dismisses.
  const showSecondary = modal.onSecondary !== undefined;
  const showLeft = showSecondary || modal.cancelLabel !== null;

  return (
    <Animated.View
      style={styles.scrim}
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
    >
      {/* Tapping the scrim dismisses — the same as Cancel, and expected. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />

      <Animated.View style={[styles.cardSlot, animated]}>
        <Panel radius={22} contentStyle={styles.card}>
          <Text style={styles.title}>{modal.title}</Text>
          <Text style={styles.body}>{modal.body}</Text>
          {/*
            `dialog` size on both. The full primary face is ~60dp tall — that
            belongs to Home's Play button, the one thing on that screen you are
            meant to press, and a dialog inheriting it made its own dismissal
            the largest element on screen. `compact` was the overcorrection, at
            34dp.
          */}
          <View style={showLeft ? styles.buttons : styles.buttonsSingle}>
            {/*
              Order depends on what the left slot holds.

              Against a *cancel* the confirm sits right: the pair reads
              "back out / go on", and go-on belongs at the end of that line.
              Against an *offer* it does not. Both buttons pay, one pays more,
              and the bigger of the two is what the row is steering towards —
              so the offer takes the right and the plain confirm steps left.
            */}
            <GlossButton
              label={modal.confirmLabel ?? 'OK'}
              variant={showSecondary ? 'ghost' : 'primary'}
              onPress={confirm}
              size="dialog"
              style={showLeft ? styles.button : styles.buttonSingle}
            />
            {showLeft ? (
              <GlossButton
                label={
                  showSecondary
                    ? (modal.secondaryLabel ?? 'More')
                    : (modal.cancelLabel ?? 'Cancel')
                }
                variant={showSecondary ? 'primary' : 'ghost'}
                onPress={showSecondary ? secondary : closeModal}
                size="dialog"
                style={styles.button}
              />
            ) : null}
          </View>
        </Panel>
      </Animated.View>
    </Animated.View>
  );
});

/**
 * The reward burst, played on its own and *before* the dialog.
 *
 * It used to be a layer behind the modal, and the two fought: the card covers
 * the middle of the screen, which is where the confetti comes from, and the
 * player is asked to read a sentence through falling scraps. Sequenced instead
 * — burst, then receipt — each one gets the screen to itself and the dialog
 * arrives as the thing that summarises what just happened.
 *
 * Mounted only while it plays. A Lottie player left mounted is a native view
 * and a redraw target for as long as it exists, and this one is on screen for
 * a second and a half a day.
 */
const CelebrationHost = memo(function CelebrationHost() {
  const celebration = useOverlayStore((state) => state.celebration);
  const endCelebration = useOverlayStore((state) => state.endCelebration);

  if (!celebration) return null;

  return (
    <View style={styles.celebration} pointerEvents="none">
      <LottieView
        // A nonce, not the content: two claims in a row are identical, and
        // without this the second would resume the first rather than restart.
        key={celebration.id}
        source={WIN_BURST}
        autoPlay
        loop={false}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        // What raises the dialog. Tied to the animation rather than to a
        // `setTimeout` matched to its length, which is a duration written down
        // twice and free to drift the moment the artwork changes.
        onAnimationFinish={endCelebration}
      />
    </View>
  );
});

const ToastHost = memo(function ToastHost() {
  const toast = useOverlayStore((state) => state.toast);
  const toastId = useOverlayStore((state) => state.toastId);
  const clearToast = useOverlayStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, TOAST_MS);
    // Keyed on toastId so a second toast restarts the clock rather than
    // inheriting the first one's remaining time.
    return () => clearTimeout(timer);
  }, [toast, toastId, clearToast]);

  if (!toast) return null;

  return (
    <Animated.View
      style={styles.toast}
      entering={FadeIn.duration(240)}
      exiting={FadeOut.duration(280)}
      pointerEvents="none"
    >
      <Text style={styles.toastText}>{toast}</Text>
    </Animated.View>
  );
});
