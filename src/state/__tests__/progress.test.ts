import {
  emptyRecord,
  loadProgress,
  progressFor,
  recordCompletion,
  saveProgress,
  setCurrentLevel,
} from '../progress';
import { useSettingsStore } from '../settingsStore';
import { DAILY_REWARDS, useEconomyStore } from '../economyStore';
import { storage } from '../storage';

beforeEach(() => {
  storage.clearAll();
});

describe('progress', () => {
  it('starts every mode on level 1', () => {
    const record = loadProgress();
    for (const mode of ['gentle', 'classic', 'fiendish'] as const) {
      expect(progressFor(record, mode)).toEqual({
        furthestLevel: 1,
        currentLevel: 1,
        best: {},
        stars: {},
      });
    }
  });

  it('round-trips through storage', () => {
    const record = emptyRecord();
    record.classic = {
      furthestLevel: 12,
      currentLevel: 11,
      best: { 4: 9 },
      stars: { 4: 3 },
    };
    saveProgress(record);

    expect(progressFor(loadProgress(), 'classic')).toEqual({
      furthestLevel: 12,
      currentLevel: 11,
      best: { 4: 9 },
      stars: { 4: 3 },
    });
  });

  it('falls back to defaults when the record is corrupt', () => {
    storage.set('progress.v2', '{ not json');
    expect(progressFor(loadProgress(), 'classic').currentLevel).toBe(1);
  });

  it('unlocks the next level on completion', () => {
    const after = recordCompletion(emptyRecord(), 'classic', 3, 14);
    expect(progressFor(after, 'classic').furthestLevel).toBe(4);
    expect(progressFor(after, 'classic').best[3]).toBe(14);
  });

  it('keeps the better move count, never the latest', () => {
    let record = recordCompletion(emptyRecord(), 'classic', 3, 14);
    record = recordCompletion(record, 'classic', 3, 21);
    expect(progressFor(record, 'classic').best[3]).toBe(14);

    record = recordCompletion(record, 'classic', 3, 9);
    expect(progressFor(record, 'classic').best[3]).toBe(9);
  });

  it('does not walk furthestLevel backwards on a replay', () => {
    let record = recordCompletion(emptyRecord(), 'classic', 8, 30);
    record = recordCompletion(record, 'classic', 2, 5);
    expect(progressFor(record, 'classic').furthestLevel).toBe(9);
  });

  it('keeps modes completely separate', () => {
    let record = recordCompletion(emptyRecord(), 'classic', 20, 40);
    record = recordCompletion(record, 'gentle', 3, 8);

    expect(progressFor(record, 'classic').furthestLevel).toBe(21);
    expect(progressFor(record, 'gentle').furthestLevel).toBe(4);
    expect(progressFor(record, 'fiendish').furthestLevel).toBe(1);
    expect(progressFor(record, 'gentle').best[20]).toBeUndefined();
  });

  it('remembers where each mode was left', () => {
    let record = setCurrentLevel(emptyRecord(), 'classic', 30);
    record = setCurrentLevel(record, 'fiendish', 4);

    expect(progressFor(record, 'classic').currentLevel).toBe(30);
    expect(progressFor(record, 'fiendish').currentLevel).toBe(4);
  });
});

describe('settings', () => {
  it('defaults to feedback on, colourblind off, classic difficulty', () => {
    const { haptics, sound, colourblind, difficulty } = useSettingsStore.getState();
    expect({ haptics, sound, colourblind, difficulty }).toEqual({
      haptics: true,
      sound: true,
      colourblind: false,
      difficulty: 'classic',
    });
  });

  it('persists a toggle', () => {
    useSettingsStore.getState().toggle('haptics');
    expect(useSettingsStore.getState().haptics).toBe(false);
    expect(storage.getString('settings.v3')).toContain('"haptics":false');

    useSettingsStore.getState().toggle('haptics');
  });

  it('persists the difficulty', () => {
    useSettingsStore.getState().setDifficulty('fiendish');
    expect(storage.getString('settings.v3')).toContain('"difficulty":"fiendish"');

    useSettingsStore.getState().setDifficulty('classic');
  });
});

describe('economy', () => {
  beforeEach(() => {
    storage.remove('economy.v1');
    useEconomyStore.setState({
      coins: 0,
      streak: 0,
      lastClaim: null,
      owned: [],
    });
  });

  it('adds and spends coins, refusing what it cannot afford', () => {
    useEconomyStore.getState().add(60);
    expect(useEconomyStore.getState().coins).toBe(60);

    expect(useEconomyStore.getState().spend(100)).toBe(false);
    expect(useEconomyStore.getState().coins).toBe(60);

    expect(useEconomyStore.getState().spend(40)).toBe(true);
    expect(useEconomyStore.getState().coins).toBe(20);
  });

  it('survives a restart', () => {
    useEconomyStore.getState().add(75);
    expect(storage.getString('economy.v1')).toContain('"coins":75');
  });

  it('pays a daily reward once per day', () => {
    expect(useEconomyStore.getState().claimable('2026-03-01')).toBe(DAILY_REWARDS[0]);
    expect(useEconomyStore.getState().claimDaily('2026-03-01')).toBe(DAILY_REWARDS[0]);

    // Same day again pays nothing.
    expect(useEconomyStore.getState().claimable('2026-03-01')).toBeNull();
    expect(useEconomyStore.getState().claimDaily('2026-03-01')).toBe(0);
  });

  it('advances the streak on consecutive days', () => {
    useEconomyStore.getState().claimDaily('2026-03-01');
    expect(useEconomyStore.getState().claimDaily('2026-03-02')).toBe(DAILY_REWARDS[1]);
    expect(useEconomyStore.getState().streak).toBe(2);
  });

  it('restarts the streak after a missed day', () => {
    useEconomyStore.getState().claimDaily('2026-03-01');
    useEconomyStore.getState().claimDaily('2026-03-02');

    // Skipping the 3rd drops back to day one, not day three.
    expect(useEconomyStore.getState().claimDaily('2026-03-04')).toBe(DAILY_REWARDS[0]);
    expect(useEconomyStore.getState().streak).toBe(1);
  });

  it('crosses a month boundary without breaking the streak', () => {
    useEconomyStore.getState().claimDaily('2026-03-31');
    expect(useEconomyStore.getState().claimDaily('2026-04-01')).toBe(DAILY_REWARDS[1]);
  });

  it('exposes the claim date as state, not only through the method', () => {
    // Home decides whether to show "Ready to claim" from `lastClaim`. Reading
    // it through the `claimable` selector instead pins a stable function
    // identity, so the chip never re-renders after a claim lands.
    expect(useEconomyStore.getState().lastClaim).toBeNull();

    useEconomyStore.getState().claimDaily('2026-03-01');
    expect(useEconomyStore.getState().lastClaim).toBe('2026-03-01');
  });

  it('buys an item once and will not charge twice', () => {
    useEconomyStore.getState().add(100);
    expect(useEconomyStore.getState().buy('skin.neon', 60)).toBe(true);
    expect(useEconomyStore.getState().coins).toBe(40);

    expect(useEconomyStore.getState().buy('skin.neon', 60)).toBe(true);
    expect(useEconomyStore.getState().coins).toBe(40);
  });
});
