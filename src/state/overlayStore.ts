import { create } from 'zustand';

import type { IconName } from '@/theme/icons';

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
   * Confirming costs the player something, so *cancel* gets the emphasis.
   *
   * It moves the cancel to the right slot and the lit gold face, and sends
   * confirm left as a ghost. Two dialogs set it — leaving a board and switching
   * difficulty — and both share the same shape: the press that opened them was
   * very likely a mis-tap, and the answer worth making easy is the one that
   * undoes it.
   *
   * **Opt-in, not the default for every confirm.** Most dialogs here ask
   * something benign — turn vibration on, enable reminders, watch for coins —
   * and lighting up `Not now` in those would steer players away from the thing
   * they had just asked for. The flag marks the dialogs where the safe answer is
   * genuinely the better one, rather than making the app timid everywhere.
   *
   * Ignored alongside `onSecondary`: an offer already claims the right slot, and
   * a dialog whose two buttons both pay has no destructive side to protect.
   */
  destructive?: boolean;
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
  /**
   * Hold a message until the screen that should carry it is on.
   *
   * A level's rewards are settled the moment the board solves — coins land
   * there on purpose, so backing out of the win animation cannot cost them —
   * but that is the *start* of the winning pour, a whole `POUR_MS` before the
   * Complete screen exists. Toasted then, "Block 1 complete · +120 coins"
   * appeared over the board mid-pour and was gone before the player arrived
   * anywhere it made sense.
   *
   * Queued rather than delayed by a timer. The old skin-unlock toast did use a
   * timer, tuned to sit past the win animation, and it was a number that had to
   * be re-guessed every time the animation moved — plus a leaked Jest handle it
   * needed `unref` to work around. "When the Complete screen mounts" is the
   * actual requirement, so it is what the code now says.
   */
  queueToast: (message: string) => void;
  /** Shows queued messages in order, spaced so each is readable. */
  flushToasts: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

/**
 * Gap between queued toasts.
 *
 * `TOAST_MS` in `Overlays.tsx` is 1800, so this leaves a beat of clear screen
 * between two messages rather than swapping the text under the player's eyes.
 */
const TOAST_GAP_MS = 2600;

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

  queueToast: (message) => {
    queued.push(message);
  },

  flushToasts: () => {
    if (queued.length === 0) return;
    // Drained before anything is shown, so a flush that arrives twice — a
    // remount, a Fast Refresh — cannot replay the same messages.
    const messages = queued.splice(0, queued.length);
    messages.forEach((message, index) => {
      if (index === 0) {
        get().showToast(message);
        return;
      }
      setTimeout(() => get().showToast(message), index * TOAST_GAP_MS);
    });
  },

  openDrawer: () => set({ drawer: true }),
  closeDrawer: () => set({ drawer: false }),
}));

/**
 * The waiting messages.
 *
 * Outside the store deliberately: nothing renders from it, and putting it in
 * state would re-render every subscriber each time a message is added or
 * drained — for a list nobody displays.
 */
const queued: string[] = [];

/** Raise a modal or toast from a handler without subscribing to the store. */
export const overlay = {
  modal: (spec: ModalSpec) => useOverlayStore.getState().showModal(spec),
  toast: (message: string) => useOverlayStore.getState().showToast(message),
  /** Hold a message for the Complete screen. See `queueToast`. */
  queueToast: (message: string) => useOverlayStore.getState().queueToast(message),
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
