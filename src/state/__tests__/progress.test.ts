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
    storage.remove('economy.v3');
    storage.remove('economy.v2');
    useEconomyStore.setState({
      coins: 0,
      streak: 0,
      lastVisitAt: null,
      claimedOnDay: null,
      lastClaimAt: null,
      owned: [],
    });
  });

  /** Opening the app, which is what a day of the streak now is. */
  const visit = (at: number) => useEconomyStore.getState().registerVisit(at);

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
    expect(storage.getString('economy.v3')).toContain('"coins":75');
  });

  it('has nothing to offer before the app has been opened', () => {
    // The streak is made of visits, so a record with none has no day to pay
    // for. In practice `Root` registers one on launch before anything is shown.
    expect(useEconomyStore.getState().claimable(T0)).toBeNull();
  });

  it('pays the first day as soon as the app is opened', () => {
    visit(T0);
    expect(useEconomyStore.getState().claimable(T0)).toBe(DAILY_REWARDS[0]);
    expect(useEconomyStore.getState().claimDaily(T0)).toBe(DAILY_REWARDS[0]);
  });

  it('advances the streak by opening the app, with no claim at all', () => {
    // The whole point of the change: turning up is what a streak measures.
    visit(T0);
    visit(T0 + 24 * HOURS);
    visit(T0 + 48 * HOURS);

    expect(useEconomyStore.getState().streak).toBe(3);
    expect(useEconomyStore.getState().coins).toBe(0);
  });

  it('counts one visit per day however often the app is opened', () => {
    visit(T0);
    visit(T0 + 60_000);
    visit(T0 + 23 * HOURS);

    expect(useEconomyStore.getState().streak).toBe(1);
  });

  it('keeps a run through a late visit, inside the grace window', () => {
    visit(T0);
    // 30 hours: past the day, still inside the 48-hour window.
    visit(T0 + 30 * HOURS);
    expect(useEconomyStore.getState().streak).toBe(2);
  });

  it('restarts the run when the window is missed entirely', () => {
    visit(T0);
    visit(T0 + 24 * HOURS);
    visit(T0 + 96 * HOURS);

    expect(useEconomyStore.getState().streak).toBe(1);
  });

  it('lets a day be collected once, and only on that day', () => {
    visit(T0);
    expect(useEconomyStore.getState().claimDaily(T0)).toBe(DAILY_REWARDS[0]);

    // Taken already: nothing more today, whatever the clock says.
    expect(useEconomyStore.getState().claimable(T0 + 10 * HOURS)).toBeNull();
    expect(useEconomyStore.getState().claimDaily(T0 + 10 * HOURS)).toBe(0);
  });

  it('unlocks the next day the moment the next visit lands', () => {
    visit(T0);
    useEconomyStore.getState().claimDaily(T0);

    visit(T0 + 24 * HOURS);
    expect(useEconomyStore.getState().claimable(T0 + 24 * HOURS)).toBe(DAILY_REWARDS[1]);
  });

  it("loses a day's coins when it is never collected, but not the run", () => {
    // Miss the tap and the reward is gone: a player who ignored the card for a
    // week must not be able to bank seven days at once, or the daily is not one.
    visit(T0);
    visit(T0 + 24 * HOURS);

    expect(useEconomyStore.getState().streak).toBe(2);
    expect(useEconomyStore.getState().claimable(T0 + 24 * HOURS)).toBe(DAILY_REWARDS[1]);
    expect(useEconomyStore.getState().coins).toBe(0);
  });

  it('cycles the seven-day track while the streak keeps climbing', () => {
    for (let day = 0; day < 8; day++) visit(T0 + day * 24 * HOURS);

    // Day 8 pays what day 1 paid — the week cycles, the run does not.
    expect(useEconomyStore.getState().streak).toBe(8);
    expect(useEconomyStore.getState().claimable(T0 + 7 * 24 * HOURS)).toBe(
      DAILY_REWARDS[0]
    );
  });

  it('counts down to the next day once today is collected', () => {
    visit(T0);
    useEconomyStore.getState().claimDaily(T0);

    expect(useEconomyStore.getState().timeUntilClaim(T0)).toBe(24 * HOURS);
    expect(useEconomyStore.getState().timeUntilClaim(T0 + 10 * HOURS)).toBe(14 * HOURS);
    expect(useEconomyStore.getState().timeUntilClaim(T0 + 24 * HOURS)).toBe(0);
  });

  it('does not count down while a reward is still waiting', () => {
    visit(T0);
    expect(useEconomyStore.getState().timeUntilClaim(T0)).toBe(0);
    expect(useEconomyStore.getState().claimable(T0)).not.toBeNull();
  });

  it('does not hand out an early day when the clock is wound back', () => {
    visit(T0);
    useEconomyStore.getState().claimDaily(T0);

    // Device time is the only clock there is, so this cannot be prevented —
    // but moving it backwards must not read as elapsed time.
    expect(useEconomyStore.getState().claimable(T0 - 48 * HOURS)).toBeNull();
    expect(useEconomyStore.getState().timeUntilClaim(T0 - 48 * HOURS)).toBe(24 * HOURS);
  });

  it('keeps a long run across a restart, uncapped', () => {
    // It used to be clamped to the reward track's seven, so "21-day streak"
    // became seven the moment the app relaunched.
    useEconomyStore.setState({ streak: 21, lastVisitAt: T0 });
    useEconomyStore.getState().add(0);

    expect(storage.getString('economy.v3')).toContain('"streak":21');
  });

  it('exposes the claim time as state, not only through the method', () => {
    // Home decides whether to show "Ready to claim" from `lastClaimAt`.
    // Reading it through the `claimable` selector instead pins a stable
    // function identity, so the chip never re-renders after a claim lands.
    expect(useEconomyStore.getState().lastClaimAt).toBeNull();

    visit(T0);
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
