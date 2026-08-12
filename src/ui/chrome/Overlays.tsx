import LottieView from 'lottie-react-native';
import { memo, useCallback, useEffect, useRef } from 'react';
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
import { AdVeil } from './AdVeil';
import { GlossButton } from './GlossButton';
import { Panel } from './Panel';
import { styles } from './Overlays.styles';

/**
 * The two bursts, keyed by what they mean.
 *
 * `confetti` is "this is finished" — a level solved, a week completed.
 * `coins` is "you have been paid", and it is what every rewarded ad ends with:
 * the player watched a video on the promise of coins, so the animation that
 * marks it should be the coins arriving rather than a celebration of the ad.
 *
 * Both are required at module scope so Metro resolves them once and the same
 * parsed source is handed to every play. See `assets/lottie/README.md`.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const BURSTS = {
  confetti: require('../../../assets/lottie/win.json'),
  coins: require('../../../assets/lottie/coins.json'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

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
      {/* Over the modal, because the daily offer is raised from a dialog's own
          button and takes the dialog down with it. */}
      <AdVeil />
      {/* Last, so the burst is above all of them. It is the loudest thing the
          app ever shows and it lasts 1.6 seconds. */}
      <CelebrationHost />
    </>
  );
});

const ModalHost = memo(function ModalHost() {
  const modal = useOverlayStore((state) => state.modal);
  const modalId = useOverlayStore((state) => state.modalId);
  const closeModal = useOverlayStore((state) => state.closeModal);

  /**
   * Open at full size if a dialog is already up when this mounts.
   *
   * The card sprang from 0.9 on every mount, and a spring with this damping
   * overshoots — which is fine as an entrance and wrong as a re-entrance. A
   * full-screen ad closing remounts this host with the dialog still open, so
   * the reward card grew past its size and settled back every time an ad
   * finished. Reported on both platforms; the ad activity is the trigger.
   */
  const scale = useSharedValue(modal ? 1 : 0.9);

  /**
   * Which dialog the spring has already played for.
   *
   * Keyed on `modalId` rather than on the spec's identity: the id changes once
   * per dialog raised, where identity also changes on a remount. Seeded with
   * whatever is open at mount, so the animation is skipped for a card that was
   * already on screen and runs normally for the next one.
   */
  const animatedFor = useRef(modal ? modalId : null);

  useEffect(() => {
    if (!modal) {
      scale.value = withTiming(0.9, { duration: 120 });
      animatedFor.current = null;
      return;
    }

    if (animatedFor.current === modalId) return;
    animatedFor.current = modalId;
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
  }, [modal, modalId, scale]);

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

  /**
   * Which button gets the right slot and the lit face.
   *
   * Three arrangements, and working them out here rather than inside the JSX is
   * what keeps it readable — the labels, the glyphs, the handlers and the styles
   * were each branching on the same two conditions in four separate expressions,
   * and adding a third arrangement to that would have meant twelve.
   *
   * - **A question.** Confirm on the right, lit. The pair reads "back out / go
   *   on", and go-on belongs at the end of that line — which is where every
   *   platform dialog puts it, so a `Switch` on the left is a Cancel where the
   *   muscle memory says Confirm.
   * - **An offer** (`onSecondary`). Both buttons pay and one pays more, so the
   *   offer takes the right and the lit face, and the plain confirm steps left
   *   as a ghost.
   * - **A warning** (`destructive`). The roles swap again: staying put takes the
   *   right and the lit face, and the action that costs something steps left.
   *   The dialog exists because the press that opened it was probably a mistake,
   *   so the emphasis belongs on the answer that undoes it.
   *
   * The glyph follows the *action*, not the slot — `confirmIcon` travels with
   * confirm wherever it lands.
   */
  const destructive = modal.destructive === true && !showSecondary;

  const left = showSecondary
    ? { label: modal.confirmLabel ?? 'OK', icon: modal.confirmIcon, onPress: confirm }
    : destructive
      ? { label: modal.confirmLabel ?? 'OK', icon: modal.confirmIcon, onPress: confirm }
      : { label: modal.cancelLabel ?? 'Cancel', icon: undefined, onPress: closeModal };

  const right = showSecondary
    ? {
        label: modal.secondaryLabel ?? 'More',
        icon: modal.secondaryIcon,
        onPress: secondary,
      }
    : destructive
      ? { label: modal.cancelLabel ?? 'Cancel', icon: undefined, onPress: closeModal }
      : { label: modal.confirmLabel ?? 'OK', icon: modal.confirmIcon, onPress: confirm };

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
            {showLeft ? (
              <GlossButton
                label={left.label}
                variant="ghost"
                trailing={
                  left.icon ? (
                    <Icon name={left.icon} size={s(15)} color={apothecary.goldLight} />
                  ) : undefined
                }
                onPress={left.onPress}
                size="dialog"
                style={styles.button}
              />
            ) : null}
            <GlossButton
              label={right.label}
              variant="primary"
              /* `onGold`, because this is the lit face. The same glyph would be
                 invisible here in the ghost button's pale gold. */
              trailing={
                right.icon ? (
                  <Icon name={right.icon} size={s(15)} color={ui.onGold} />
                ) : undefined
              }
              onPress={right.onPress}
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
        source={BURSTS[celebration.kind]}
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
