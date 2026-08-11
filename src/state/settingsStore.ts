import { create } from 'zustand';

import { DEFAULT_DIFFICULTY, isDifficulty, type Difficulty } from '@/game/difficulty';
import { DEFAULT_SKIN, skinFor } from '@/theme/skins';
import { readJson, writeJson } from './storage';

export interface Settings {
  /** Master sound. Everything audible is gated on this (spec §7). */
  sound: boolean;
  /** A tick on every vial tap, separate from pour and win sounds. */
  tapSound: boolean;
  haptics: boolean;
  /** Embossed symbols per colour, doc §9 / spec §9. */
  colourblind: boolean;
  dailyReminder: boolean;
  difficulty: Difficulty;
  /**
   * Which vessel the board is drawn in. Cosmetic; see `theme/skins.ts`.
   *
   * Here rather than in `economyStore` beside `owned` on purpose: what you own
   * is a purchase record and what you have equipped is a preference, and the
   * two answer different questions. Buying a second skin must not silently
   * change the board.
   */
  skin: string;
}

export type ToggleKey = 'sound' | 'tapSound' | 'haptics' | 'colourblind' | 'dailyReminder';

export interface SettingsState extends Settings {
  toggle: (key: ToggleKey) => void;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setDifficulty: (difficulty: Difficulty) => void;
}

const KEY = 'settings.v3';

const DEFAULTS: Settings = {
  sound: true,
  tapSound: true,
  haptics: true,
  colourblind: false,
  dailyReminder: false,
  difficulty: DEFAULT_DIFFICULTY,
  skin: DEFAULT_SKIN,
};

function load(): Settings {
  const stored = readJson<Partial<Settings>>(KEY, {});
  return {
    sound: stored.sound ?? DEFAULTS.sound,
    tapSound: stored.tapSound ?? DEFAULTS.tapSound,
    haptics: stored.haptics ?? DEFAULTS.haptics,
    colourblind: stored.colourblind ?? DEFAULTS.colourblind,
    dailyReminder: stored.dailyReminder ?? DEFAULTS.dailyReminder,
    difficulty: isDifficulty(stored.difficulty) ? stored.difficulty : DEFAULT_DIFFICULTY,
    // Validated, not trusted: the record outlives the build that wrote it, so
    // a skin that has since been renamed or dropped comes back as the default
    // rather than as a board with no glass on it.
    skin: skinFor(stored.skin ?? '').id,
  };
}

function persist(state: Settings): void {
  const { sound, tapSound, haptics, colourblind, dailyReminder, difficulty, skin } = state;
  writeJson(KEY, {
    sound,
    tapSound,
    haptics,
    colourblind,
    dailyReminder,
    difficulty,
    skin,
  });
}

/**
 * Kept apart from the game store on purpose: flipping a toggle must not
 * re-render the board, and the board changing must not touch settings.
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),

  toggle: (key) => {
    set({ [key]: !get()[key] } as Pick<Settings, ToggleKey>);
    persist(get());
  },

  set: (key, value) => {
    set({ [key]: value } as Pick<Settings, typeof key>);
    persist(get());
  },

  setDifficulty: (difficulty) => {
    if (get().difficulty === difficulty) return;
    set({ difficulty });
    persist(get());
  },
}));

/** Read settings outside React — handlers should not subscribe to them. */
export function currentSettings(): Settings {
  const { sound, tapSound, haptics, colourblind, dailyReminder, difficulty, skin } =
    useSettingsStore.getState();
  return {
    sound,
    tapSound,
    haptics,
    colourblind,
    dailyReminder,
    difficulty,
    skin,
  };
}
