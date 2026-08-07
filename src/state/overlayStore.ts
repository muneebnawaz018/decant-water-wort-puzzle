import { create } from 'zustand';

export interface ModalSpec {
  title: string;
  body: string;
  /** Label for the confirming button. */
  confirmLabel?: string;
  /** Omitted for a single-button acknowledgement. */
  cancelLabel?: string | null;
  onConfirm?: () => void;
}

export interface OverlayState {
  modal: ModalSpec | null;
  toast: string | null;
  /** Bumped per toast so the same text twice still re-triggers the animation. */
  toastId: number;
  /**
   * The settings drawer.
   *
   * Here rather than in `Root`'s state because the control that opens it is the
   * top bar's hamburger, which every screen draws for itself, while the drawer
   * is mounted once above them all. Threading a callback down through each
   * screen would make every one of them a route to settings.
   */
  drawer: boolean;

  showModal: (spec: ModalSpec) => void;
  closeModal: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

/**
 * Modal and toast live in their own store so any screen can raise one without
 * threading callbacks through the tree, and so raising one never re-renders
 * the screen underneath.
 */
export const useOverlayStore = create<OverlayState>((set, get) => ({
  modal: null,
  toast: null,
  toastId: 0,
  drawer: false,

  showModal: (spec) => set({ modal: spec }),
  closeModal: () => set({ modal: null }),
  showToast: (message) => set({ toast: message, toastId: get().toastId + 1 }),
  clearToast: () => set({ toast: null }),
  openDrawer: () => set({ drawer: true }),
  closeDrawer: () => set({ drawer: false }),
}));

/** Raise a modal or toast from a handler without subscribing to the store. */
export const overlay = {
  modal: (spec: ModalSpec) => useOverlayStore.getState().showModal(spec),
  toast: (message: string) => useOverlayStore.getState().showToast(message),
  drawer: () => useOverlayStore.getState().openDrawer(),
};
