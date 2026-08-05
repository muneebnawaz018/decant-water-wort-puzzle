import { colours, ui } from '@/theme/colors';
export type Difficulty = 'gentle' | 'classic' | 'fiendish';

export const DIFFICULTIES: readonly Difficulty[] = ['gentle', 'classic', 'fiendish'];

export const DEFAULT_DIFFICULTY: Difficulty = 'classic';

export interface DifficultyInfo {
  id: Difficulty;
  title: string;
  /** Settings §4.9 labels the same modes Easy / Medium / Hard. */
  shortLabel: string;
  detail: string;
  /** Accent the Stages tabs retint to (spec §4.3). */
  accent: string;
}

export const DIFFICULTY_INFO: Record<Difficulty, DifficultyInfo> = {
  gentle: {
    id: 'gentle',
    title: 'Gentle',
    shortLabel: 'Easy',
    detail: 'An extra spare tube and a lighter shuffle',
    accent: ui.accent,
  },
  classic: {
    id: 'classic',
    title: 'Classic',
    shortLabel: 'Medium',
    detail: 'The curve the game is tuned around',
    accent: colours.mango,
  },
  fiendish: {
    id: 'fiendish',
    title: 'Fiendish',
    shortLabel: 'Hard',
    detail: 'One more colour, one less place to put it',
    accent: colours.rose,
  },
};

/**
 * Salt folded into the level seed so the same level number gives a different
 * board per difficulty. Changing these values reshuffles every board in that
 * mode, so treat them as frozen once the game ships.
 */
export const DIFFICULTY_SALT: Record<Difficulty, number> = {
  gentle: 0x1b873593,
  classic: 0,
  fiendish: 0x85ebca6b,
};

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}
