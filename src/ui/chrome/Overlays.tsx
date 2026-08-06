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
    closeModal();
  }, [modal, closeModal]);

  if (!modal) return null;

  const showCancel = modal.cancelLabel !== null;

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
          <View style={showCancel ? styles.buttons : styles.buttonsSingle}>
            {showCancel ? (
              <GlossButton
                label={modal.cancelLabel ?? 'Cancel'}
                variant="ghost"
                onPress={closeModal}
                size="dialog"
                style={styles.button}
              />
            ) : null}
            <GlossButton
              label={modal.confirmLabel ?? 'OK'}
              variant="primary"
              onPress={confirm}
              size="dialog"
              style={showCancel ? styles.button : styles.buttonSingle}
            />
          </View>
        </Panel>
      </Animated.View>
    </Animated.View>
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
