/**
 * The last move of a level fires three cues at once — the pour, the vial
 * chime and the win fanfare — and every one of them runs over a second. Played
 * at the times each would like, they overlap into a single noise.
 *
 * Spacing them by hand was tried twice and drifted back both times, which is
 * why the separation is an invariant in `sounds.ts` rather than three tuned
 * constants. This suite is what stops it drifting a third time: it asserts the
 * gap itself, not the numbers that happen to produce it today. Retime the
 * animation and these tests should still pass.
 */

/**
 * The native player, which is `null` in every other suite — that is what the
 * real module exports with no native runtime. Here it has to exist, because
 * the thing under test is *when* `play` is called.
 */
jest.mock('../../../modules/system-sound', () => ({
  systemSound: { load: jest.fn(() => true), play: jest.fn() },
}));

import { systemSound } from '../../../modules/system-sound';
import { useSettingsStore } from '@/state/settingsStore';
import { primeSounds, soundComplete, soundLevel, soundPour } from '../sounds';

const play = systemSound!.play as jest.Mock;

/** When each cue actually started, absolute. */
function startTimes(): number[] {
  return play.mock.results.map((result) => (result.value as { at: number }).at);
}

/** Start times, in ms from the tap that began the move. */
function startsAfter(tapAt: number): number[] {
  return startTimes().map((at) => at - tapAt);
}

/**
 * `play` is called from a timer, so the clock has to be fake and the call time
 * recorded as it happens — afterwards there is nothing left to read it from.
 */
beforeAll(async () => {
  jest.useFakeTimers();
  play.mockImplementation(function record(this: unknown) {
    return { at: Date.now() };
  });
  await primeSounds();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  play.mockClear();
  useSettingsStore.getState().set('sound', true);
  // Far enough ahead that the previous test's cues cannot reserve a slot in
  // this one — the scheduler holds a single module-level timestamp.
  jest.setSystemTime(Date.now() + 60_000);
});

/** Everything a solved board fires, in the order `feedback.ts` fires it. */
function winningMove(): number {
  const tapAt = Date.now();
  soundPour(0.5);
  soundComplete();
  soundLevel();
  jest.advanceTimersByTime(20_000);
  return tapAt;
}

describe('the winning move', () => {
  it('plays all three cues', () => {
    winningMove();
    expect(play).toHaveBeenCalledTimes(3);
  });

  /**
   * A second is the tuned value of `MIN_GAP_MS`, and this number is a copy of
   * it on purpose rather than an import: what is being pinned is that the cues
   * are audibly separated, so a change to the gap should have to be made here
   * too, deliberately. It is a floor, not the exact spacing — a cue whose
   * ideal moment is later than its slot keeps its own timing.
   */
  it('leaves at least a second between them', () => {
    const times = startsAfter(winningMove());

    for (let i = 1; i < times.length; i++) {
      expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(1000);
    }
  });

  it('keeps them in order: the water, then the vial, then the board', () => {
    const tapAt = winningMove();
    const cues = play.mock.calls.map((call) => call[0] as string);

    expect(cues).toEqual(['pour', 'complete', 'level']);
    // The pour still lands early, with the animation it belongs to, rather
    // than being pushed back to make room for what follows it.
    expect(startsAfter(tapAt)[0]).toBeLessThan(500);
  });
});

describe('an ordinary move', () => {
  it('plays the pour on time, every time', () => {
    const first = Date.now();
    soundPour(0.5);
    jest.advanceTimersByTime(5_000);

    const second = Date.now();
    soundPour(0.5);
    jest.advanceTimersByTime(5_000);

    expect(play).toHaveBeenCalledTimes(2);
    const [firstAt, secondAt] = startTimes();
    expect(firstAt! - first).toBe(secondAt! - second);
  });
});

describe('a move straight after a completed vial', () => {
  /**
   * The one case where something has to give. The chime for the vial is still
   * inside its gap when the next pour wants to start, and the rule is that the
   * pour goes rather than plays late: it belongs to a second of animation and
   * means nothing outside it, while the chime has already spoken for the
   * moment.
   */
  it('drops the pour rather than playing it late', () => {
    soundPour(0.5);
    soundComplete();
    jest.advanceTimersByTime(1_850);

    play.mockClear();
    soundPour(0.5);
    jest.advanceTimersByTime(5_000);

    expect(play).not.toHaveBeenCalled();
  });

  it('never drops the reward itself', () => {
    soundPour(0.5);
    soundComplete();
    jest.advanceTimersByTime(1_850);

    play.mockClear();
    soundPour(0.5);
    soundComplete();
    jest.advanceTimersByTime(10_000);

    expect(play.mock.calls.map((call) => call[0])).toEqual(['complete']);
  });
});

describe('the master switch', () => {
  it('silences the cues without spending their slots', () => {
    useSettingsStore.getState().set('sound', false);
    winningMove();
    expect(play).not.toHaveBeenCalled();

    useSettingsStore.getState().set('sound', true);
    winningMove();
    expect(play).toHaveBeenCalledTimes(3);
  });
});
