import { DAY_MS } from '@/game/dailyPuzzle';
import { useBonusStore } from '../bonusStore';

const store = () => useBonusStore.getState();

/** Noon, so no sample sits near a midnight boundary by accident. */
const noon = (iso: string) => new Date(`${iso}T12:00:00`).getTime();
const DAY_ONE = noon('2026-08-08');

beforeEach(() => {
  useBonusStore.setState({ solvedAt: null, solvedDay: null, total: 0 });
});

describe('availability', () => {
  it('is open before anything has been played', () => {
    expect(store().available(DAY_ONE)).toBe(true);
    expect(store().timeUntilNext(DAY_ONE)).toBe(0);
  });

  it('closes the moment it is finished', () => {
    store().complete(DAY_ONE);
    expect(store().available(DAY_ONE)).toBe(false);
    expect(store().timeUntilNext(DAY_ONE)).toBe(DAY_MS);
  });

  it('counts down through the day', () => {
    store().complete(DAY_ONE);
    const sixHours = 6 * 60 * 60 * 1000;
    expect(store().timeUntilNext(DAY_ONE + sixHours)).toBe(DAY_MS - sixHours);
  });

  it('opens again a day later', () => {
    store().complete(DAY_ONE);
    expect(store().available(DAY_ONE + DAY_MS)).toBe(true);
  });

  /**
   * Both gates, and this is the case that needs the second one.
   *
   * Finish at 9pm and the rolling twenty-four hours runs out at 9pm tomorrow —
   * which is *inside* tomorrow, a day whose puzzle has not been played. Fine.
   * Finish at 1am and it runs out at 1am tomorrow, also inside a fresh day.
   * The awkward one is the timer expiring while the day index has not moved,
   * which cannot happen from a single completion but would the moment the
   * clock is nudged; the day check is what stops the same board being served
   * twice.
   */
  it('will not serve the same day twice, whatever the clock says', () => {
    store().complete(DAY_ONE);
    // A full day has passed by the clock, but it is still the same calendar
    // day — only reachable with a wound-back clock, which is exactly when a
    // timer alone would hand out a second go at the board just finished.
    useBonusStore.setState({ solvedAt: DAY_ONE - DAY_MS });
    expect(store().available(DAY_ONE)).toBe(false);
    expect(store().timeUntilNext(DAY_ONE)).toBeGreaterThan(0);
  });

  it('pauses rather than skips when the clock goes backwards', () => {
    store().complete(DAY_ONE);
    // An hour before it was finished. Elapsed is floored at zero, so the full
    // day is still to run — a wound-back clock must not unlock anything.
    const before = DAY_ONE - 60 * 60 * 1000;
    expect(store().available(before)).toBe(false);
    expect(store().timeUntilNext(before)).toBe(DAY_MS);
  });
});

describe('completion', () => {
  it('counts one per day however often the win path fires', () => {
    // A redo of the winning pour re-solves the board and re-enters the same
    // code. Without the guard that is a second puzzle and a restarted timer.
    store().complete(DAY_ONE);
    store().complete(DAY_ONE + 1000);
    store().complete(DAY_ONE + 2000);

    expect(store().total).toBe(1);
    expect(store().solvedAt).toBe(DAY_ONE);
  });

  it('counts the next day separately', () => {
    store().complete(DAY_ONE);
    store().complete(DAY_ONE + DAY_MS);
    expect(store().total).toBe(2);
  });
});
