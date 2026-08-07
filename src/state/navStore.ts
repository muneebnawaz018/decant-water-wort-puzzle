import { create } from 'zustand';

/** The four destinations the nav bar reaches. Home is not one — it is the root. */
export type NavDestination = 'daily' | 'shop' | 'stages' | 'stats';

export interface NavState {
  /** A destination something has asked for, or null once `Root` has taken it. */
  request: NavDestination | null;
  go: (destination: NavDestination) => void;
  clear: () => void;
}

/**
 * A place for chrome to ask for a screen without being handed a router.
 *
 * `Root` still owns which screen is mounted; this only carries the *request*.
 * The reason it exists is the same one the settings drawer has in
 * `overlayStore`: the coin pill is drawn by every page frame, and the shortcut
 * on it goes to the shop — so without this, every screen would have to take a
 * navigation callback it makes no other use of, and `ScrollPage` would become a
 * router that each screen configures.
 *
 * It is a request rather than the screen itself because `Root` has three other
 * ways in (the bar, Home's chips, the hardware back button) and one owner of
 * that state is the thing worth keeping.
 */
export const useNavStore = create<NavState>((set) => ({
  request: null,
  go: (destination) => set({ request: destination }),
  clear: () => set({ request: null }),
}));

/** Ask for a screen from a handler, without subscribing to the store. */
export const nav = {
  go: (destination: NavDestination) => useNavStore.getState().go(destination),
};
