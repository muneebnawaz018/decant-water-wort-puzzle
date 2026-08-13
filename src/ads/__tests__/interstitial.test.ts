import { InterstitialAd } from 'react-native-google-mobile-ads';

import { noteAdShown } from '../adPacing';
import { resetInterstitialPacing, showLevelInterstitial } from '../interstitial';
import { isAdLoading } from '../loading';

/**
 * The SDK, replaced by something that answers instantly.
 *
 * What is under test is the pacing — how often an advert is allowed, not
 * whether AdMob can serve one. `load()` reports LOADED or ERROR depending on
 * `mockFill`, and `show()` reports CLOSED, so every attempt that gets past the
 * rules with an advert in hand counts as one shown.
 *
 * `mockFill` is the half that earns its keep: the bug this file now guards
 * against only appears once a request comes back empty, so a mock that always
 * fills could never have caught it.
 */
const mockShows = jest.fn();
const mockCreates = jest.fn();
let mockFill = true;

jest.mock('react-native-google-mobile-ads', () => ({
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  TestIds: { INTERSTITIAL: 'test-interstitial', REWARDED: 'test-rewarded' },
  InterstitialAd: {
    createForAdRequest: () => {
      mockCreates();
      let listener: ((event: { type: string }) => void) | null = null;
      return {
        addAdEventsListener: (fn: (event: { type: string }) => void) => {
          listener = fn;
          return () => {
            listener = null;
          };
        },
        load: () => listener?.({ type: mockFill ? 'loaded' : 'error' }),
        show: () => {
          mockShows();
          listener?.({ type: 'closed' });
        },
      };
    },
  },
}));

/** One completed level. */
const finish = () => showLevelInterstitial();

describe('the level-complete interstitial', () => {
  beforeEach(() => {
    resetInterstitialPacing();
    mockShows.mockClear();
    mockCreates.mockClear();
    mockFill = true;
    jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    // Also clears the retry timer, so a failed-fill test leaves nothing
    // pending after the run.
    resetInterstitialPacing();
    jest.restoreAllMocks();
  });

  it('shows nothing for the first three completions', async () => {
    await finish();
    await finish();
    await finish();
    expect(mockShows).not.toHaveBeenCalled();
  });

  it('shows on the fourth', async () => {
    for (let i = 0; i < 4; i += 1) await finish();
    expect(mockShows).toHaveBeenCalledTimes(1);
  });

  /**
   * The 90-second floor, which is the rule that matters at the start of the
   * game: the opening levels take well under a minute each, so four in a row
   * is barely two minutes of play.
   */
  it('refuses a second one inside 90 seconds, however many levels are finished', async () => {
    for (let i = 0; i < 4; i += 1) await finish();
    expect(mockShows).toHaveBeenCalledTimes(1);

    jest.spyOn(Date, 'now').mockReturnValue(89_000);
    for (let i = 0; i < 8; i += 1) await finish();

    expect(mockShows).toHaveBeenCalledTimes(1);
  });

  it('allows the next one once the gap has passed', async () => {
    for (let i = 0; i < 4; i += 1) await finish();

    jest.spyOn(Date, 'now').mockReturnValue(91_000);
    for (let i = 0; i < 4; i += 1) await finish();

    expect(mockShows).toHaveBeenCalledTimes(2);
  });

  /**
   * The regression test for two full-screen adverts in a row.
   *
   * The sequence that produced it: finish a level, press Double, watch a
   * rewarded advert, and the win screen navigates home on its own once the coin
   * shower ends — straight into an interstitial nobody asked for. The gap used
   * to measure only interstitial-to-interstitial, so a rewarded one moments
   * earlier counted for nothing.
   */
  it('does not stack on top of a rewarded advert watched moments earlier', async () => {
    for (let i = 0; i < 3; i += 1) await finish();

    // A rewarded advert plays — the doubling offer, or a spare vial.
    noteAdShown(0);

    // The fourth completion lands five seconds later. The count is met, but the
    // player has just watched an advert.
    jest.spyOn(Date, 'now').mockReturnValue(5_000);
    await finish();

    expect(mockShows).not.toHaveBeenCalled();
  });

  /**
   * A stuck spinner over a live screen is worse than no spinner at all, so the
   * veil has to come down on every path out — including the ones that show
   * nothing.
   */
  it('leaves no spinner behind, whether or not an advert showed', async () => {
    for (let i = 0; i < 3; i += 1) await finish();
    expect(isAdLoading()).toBe(false);

    await finish();
    expect(mockShows).toHaveBeenCalledTimes(1);
    expect(isAdLoading()).toBe(false);
  });

  /**
   * A completion refused by the clock still counts toward the next advert.
   * Resetting it there would let fast play push the advert away indefinitely.
   */
  it('keeps counting completions that the gap refused', async () => {
    for (let i = 0; i < 4; i += 1) await finish();

    // Four more inside the gap: all refused, all counted.
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    for (let i = 0; i < 4; i += 1) await finish();
    expect(mockShows).toHaveBeenCalledTimes(1);

    // One completion past the gap is enough, because the count is already met.
    jest.spyOn(Date, 'now').mockReturnValue(100_000);
    await finish();
    expect(mockShows).toHaveBeenCalledTimes(2);
  });

  /**
   * The regression test for a dead win screen.
   *
   * `Root` navigates in this promise's `then`, so a rejection is not a missed
   * advert — it is Home, Replay and Next all doing nothing at once, with no way
   * off the screen but killing the app. `createForAdRequest` throws
   * synchronously when the native module is missing or the SDK never
   * initialised, and a throw inside a promise executor becomes a rejection that
   * the `try`/`finally` around it does not stop.
   */
  it('resolves rather than rejecting when the SDK cannot be asked at all', async () => {
    jest.spyOn(InterstitialAd, 'createForAdRequest').mockImplementation(() => {
      throw new Error('SDK not initialised');
    });

    for (let i = 0; i < 4; i += 1) await expect(finish()).resolves.toBeUndefined();

    // And it leaves nothing behind: no spinner, and no advert counted, so the
    // four levels played are still owed one.
    expect(isAdLoading()).toBe(false);
    expect(mockShows).not.toHaveBeenCalled();

    jest.restoreAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(0);
    await finish();
    expect(mockShows).toHaveBeenCalledTimes(1);
  });

  /**
   * The regression test for *"the loading spinner shows after every level"*.
   *
   * A no-fill used to leave `sinceLastAd` sitting at four and then climbing, so
   * every later completion passed the every-fourth gate and opened a fresh
   * request with a full-screen veil over it. The rule degraded from every
   * fourth level to every level, which is how it was reported.
   *
   * Nothing is fetched on the completion path now, so a drought is silent.
   */
  it('shows nothing, and no spinner, while requests come back empty', async () => {
    mockFill = false;

    for (let i = 0; i < 10; i += 1) {
      await finish();
      expect(isAdLoading()).toBe(false);
    }

    expect(mockShows).not.toHaveBeenCalled();
  });

  /**
   * And the drought costs the player nothing: the count stands, so the first
   * advert that does fill is spent immediately rather than four levels later.
   */
  it('spends the standing count on the first advert that fills', async () => {
    mockFill = false;
    for (let i = 0; i < 6; i += 1) await finish();
    expect(mockShows).not.toHaveBeenCalled();

    mockFill = true;
    await finish();
    expect(mockShows).toHaveBeenCalledTimes(1);
  });

  /**
   * The other half of the fix: one advert is held, not one requested per
   * completion. This is what makes the advert instant when it is due — by the
   * fourth level it has been in hand for minutes.
   */
  it('holds one advert rather than requesting one per completion', async () => {
    await finish();
    await finish();
    await finish();

    expect(mockCreates).toHaveBeenCalledTimes(1);
    expect(mockShows).not.toHaveBeenCalled();
  });

  /** And it replaces the one it spends, so the next four levels are covered. */
  it('requests the next advert as soon as one closes', async () => {
    for (let i = 0; i < 4; i += 1) await finish();
    expect(mockShows).toHaveBeenCalledTimes(1);
    expect(mockCreates).toHaveBeenCalledTimes(2);

    jest.spyOn(Date, 'now').mockReturnValue(91_000);
    for (let i = 0; i < 4; i += 1) await finish();

    // Shown from the advert loaded at the moment the first one closed — no
    // further request was needed to put it on screen.
    expect(mockShows).toHaveBeenCalledTimes(2);
    expect(mockCreates).toHaveBeenCalledTimes(3);
  });
});
