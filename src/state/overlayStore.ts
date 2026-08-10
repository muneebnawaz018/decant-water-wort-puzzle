import { create } from 'zustand';

import type { IconName } from '@/ui/Icon';

export interface ModalSpec {
  title: string;
  body: string;
  /** Label for the confirming button. */
  confirmLabel?: string;
  /**
   * Glyphs for the two action buttons, named rather than passed as nodes.
   *
   * A `ModalSpec` is data raised from a handler — `confirmDifficulty`, the
   * reward dialog — and several of those live outside React entirely. Holding
   * an `IconName` keeps the spec serialisable and leaves `Overlays` to decide
   * the size and colour each variant needs, which it already does for the
   * labels.
   *
   * Both optional, because most dialogs are questions rather than offers and a
   * glyph on `OK` is decoration. The reward dialog is the case that wants them:
   * its two buttons both pay, so the words alone do not say which is which —
   * the same problem the Complete screen solved with a video mark on the
   * doubling offer and a tick on the plain one.
   */
  confirmIcon?: IconName;
  secondaryIcon?: IconName;
  /** Omitted for a single-button acknowledgement. */
  cancelLabel?: string | null;
  onConfirm?: () => void;
  /**
   * A second *action* beside confirm, rather than a way out.
   *
   * The left slot in a two-button dialog is normally Cancel and does nothing
   * but close. This turns it into a real choice — the daily reward's "watch an
   * ad for double" — which the cancel slot could not express: a button labelled
   * `Watch ad` that runs `closeModal` is a dismissal wearing an offer's words.
   *
   * The scrim still dismisses, so nothing is trapped by taking the slot.
   * `stayOpen` applies to this the same way it applies to confirm.
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /**
   * Confirm runs `onConfirm` but leaves the card up — whatever `onConfirm`
   * started is now responsible for calling `closeModal`.
   *
   * For the reward dialog, where Collect plays the burst *over* the card and
   * the burst's own finish is what dismisses it. Without this the host closes
   * the card in the same press, and the celebration plays over an already
   * empty screen — which is the sequencing bug this flag exists to prevent
   * happening silently.
   */
  stayOpen?: boolean;
}

/**
 * A celebration playing over everything, and what to do when it lands.
 *
 * `id` is a nonce, not an index. Two claims in a row raise identical specs, and
 * without something changing the second would not remount the player — it would
 * show the tail of the first.
 */
type CelebrationKind =
  /** Confetti. "This is finished" — a level solved, a week completed. */
  | 'confetti'
  /**
   * Coins raining up from the bottom. "You have been paid."
   *
   * A separate animation rather than the confetti again, because they answer
   * different questions. Every rewarded ad ends in this one: the player watched
   * a video on the promise of coins, and the coins arriving is the whole point
   * of the transaction — confetti would celebrate the ad.
   */
  | 'coins';

interface CelebrationSpec {
  id: number;
  kind: CelebrationKind;
  /** Run once the burst finishes. Where the reward dialog is raised. */
  onDone?: () => void;
}

export interface OverlayState {
  modal: ModalSpec | null;
  /**
   * Bumped every time a dialog is raised.
   *
   * The open animation keys off this rather than off `modal`'s identity, so it
   * runs once per dialog and not once per mount. `ModalHost` can be remounted
   * with a dialog already on screen — coming back from a full-screen ad does
   * exactly that — and re-running a spring there makes an open card jump.
   */
  modalId: number;
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

  /**
   * The burst on screen right now, if any.
   *
   * Its own piece of state rather than a flag on the modal, because the two are
   * *sequential*: the confetti is the reward being paid, and the dialog is the
   * receipt. Played together the dialog covers the middle of the burst and the
   * player reads text through falling confetti — each one spoiling the other.
   */
  celebration: CelebrationSpec | null;

  showModal: (spec: ModalSpec) => void;
  closeModal: () => void;
  /** Plays a burst. `onDone` fires when it finishes, not when it starts. */
  celebrate: (kind: CelebrationKind, onDone?: () => void) => void;
  /** Clears it, and runs whatever was queued behind it. */
  endCelebration: () => void;
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
  modalId: 0,
  toast: null,
  toastId: 0,
  drawer: false,
  celebration: null,

  showModal: (spec) => set({ modal: spec, modalId: get().modalId + 1 }),
  closeModal: () => set({ modal: null }),
  celebrate: (kind, onDone) =>
    set({ celebration: { id: (get().celebration?.id ?? 0) + 1, kind, onDone } }),
  endCelebration: () => {
    const done = get().celebration?.onDone;
    // Cleared before the callback runs, so a callback that raises another
    // celebration is not immediately wiped by this one's own teardown.
    set({ celebration: null });
    done?.();
  },
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
  celebrate: (onDone?: () => void) =>
    useOverlayStore.getState().celebrate('confetti', onDone),
  /**
   * The payout shower, for every place an ad or a claim pays out.
   *
   * Separate from `celebrate` rather than a second argument at the call sites,
   * because "coins landed" is a thing several unrelated handlers want to say
   * and none of them should have to know the kind exists.
   */
  coins: (onDone?: () => void) => useOverlayStore.getState().celebrate('coins', onDone),
  closeModal: () => useOverlayStore.getState().closeModal(),
};
