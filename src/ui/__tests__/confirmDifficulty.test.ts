import { solve } from '@/core/solver';
import { useGameStore } from '@/state/gameStore';
import { useOverlayStore } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { confirmDifficultyChange } from '../confirmDifficulty';

const modal = () => useOverlayStore.getState().modal;
const mode = () => useSettingsStore.getState().difficulty;

/** Plays one legal pour on the level currently loaded. */
function playOne(): void {
  const [move] = solve(useGameStore.getState().board).moves ?? [];
  if (!move) return;
  useGameStore.getState().tapTube(move.from);
  useGameStore.getState().tapTube(move.to);
}

beforeEach(() => {
  useOverlayStore.getState().closeModal();
  useSettingsStore.getState().setDifficulty('classic');
  useGameStore.getState().loadLevel(1);
});

describe('confirmDifficultyChange', () => {
  it('asks first and changes nothing until the answer comes back', () => {
    confirmDifficultyChange('fiendish');

    expect(mode()).toBe('classic');
    expect(modal()?.title).toBe('Switch to Fiendish?');
    expect(modal()?.cancelLabel).toBe('Stay');
  });

  it('switches only on confirm', () => {
    confirmDifficultyChange('gentle');
    modal()!.onConfirm!();
    expect(mode()).toBe('gentle');
  });

  it('stays put if the modal is dismissed', () => {
    confirmDifficultyChange('gentle');
    useOverlayStore.getState().closeModal();
    expect(mode()).toBe('classic');
  });

  it('says nothing at all when the mode is already the one asked for', () => {
    confirmDifficultyChange('classic');
    expect(modal()).toBeNull();
  });

  it('names the level the other mode picks up on', () => {
    useGameStore.getState().loadLevel(4);
    confirmDifficultyChange('fiendish');
    // Untouched mode, so it is still on its first level.
    expect(modal()?.body).toContain('picks up at level 1');
  });

  it('warns that a part-solved board will start over', () => {
    playOne();
    confirmDifficultyChange('gentle');
    expect(modal()?.body).toContain('1 move in and will start over');
  });

  it('counts the spare vial as progress worth warning about', () => {
    useGameStore.getState().addTube();
    confirmDifficultyChange('gentle');
    // No moves made, but the vial is a one-per-level decision and switching
    // away hands out a fresh one.
    expect(modal()?.body).toContain('will start over');
  });

  it('says nothing about starting over on an untouched board', () => {
    confirmDifficultyChange('gentle');
    expect(modal()?.body).not.toContain('start over');
  });
});
