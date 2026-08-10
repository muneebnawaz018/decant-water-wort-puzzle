import { AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';

import { isAdLoading, showRewarded, subscribeToAdLoading } from '../rewarded';

/**
 * The SDK, replaced by a fake that replays event sequences.
 *
 * The real one needs a native runtime, and what is worth testing here is not
 * Google's code — it is this project's reading of the event stream: which
 * events pay, which do not, and what happens when two offers overlap.
 */
type Listener = (event: { type: string }) => void;

/**
 * `mock`-prefixed on purpose: jest forbids a `jest.mock` factory from touching
 * an out-of-scope variable, and exempts names starting with `mock` because it
 * cannot hoist them into a factory that runs before the file's own bindings.
 */
let mockScript: string[] = [];
let mockShowCalls = 0;
/** Pushes one more event into the offer that is currently open. */
let mockEmit: Listener = () => {};

jest.mock('react-native-google-mobile-ads', () => ({
  AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed' },
  RewardedAdEventType: {
    LOADED: 'rewarded_loaded',
    EARNED_REWARD: 'rewarded_earned_reward',
  },
  TestIds: { REWARDED: 'test-rewarded' },
  RewardedAd: {
    createForAdRequest: () => {
      let listener: Listener | null = null;
      return {
        addAdEventsListener: (fn: Listener) => {
          listener = fn;
          mockEmit = (event) => listener?.(event);
          return () => {
            listener = null;
          };
        },
        show: () => {
          mockShowCalls += 1;
        },
        load: () => {
          // Replayed a tick later, the way the SDK delivers them: an offer
          // that resolved synchronously would hide every ordering bug.
          setTimeout(() => {
            for (const type of mockScript) listener?.({ type });
          }, 0);
        },
      };
    },
  },
}));

beforeEach(() => {
  mockScript = [];
  mockShowCalls = 0;
});

/** The happy path: loaded, shown, watched to the end, closed. */
const WATCHED = [
  RewardedAdEventType.LOADED,
  RewardedAdEventType.EARNED_REWARD,
  AdEventType.CLOSED,
];

describe('what an offer resolves to', () => {
  it('pays when the ad is watched through', async () => {
    mockScript = [...WATCHED];
    await expect(showRewarded('double_level_reward')).resolves.toBe('earned');
    expect(mockShowCalls).toBe(1);
  });

  it('pays nothing when the ad is closed early', async () => {
    // No EARNED_REWARD: the player shut it before the reward point.
    mockScript = [RewardedAdEventType.LOADED, AdEventType.CLOSED];
    await expect(showRewarded('double_level_reward')).resolves.toBe('dismissed');
  });

  it('waits for the close, not the reward event', async () => {
    // EARNED_REWARD arrives while the ad is still full-screen. Settling there
    // would run the coin shower and the toast behind an advert.
    mockScript = [RewardedAdEventType.LOADED, RewardedAdEventType.EARNED_REWARD];
    let settled = false;
    const offer = showRewarded('double_level_reward').then((outcome) => {
      settled = true;
      return outcome;
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);

    // Closed by the player a moment later, which is what actually pays.
    mockEmit({ type: AdEventType.CLOSED });
    await expect(offer).resolves.toBe('earned');
  });

  it('reports an unfilled request as unavailable', async () => {
    mockScript = [AdEventType.ERROR];
    await expect(showRewarded('double_level_reward')).resolves.toBe('unavailable');
  });
});

describe('what an unfilled request costs', () => {
  it('grants the spare vial anyway', async () => {
    // The escape hatch on a board that cannot be finished. An empty ad
    // inventory must never be what leaves a player stuck in a game with no
    // fail state.
    mockScript = [AdEventType.ERROR];
    await expect(showRewarded('spare_vial')).resolves.toBe('earned');
  });

  it('does not grant a doubling offer', async () => {
    // The bonus sits on top of coins already banked, so a failed offer costs
    // the player nothing they had. Paying anyway would mean the ad was never
    // the price.
    mockScript = [AdEventType.ERROR];
    await expect(showRewarded('double_daily_reward')).resolves.toBe('unavailable');
  });

  it('does not grant Home’s standalone offer', async () => {
    // `free_coins` is the one slot with no precondition — nothing has been
    // earned, nothing is stuck. Paying it out on a failed request would make it
    // a button that mints coins.
    mockScript = [AdEventType.ERROR];
    await expect(showRewarded('free_coins')).resolves.toBe('unavailable');
  });

  it('still pays nothing when the player dismissed it', async () => {
    // Even for the spare vial. `unavailable` is the app failing to deliver;
    // `dismissed` is the player's own choice, and it has to mean something.
    mockScript = [RewardedAdEventType.LOADED, AdEventType.CLOSED];
    await expect(showRewarded('spare_vial')).resolves.toBe('dismissed');
  });
});

describe('a network that never answers', () => {
  // Flight mode errors out at once and is covered above. This is the other
  // failure: a connection weak enough that the request neither fills nor fails.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('gives up rather than waiting forever', async () => {
    mockScript = [];
    const offer = showRewarded('double_level_reward');

    jest.advanceTimersByTime(9_000);
    // Still hoping at nine seconds.
    expect(isAdLoading()).toBe(true);

    jest.advanceTimersByTime(2_000);
    await expect(offer).resolves.toBe('unavailable');
  });

  it('does not show an ad that arrives after the deadline', async () => {
    // The important half. A request that finally fills a minute later must not
    // put a full-screen advert over whatever the player moved on to.
    mockScript = [];
    const offer = showRewarded('spare_vial');

    jest.advanceTimersByTime(11_000);
    await expect(offer).resolves.toBe('earned'); // the escape hatch still opens

    mockEmit({ type: RewardedAdEventType.LOADED });
    expect(mockShowCalls).toBe(0);
  });

  it('frees the slot for the next offer', async () => {
    // A timed-out offer that left the guard closed would refuse every ad for
    // the rest of the session.
    mockScript = [];
    const first = showRewarded('double_level_reward');
    jest.advanceTimersByTime(11_000);
    await first;

    mockScript = [...WATCHED];
    const second = showRewarded('double_level_reward');
    jest.advanceTimersByTime(1);
    await expect(second).resolves.toBe('earned');
  });
});

describe('what the spinner is told', () => {
  it('is idle until an offer opens', () => {
    expect(isAdLoading()).toBe(false);
  });

  it('stops when the ad reaches the screen, not when the offer settles', async () => {
    // The ad covers the screen from `show` onwards and speaks for itself. A
    // spinner still running underneath it would flash on the way back out.
    mockScript = [RewardedAdEventType.LOADED];
    const seen: boolean[] = [];
    const stop = subscribeToAdLoading((loading) => seen.push(loading));

    const offer = showRewarded('double_level_reward');
    expect(seen).toEqual([true]);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(seen).toEqual([true, false]);
    expect(mockShowCalls).toBe(1);

    mockEmit({ type: AdEventType.CLOSED });
    await offer;
    stop();
  });

  it('stops when nothing filled', async () => {
    mockScript = [AdEventType.ERROR];
    await showRewarded('double_level_reward');
    expect(isAdLoading()).toBe(false);
  });
});

describe('two taps on one button', () => {
  it('runs one offer and pays the second nothing', async () => {
    // The button stays enabled while the ad loads, so a fast double-tap used
    // to run two offers to completion and pay the bonus twice.
    mockScript = [...WATCHED];

    const [first, second] = await Promise.all([
      showRewarded('double_level_reward'),
      showRewarded('double_level_reward'),
    ]);

    expect(first).toBe('earned');
    expect(second).toBe('dismissed');
    expect(mockShowCalls).toBe(1);
  });

  it('refuses the duplicate rather than granting a second vial', async () => {
    // `dismissed`, not `unavailable` — the spare vial pays on `unavailable`,
    // so a duplicate tap must not be a way to conjure one.
    mockScript = [...WATCHED];

    const [, second] = await Promise.all([
      showRewarded('spare_vial'),
      showRewarded('spare_vial'),
    ]);

    expect(second).toBe('dismissed');
  });

  it('is ready again once the first offer ends', async () => {
    mockScript = [...WATCHED];
    await expect(showRewarded('spare_vial')).resolves.toBe('earned');
    await expect(showRewarded('spare_vial')).resolves.toBe('earned');
    expect(mockShowCalls).toBe(2);
  });
});
