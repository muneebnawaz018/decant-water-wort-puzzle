import { InterstitialAd } from 'react-native-google-mobile-ads';

import { noteAdShown } from '../adPacing';
import { resetInterstitialPacing, showLevelInterstitial } from '../interstitial';
import { isAdLoading } from '../loading';

/**
 * The SDK, replaced by something that always fills instantly.
 *
 * What is under test is the pacing — how often an advert is allowed, not
 * whether AdMob can serve one. `load()` reports LOADED, `show()` reports
 * CLOSED, so every attempt that gets past the rules counts as one shown.
 */
const mockShows = jest.fn();

jest.mock('react-native-google-mobile-ads', () => ({
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  TestIds: { INTERSTITIAL: 'test-interstitial', REWARDED: 'test-rewarded' },
  InterstitialAd: {
    createForAdRequest: () => {
      let listener: ((event: { type: string }) => void) | null = null;
      return {
        addAdEventsListener: (fn: (event: { type: string }) => void) => {
          listener = fn;
          return () => {
            listener = null;
          };
        },
        load: () => listener?.({ type: 'loaded' }),
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
    jest.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => jest.restoreAllMocks());

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
});
