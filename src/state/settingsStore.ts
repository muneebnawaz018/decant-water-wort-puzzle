import { create } from 'zustand';

import { DEFAULT_DIFFICULTY, isDifficulty, type Difficulty } from '@/game/difficulty';
import { readJson, writeJson } from './storage';

export interface Settings {
  /** Master sound. Everything audible is gated on this (spec §7). */
  sound: boolean;
  music: boolean;
  /** Index into `MUSIC_TRACKS`. */
  musicTrack: number;
  /** A tick on every vial tap, separate from pour and win sounds. */
  tapSound: boolean;
  haptics: boolean;
  /** Embossed symbols per colour, doc §9 / spec §9. */
  colourblind: boolean;
  dailyReminder: boolean;
  difficulty: Difficulty;
}

/** Spec §7. "Off" is the absence of a track, so it is not in the list. */
export const MUSIC_TRACKS = ['Herbarium', 'Rainfall', 'Lo-fi'] as const;

export type ToggleKey =
  'sound' | 'music' | 'tapSound' | 'haptics' | 'colourblind' | 'dailyReminder';

export interface SettingsState extends Settings {
  toggle: (key: ToggleKey) => void;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** Advances to the next track, wrapping. Returns the new track's name. */
  cycleMusic: () => string;
  setDifficulty: (difficulty: Difficulty) => void;
}

const KEY = 'settings.v3';

const DEFAULTS: Settings = {
  sound: true,
  music: true,
  musicTrack: 0,
  tapSound: true,
  haptics: true,
  colourblind: false,
  dailyReminder: false,
  difficulty: DEFAULT_DIFFICULTY,
};

function load(): Settings {
  const stored = readJson<Partial<Settings>>(KEY, {});
  return {
    sound: stored.sound ?? DEFAULTS.sound,
    music: stored.music ?? DEFAULTS.music,
    musicTrack:
      (Math.floor(stored.musicTrack ?? 0) + MUSIC_TRACKS.length) % MUSIC_TRACKS.length,
    tapSound: stored.tapSound ?? DEFAULTS.tapSound,
    haptics: stored.haptics ?? DEFAULTS.haptics,
    colourblind: stored.colourblind ?? DEFAULTS.colourblind,
    dailyReminder: stored.dailyReminder ?? DEFAULTS.dailyReminder,
    difficulty: isDifficulty(stored.difficulty) ? stored.difficulty : DEFAULT_DIFFICULTY,
  };
}

function persist(state: Settings): void {
  const {
    sound,
    music,
    musicTrack,
    tapSound,
    haptics,
    colourblind,
    dailyReminder,
    difficulty,
  } = state;
  writeJson(KEY, {
    sound,
    music,
    musicTrack,
    tapSound,
    haptics,
    colourblind,
    dailyReminder,
    difficulty,
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

  cycleMusic: () => {
    const next = (get().musicTrack + 1) % MUSIC_TRACKS.length;
    set({ musicTrack: next, music: true });
    persist(get());
    return MUSIC_TRACKS[next]!;
  },

  setDifficulty: (difficulty) => {
    if (get().difficulty === difficulty) return;
    set({ difficulty });
    persist(get());
  },
}));

/** Read settings outside React — handlers should not subscribe to them. */
export function currentSettings(): Settings {
  const {
    sound,
    music,
    musicTrack,
    tapSound,
    haptics,
    colourblind,
    dailyReminder,
    difficulty,
  } = useSettingsStore.getState();
  return {
    sound,
    music,
    musicTrack,
    tapSound,
    haptics,
    colourblind,
    dailyReminder,
    difficulty,
  };
}
