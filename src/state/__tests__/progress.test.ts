import {
  emptyRecord,
  loadProgress,
  progressFor,
  recordCompletion,
  saveProgress,
  setCurrentLevel,
} from '../progress';
import { useSettingsStore } from '../settingsStore';
import { DAILY_REWARDS, loadEconomy, useEconomyStore } from '../economyStore';
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
    storage.set('progress.v4', '{ not json');
    expect(progressFor(loadProgress(), 'classic').currentLevel).toBe(1);
  });

  it('carries a legacy record forward once, then deletes the old key', () => {
    const legacy = emptyRecord();
    legacy.classic = {
      furthestLevel: 31,
      currentLevel: 30,
      best: { 4: 9 },
      stars: { 4: 3 },
      paidBlocks: [1, 2],
    };
    storage.set('progress.v3', JSON.stringify(legacy));

    expect(progressFor(loadProgress(), 'classic').furthestLevel).toBe(31);
    // Written under v4 and gone from v3 — in that order, so a crash between
    // the two migrates again rather than losing the record.
    expect(storage.getString('progress.v4')).toContain('"furthestLevel":31');
    expect(storage.getString('progress.v3')).toBeUndefined();
  });

  it('cannot resurrect a legacy record through a corrupt current one', () => {
    // The old eager-fallback shape of this bug: v3 sits on disk forever, v4
    // goes corrupt, and the player silently rolls back a whole version —
    // `paidBlocks` empty, every milestone bonus paid a second time.
    const legacy = emptyRecord();
    legacy.classic.furthestLevel = 31;
    legacy.classic.paidBlocks = [1, 2];
    storage.set('progress.v3', JSON.stringify(legacy));

    loadProgress(); // migrates and deletes v3
    storage.set('progress.v4', '{ not json');

    expect(progressFor(loadProgress(), 'classic').furthestLevel).toBe(1);
  });

  it('drops best — and only best — when the generator moves on', () => {
    const record = emptyRecord();
    record.classic = {
      furthestLevel: 12,
      currentLevel: 11,
      best: { 4: 9 },
      stars: { 4: 3 },
      paidBlocks: [1],
    };
    // A record stamped by a build whose boards were different puzzles. The
    // levels were still finished and the bonuses still paid; only the move
    // counts measured boards that no longer exist.
    storage.set('progress.v4', JSON.stringify({ gen: -1, modes: record }));

    const loaded = progressFor(loadProgress(), 'classic');
    expect(loaded.best).toEqual({});
    expect(loaded.stars).toEqual({ 4: 3 });
    expect(loaded.furthestLevel).toBe(12);
    expect(loaded.paidBlocks).toEqual([1]);
    // Re-stamped on the spot, so the scrub happens once, not on every launch.
    expect(JSON.parse(storage.getString('progress.v4')!).gen).not.toBe(-1);
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
    storage.remove('economy.v5');
    storage.remove('economy.v4');
    useEconomyStore.setState({
      coins: 0,
      streak: 0,
      lastVisitAt: null,
      rewardDay: 0,
      lastClaimAt: null,
      owned: [],
    });
  });

  /** Collecting the reward, which moves the payout track and nothing else. */
  const claim = (at: number) => useEconomyStore.getState().claimDaily(at);
  /** Opening the app, which is what the streak is made of. */
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
    expect(storage.getString('economy.v5')).toContain('"coins":75');
  });

  it('offers day one on a fresh install, with nothing to wait for', () => {
    expect(useEconomyStore.getState().claimable(T0)).toBe(DAILY_REWARDS[0]);
    expect(useEconomyStore.getState().timeUntilClaim(T0)).toBe(0);
  });

  it('advances the payout track one day per claim', () => {
    claim(T0);
    claim(T0 + 24 * HOURS);
    claim(T0 + 48 * HOURS);

    expect(useEconomyStore.getState().rewardDay).toBe(3);
  });

  it('keeps the streak and the payout track apart', () => {
    // The whole point of having two counters. Opening the app moves one;
    // collecting moves the other, and neither touches its neighbour.
    visit(T0);
    visit(T0 + 24 * HOURS);
    visit(T0 + 48 * HOURS);
    expect(useEconomyStore.getState().streak).toBe(3);
    expect(useEconomyStore.getState().rewardDay).toBe(0);

    claim(T0 + 48 * HOURS);
    expect(useEconomyStore.getState().rewardDay).toBe(1);
    expect(useEconomyStore.getState().streak).toBe(3);
  });

  it('leaves the streak alone when a collection is missed', () => {
    // Turning up daily and forgetting to collect costs the payout track, which
    // is the reward for collecting — not the streak, which is the reward for
    // turning up.
    visit(T0);
    claim(T0);
    visit(T0 + 24 * HOURS);
    visit(T0 + 48 * HOURS);

    // 50h since the claim — the next reward has been overtaken by the one
    // after, so the track has lapsed. The streak has not: the visits kept it.
    claim(T0 + 50 * HOURS);
    expect(useEconomyStore.getState().rewardDay).toBe(1);
    expect(useEconomyStore.getState().streak).toBe(3);
  });

  it('pays nothing a second time inside the same day', () => {
    expect(claim(T0)).toBe(DAILY_REWARDS[0]);

    expect(useEconomyStore.getState().claimable(T0 + 10 * HOURS)).toBeNull();
    expect(claim(T0 + 10 * HOURS)).toBe(0);
    expect(useEconomyStore.getState().rewardDay).toBe(1);
  });

  it('keeps the track through a late claim, inside the grace', () => {
    claim(T0);
    // 30 hours: six past the unlock, six short of the deadline.
    claim(T0 + 30 * HOURS);
    expect(useEconomyStore.getState().rewardDay).toBe(2);
  });

  it('resets the track to day one when the deadline is missed', () => {
    claim(T0);
    claim(T0 + 24 * HOURS);
    // 49 hours after the second claim: the missed reward's whole day has gone
    // by and the next one has overtaken it.
    claim(T0 + 73 * HOURS);

    expect(useEconomyStore.getState().rewardDay).toBe(1);
  });

  it('still pays a lapsed track, at day one', () => {
    // Refusing to pay someone who came back late punishes the return itself.
    // They have already dropped to the smallest payout on the track; the coins
    // are not also forfeit.
    claim(T0);
    claim(T0 + 24 * HOURS);
    claim(T0 + 48 * HOURS);
    expect(useEconomyStore.getState().rewardDay).toBe(3);

    expect(claim(T0 + 200 * HOURS)).toBe(DAILY_REWARDS[0]);
    expect(useEconomyStore.getState().rewardDay).toBe(1);
  });

  it('shows the tile the claim will actually pay, lapsed or not', () => {
    claim(T0);
    claim(T0 + 24 * HOURS);
    expect(useEconomyStore.getState().nextDayIndex(T0 + 48 * HOURS)).toBe(2);
    // Past the window the next claim is day one, so that is the tile to show.
    expect(useEconomyStore.getState().nextDayIndex(T0 + 200 * HOURS)).toBe(0);
  });

  it('cycles the seven-day track while the count keeps climbing', () => {
    for (let day = 0; day < 8; day++) claim(T0 + day * 24 * HOURS);

    // Day 8 pays what day 1 paid — the week cycles, the track does not reset.
    expect(useEconomyStore.getState().rewardDay).toBe(8);
    expect(useEconomyStore.getState().nextDayIndex(T0 + 8 * 24 * HOURS)).toBe(1);
  });

  it('counts down to the next unlock once a reward is taken', () => {
    claim(T0);

    expect(useEconomyStore.getState().timeUntilClaim(T0)).toBe(24 * HOURS);
    expect(useEconomyStore.getState().timeUntilClaim(T0 + 10 * HOURS)).toBe(14 * HOURS);
    expect(useEconomyStore.getState().timeUntilClaim(T0 + 24 * HOURS)).toBe(0);
  });

  it('counts the deadline down only while a reward is on the line', () => {
    claim(T0);

    // Still locked: the track is not at risk, so there is nothing to warn about.
    expect(useEconomyStore.getState().timeUntilLapse(T0 + 10 * HOURS)).toBe(0);
    // Unlocked: the reward has its whole day.
    expect(useEconomyStore.getState().timeUntilLapse(T0 + 24 * HOURS)).toBe(24 * HOURS);
    expect(useEconomyStore.getState().timeUntilLapse(T0 + 36 * HOURS)).toBe(12 * HOURS);
    // Lapsed: the place is already gone, so the warning has nothing left to say.
    expect(useEconomyStore.getState().timeUntilLapse(T0 + 49 * HOURS)).toBe(0);
  });

  it('does not hand out an early day when the clock is wound back', () => {
    claim(T0);

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

    expect(storage.getString('economy.v5')).toContain('"streak":21');
  });

  it('exposes the claim time as state, not only through the method', () => {
    // Home decides whether to show "Ready to claim" from `lastClaimAt`.
    // Reading it through the `claimable` selector instead pins a stable
    // function identity, so the chip never re-renders after a claim lands.
    expect(useEconomyStore.getState().lastClaimAt).toBeNull();

    claim(T0);
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

describe('economy migration', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('carries the v4 balance and shelf forward once, then deletes the key', () => {
    storage.set('economy.v4', JSON.stringify({ coins: 120, owned: ['skin.vial'] }));

    const migrated = loadEconomy();
    expect(migrated.coins).toBe(120);
    expect(migrated.owned).toEqual(['skin.vial']);
    // Both runs start over on purpose: v4 had one counter doing two jobs, so
    // there is no honest way to split it back into a streak and a track.
    expect(migrated.streak).toBe(0);
    expect(migrated.rewardDay).toBe(0);

    expect(storage.getString('economy.v5')).toContain('"coins":120');
    expect(storage.getString('economy.v4')).toBeUndefined();
  });

  it('cannot roll the balance back through a corrupt current record', () => {
    // The resurrection path: v4 left on disk after migrating, v5 corrupts, and
    // the wallet quietly returns to a build-old snapshot.
    storage.set('economy.v4', JSON.stringify({ coins: 120, owned: [] }));
    loadEconomy();

    storage.set('economy.v5', '{ not json');
    // A fresh default, not the stale 120.
    expect(loadEconomy().coins).not.toBe(120);
  });
});
