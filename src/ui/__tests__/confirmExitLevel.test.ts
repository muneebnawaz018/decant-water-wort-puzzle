import { solve } from '@/core/solver';
import { useEconomyStore } from '@/state/economyStore';
import { useGameStore } from '@/state/gameStore';
import { useOverlayStore } from '@/state/overlayStore';
import { useSettingsStore } from '@/state/settingsStore';
import { confirmExitLevel } from '../confirmExitLevel';

const modal = () => useOverlayStore.getState().modal;

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
  useGameStore.getState().loadLevel(4);
});

describe('confirmExitLevel', () => {
  // Back answers the same way every time. A prompt that appears only once the
  // board has been played on makes the button's behaviour depend on state the
  // player is not tracking.
  it('asks even on an untouched board, and says nothing was played', () => {
    const leave = jest.fn();
    confirmExitLevel(leave);

    expect(leave).not.toHaveBeenCalled();
    expect(modal()?.title).toBe('Leave level 4?');
    expect(modal()?.body).toContain('No moves made yet');
  });

  it('asks first once a pour has been made, and does not leave yet', () => {
    playOne();
    const leave = jest.fn();
    confirmExitLevel(leave);

    expect(leave).not.toHaveBeenCalled();
    expect(modal()?.title).toBe('Leave level 4?');
    expect(modal()?.body).toContain('1 move in');
    expect(modal()?.confirmLabel).toBe('Leave');
    expect(modal()?.cancelLabel).toBe('Stay');
  });

  it('leaves only on confirm', () => {
    playOne();
    const leave = jest.fn();
    confirmExitLevel(leave);
    modal()!.onConfirm!();

    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('stays on the board if the modal is dismissed', () => {
    playOne();
    const leave = jest.fn();
    confirmExitLevel(leave);
    useOverlayStore.getState().closeModal();

    expect(leave).not.toHaveBeenCalled();
  });

  // The spare vial is a one-per-level decision, so a board that has taken one
  // is not the board a fresh open would hand back.
  it('counts a spare vial as progress even with no moves played', () => {
    useGameStore.getState().addTube();
    const leave = jest.fn();
    confirmExitLevel(leave);

    expect(modal()?.body).toContain('0 moves in');
  });

  // The bonus board's `level` is the day index — five digits of internal
  // bookkeeping the player has no name for. It was reaching the dialog as
  // "Leave level 20676?".
  describe('on the daily bonus puzzle', () => {
    beforeEach(() => {
      useGameStore.getState().loadBonus(Date.now());
    });

    it('names the board rather than printing the day index', () => {
      confirmExitLevel(jest.fn());

      expect(modal()?.title).toBe("Leave today's brew?");
      expect(modal()?.title).not.toContain('level');
    });

    // The promise the level board can keep and this one cannot: `saveSession`
    // returns early on a bonus board, so the moves do not survive the exit.
    it('does not promise the moves are saved', () => {
      playOne();
      confirmExitLevel(jest.fn());

      expect(modal()?.body).toContain('1 move in');
      expect(modal()?.body).toContain('starts the brew over');
      expect(modal()?.body).not.toContain('saved');
    });
  });

  // An undone pour leaves no trace: `moves` is `history.length`, so undoing
  // back to the start puts the wording back to untouched.
  it('reads as untouched again once every move has been undone', () => {
    playOne();
    // Undo spends coins, and a refused undo would leave the move in place.
    useEconomyStore.setState({ coins: 100 });
    useGameStore.getState().undo();
    const leave = jest.fn();
    confirmExitLevel(leave);

    expect(leave).not.toHaveBeenCalled();
    expect(modal()?.body).toContain('No moves made yet');
  });
});
