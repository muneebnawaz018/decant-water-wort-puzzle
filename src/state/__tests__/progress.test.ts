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
        paidBlocks: [],
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
      paidBlocks: [],
    };
    saveProgress(record);

    expect(progressFor(loadProgress(), 'classic')).toEqual({
      furthestLevel: 12,
      currentLevel: 11,
      best: { 4: 9 },
      stars: { 4: 3 },
      paidBlocks: [],
    });
  });

  it('falls back to defaults when the record is corrupt', () => {
    storage.set('progress.v3', '{ not json');
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
  /** A fixed clock. Nothing here should depend on when the suite runs. */
  const T0 = Date.parse('2026-03-01T09:00:00Z');
  const HOURS = 60 * 60 * 1000;

  beforeEach(() => {
    storage.remove('economy.v2');
    storage.remove('economy.v1');
    useEconomyStore.setState({
      coins: 0,
      streak: 0,
      lastClaimAt: null,
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
    expect(storage.getString('economy.v2')).toContain('"coins":75');
  });

  it('pays the first reward immediately', () => {
    expect(useEconomyStore.getState().claimable(T0)).toBe(DAILY_REWARDS[0]);
    expect(useEconomyStore.getState().claimDaily(T0)).toBe(DAILY_REWARDS[0]);
  });

  it('locks for a full twenty-four hours from the moment of the claim', () => {
    useEconomyStore.getState().claimDaily(T0);

    // Not on a calendar day: a claim at 9am does not reopen at midnight.
    expect(useEconomyStore.getState().claimable(T0 + 23 * HOURS)).toBeNull();
    expect(useEconomyStore.getState().claimDaily(T0 + 23 * HOURS)).toBe(0);

    expect(useEconomyStore.getState().claimable(T0 + 24 * HOURS)).toBe(DAILY_REWARDS[1]);
  });

  it('counts down to the next claim', () => {
    useEconomyStore.getState().claimDaily(T0);

    expect(useEconomyStore.getState().timeUntilClaim(T0)).toBe(24 * HOURS);
    expect(useEconomyStore.getState().timeUntilClaim(T0 + 10 * HOURS)).toBe(14 * HOURS);
    expect(useEconomyStore.getState().timeUntilClaim(T0 + 24 * HOURS)).toBe(0);
  });

  it('has nothing to count down before the first claim', () => {
    expect(useEconomyStore.getState().timeUntilClaim(T0)).toBe(0);
    expect(useEconomyStore.getState().claimable(T0)).not.toBeNull();
  });

  it('advances the streak on consecutive claims', () => {
    useEconomyStore.getState().claimDaily(T0);
    expect(useEconomyStore.getState().claimDaily(T0 + 24 * HOURS)).toBe(DAILY_REWARDS[1]);
    expect(useEconomyStore.getState().streak).toBe(2);
  });

  it('keeps the streak through a late claim, inside the grace window', () => {
    useEconomyStore.getState().claimDaily(T0);
    // 30 hours: past the reset, still inside the 48-hour window.
    expect(useEconomyStore.getState().claimDaily(T0 + 30 * HOURS)).toBe(DAILY_REWARDS[1]);
    expect(useEconomyStore.getState().streak).toBe(2);
  });

  it('restarts the track when the window is missed entirely', () => {
    useEconomyStore.getState().claimDaily(T0);
    useEconomyStore.getState().claimDaily(T0 + 24 * HOURS);

    expect(useEconomyStore.getState().claimDaily(T0 + 96 * HOURS)).toBe(DAILY_REWARDS[0]);
    expect(useEconomyStore.getState().streak).toBe(1);
  });

  it('does not hand out an early reward when the clock is wound back', () => {
    useEconomyStore.getState().claimDaily(T0);
    // Device time is the only clock there is, so this cannot be prevented —
    // but moving it backwards must not read as elapsed time.
    expect(useEconomyStore.getState().claimable(T0 - 48 * HOURS)).toBeNull();
    expect(useEconomyStore.getState().timeUntilClaim(T0 - 48 * HOURS)).toBe(24 * HOURS);
  });

  it('exposes the claim time as state, not only through the method', () => {
    // Home decides whether to show "Ready to claim" from `lastClaimAt`.
    // Reading it through the `claimable` selector instead pins a stable
    // function identity, so the chip never re-renders after a claim lands.
    expect(useEconomyStore.getState().lastClaimAt).toBeNull();

    useEconomyStore.getState().claimDaily(T0);
    expect(useEconomyStore.getState().lastClaimAt).toBe(T0);
  });

  it('buys an item once and will not charge twice', () => {
    useEconomyStore.getState().add(100);
    expect(useEconomyStore.getState().buy('skin.neon', 60)).toBe(true);
    expect(useEconomyStore.getState().coins).toBe(40);

    expect(useEconomyStore.getState().buy('skin.neon', 60)).toBe(true);
    expect(useEconomyStore.getState().coins).toBe(40);
  });
});
