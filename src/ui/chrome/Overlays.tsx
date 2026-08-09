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
import { apothecary } from '@/theme/apothecary';
import { ui } from '@/theme/colors';
import { s } from '@/theme/scale';
import { Icon } from '../Icon';
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
              Two slots, and which button lands in which depends on what the
              left one holds.

              Against a *cancel*, confirm sits on the right. The pair reads
              "back out / go on" and go-on belongs at the end of that line —
              which is also where every platform dialog puts it, so a Switch on
              the left is a Cancel where the muscle memory says Confirm.

              Against an *offer*, the roles swap. Both buttons pay and one pays
              more, so the offer is what the row is steering towards: it takes
              the right and the primary face, and the plain confirm steps left
              as a ghost.
            */}
            {showLeft ? (
              <GlossButton
                label={
                  showSecondary
                    ? (modal.confirmLabel ?? 'OK')
                    : (modal.cancelLabel ?? 'Cancel')
                }
                variant="ghost"
                /* The glyph follows the *action*, not the slot. Against an
                   offer this slot holds confirm and takes `confirmIcon`;
                   against a question it is Cancel, which carries none — a mark
                   on "not now" is decoration on a way out. */
                trailing={
                  showSecondary && modal.confirmIcon ? (
                    <Icon
                      name={modal.confirmIcon}
                      size={s(15)}
                      color={apothecary.goldLight}
                    />
                  ) : undefined
                }
                onPress={showSecondary ? confirm : closeModal}
                size="dialog"
                style={styles.button}
              />
            ) : null}
            <GlossButton
              label={
                showSecondary
                  ? (modal.secondaryLabel ?? 'More')
                  : (modal.confirmLabel ?? 'OK')
              }
              variant="primary"
              /* `onGold`, because this is the lit face. The same glyph would be
                 invisible here in the ghost button's pale gold. */
              trailing={(() => {
                const name = showSecondary ? modal.secondaryIcon : modal.confirmIcon;
                return name ? (
                  <Icon name={name} size={s(15)} color={ui.onGold} />
                ) : undefined;
              })()}
              onPress={showSecondary ? secondary : confirm}
              size="dialog"
              style={showLeft ? styles.button : styles.buttonSingle}
            />
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
