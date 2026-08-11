/**
 * The boundary a rewarded ad lives behind, and the only thing the UI knows
 * about ads.
 *
 * Doc §8's rewarded slots, behind one call. The screens never see an SDK, an ad
 * unit or an event stream — they ask for an outcome and act on it:
 *
 * ```ts
 * const outcome = await showRewarded('spare_vial');
 * if (outcome === 'dismissed') return;   // closed early, nothing owed
 * ```
 *
 * `present` below is the SDK half: load, show, and read the outcome off the
 * event stream. Everything above it is policy, and nothing outside this file
 * knows AdMob exists.
 */

import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import { rewardedUnitId } from './units';

/**
 * Where an ad is offered. Doc §8's slots, named rather than numbered.
 *
 * `spare_vial` is the highest-value one in the game — it is asked for at the
 * moment a player is stuck, which is the moment they most want something.
 */
export type AdSlot =
  | 'spare_vial'
  | 'double_level_reward'
  | 'double_daily_reward'
  /**
   * The two board controls that cost coins, offered as an alternative price
   * rather than as a bonus.
   *
   * They are the only slots where the player already had a way through — the
   * coins — so a failed fill costs them nothing: the dialog they were offered
   * this from is still there with Pay on it. That is why neither pays without
   * an ad, unlike `spare_vial`.
   */
  | 'undo'
  | 'hint'
  /**
   * Home's standalone offer: a flat `EARNINGS.rewardedAd` for one watch.
   *
   * The only slot the player can reach without having earned anything first,
   * which makes it the one with no natural limit — the other three are gated by
   * a board in progress, a level just finished, or a daily claim.
   */
  | 'free_coins';

/**
 * How the offer ended.
 *
 * Three outcomes and not a boolean, because the two failures are not the same
 * failure and the UI has to say different things about them. `dismissed` is the
 * player's own choice and needs no apology; `unavailable` is the app failing to
 * deliver something it offered, which is the one that needs a way out.
 */
export type AdOutcome =
  /** Watched far enough to be paid. */
  | 'earned'
  /** Closed early. Nothing is owed, and nothing has gone wrong. */
  | 'dismissed'
  /** No ad filled, or the SDK is not there. The app's problem, not theirs. */
  | 'unavailable';

/**
 * How long an offer may spend loading before it is given up on.
 *
 * **The SDK's own wait is not a number this app can rely on.** In flight mode a
 * request fails almost at once — there is no network to try — but on a weak or
 * half-connected one it can sit for a long time, and Google documents no ceiling
 * on it. Without a deadline the promise here simply never settles: the button
 * stays spinning, the guard below stays closed, and every later offer in the
 * session is refused by a wait that ended in the player's mind long ago.
 *
 * Ten seconds is chosen against what the wait costs, not against what a network
 * might manage. Past it the player is watching a spinner instead of a puzzle,
 * and `unavailable` is a truthful answer — the spare vial is granted, the
 * doubling offers are not, exactly as they are when the auction comes back
 * empty.
 *
 * **It covers the load only.** Once the ad is on screen the clock is the
 * player's, and a timer firing under a full-screen advert would resolve the
 * offer while they are still watching it — paying nothing for an ad they went on
 * to finish.
 */
const LOAD_TIMEOUT_MS = 10_000;

/**
 * Whether a slot pays anyway when no ad could be shown.
 *
 * **This is the important line in the file.** The spare vial is the escape
 * hatch on a board a player cannot finish — doc §10 — so an empty ad inventory
 * must never be what leaves them stuck. A puzzle game with no fail state cannot
 * grow one because an auction came back empty.
 *
 * The doubling offers are the opposite: they are a bonus on coins already paid,
 * so failing to fill costs the player nothing they had. Paying those out
 * regardless would mean the ad was never the price.
 *
 * Deliberately not exported. It is this file's policy, not a question a screen
 * should be asking — a caller that branches on it has moved the decision back
 * out to the UI, which is the thing this boundary exists to prevent.
 *
 * Note this covers `unavailable` only. A `dismissed` ad pays nothing anywhere —
 * the player chose, and the choice has to mean something or the offer is
 * theatre.
 */
function paysWithoutAd(slot: AdSlot): boolean {
  return slot === 'spare_vial';
}

/**
 * Show the ad for a slot and resolve with what the player earned.
 *
 * **Never call this mid-level.** An ad over a board in progress is the one
 * placement this project rules out — see the invariants in `AGENTS.md`. The
 * spare vial is asked for *by* the player, which is what makes it acceptable.
 *
 * Resolves rather than rejects on failure. An ad that does not fill is an
 * ordinary Tuesday, not an exception, and a `try/catch` around every offer
 * would push that decision back out to the callers this file exists to spare.
 *
 * **One offer at a time, app-wide.** A second call while an ad is loading or on
 * screen resolves `dismissed` immediately, paying nothing. Two things force
 * this: AdMob cannot present two rewarded ads at once, and — the reason it
 * lives here rather than in each screen — an offer is asynchronous, so the
 * button that opened it is still enabled while the ad loads. Two fast taps
 * would otherwise run two offers to completion and pay the bonus twice, and
 * every caller would have to grow its own in-flight flag to stop it.
 *
 * `dismissed` rather than `unavailable`, because `unavailable` grants the spare
 * vial: a duplicate tap must not be a way to conjure a second one.
 */
let offerInFlight = false;

export async function showRewarded(slot: AdSlot): Promise<AdOutcome> {
  if (offerInFlight) return 'dismissed';
  offerInFlight = true;
  setLoading(true);

  try {
    const shown = await present(slot, () => setLoading(false));
    if (shown !== 'unavailable') return shown;
    return paysWithoutAd(slot) ? 'earned' : 'unavailable';
  } finally {
    // `finally`, so a throw from the SDK cannot leave the app unable to ever
    // show another ad — the failure mode that turns a bad frame into a dead
    // rewarded slot for the rest of the session. Same for the veil: a stuck
    // spinner over a live screen is worse than no spinner at all.
    offerInFlight = false;
    setLoading(false);
  }
}

/**
 * Whether an ad is being fetched right now, and a way to be told when that
 * changes.
 *
 * **The load is the only part worth a spinner.** It is the one stretch where the
 * player has pressed something and the screen has nothing to show for it, and on
 * a slow connection it is seconds long — which without a spinner reads as a dead
 * button, and a dead button gets pressed again. Once the ad is up it covers the
 * screen and speaks for itself, so this goes false the moment `show` is called
 * rather than when the offer settles.
 *
 * A subscription rather than a store field, because `src/ads` is the boundary
 * the UI sits above: this module knowing about zustand would put the dependency
 * the wrong way round, and every screen would import an ad concept to render a
 * spinner. `AdVeil` is the only reader.
 */
type LoadingListener = (loading: boolean) => void;

let adLoading = false;
const loadingListeners = new Set<LoadingListener>();

function setLoading(value: boolean): void {
  if (adLoading === value) return;
  adLoading = value;
  for (const listener of loadingListeners) listener(value);
}

/** Whether an ad is being fetched. The snapshot half of the subscription. */
export function isAdLoading(): boolean {
  return adLoading;
}

/** Listen for the fetch starting and ending. Returns its own unsubscribe. */
export function subscribeToAdLoading(listener: LoadingListener): () => void {
  loadingListeners.add(listener);
  return () => {
    loadingListeners.delete(listener);
  };
}

/**
 * Load an ad and show it, resolving with what the player did.
 *
 * **A fresh `RewardedAd` per offer, not a pooled one.** Google's own guidance
 * is that an instance is single-use — it cannot be shown twice — so a pool
 * means tracking which member is spent, which is loading, and which went stale.
 * The cost of loading on demand is the wait before the ad appears, and that is
 * acceptable here for a reason specific to this game: every slot is opened from
 * a dialog the player pressed a button to reach, so there is a beat of UI
 * between the intent and the ad either way.
 *
 * Wrapped in a promise with a single `settle` guard, because the SDK talks in
 * events and several of them can arrive for one offer — `EARNED_REWARD` is
 * always followed by `CLOSED`, and an error can land after either. First one
 * wins; the rest are dropped along with the listeners.
 *
 * `onShown` fires when the ad reaches the screen, which is where the spinner
 * ends. See `LOAD_TIMEOUT_MS` for the other half of the same clock.
 */
function present(slot: AdSlot, onShown: () => void): Promise<AdOutcome> {
  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(rewardedUnitId(), {
      // Which ad, from the app's own vocabulary. AdMob reports on it, so the
      // spare vial's fill rate can be read separately from the doubling offers
      // — they are asked for at very different moments.
      keywords: [slot],
    });

    let earned = false;
    let done = false;
    const settle = (outcome: AdOutcome) => {
      if (done) return;
      done = true;
      clearTimeout(deadline);
      unsubscribe();
      resolve(outcome);
    };

    /**
     * Giving up on a load that is taking too long.
     *
     * Note what `settle` does with it: the listeners come off, so an ad that
     * finally loads a minute later has nothing left to show it. That matters
     * more than the timeout itself — without the unsubscribe, a slow request
     * would eventually present a full-screen advert over whatever the player
     * had moved on to, which is the one placement this project rules out.
     */
    const deadline = setTimeout(() => settle('unavailable'), LOAD_TIMEOUT_MS);

    const unsubscribe = ad.addAdEventsListener(({ type }) => {
      if (type === RewardedAdEventType.LOADED) {
        // The wait is over on both counts: the spinner comes down and the
        // deadline stops running, because from here the time being spent is
        // the player's own.
        clearTimeout(deadline);
        onShown();
        ad.show();
        return;
      }
      if (type === RewardedAdEventType.EARNED_REWARD) {
        // Not settled here. The reward is earned but the ad is still on screen,
        // and paying out underneath it means the toast and the coin shower play
        // behind a full-screen advert. `CLOSED` follows, and that is the moment
        // the player is looking at the game again.
        earned = true;
        return;
      }
      if (type === AdEventType.CLOSED) {
        settle(earned ? 'earned' : 'dismissed');
        return;
      }
      if (type === AdEventType.ERROR) {
        // Covers both halves of the failure: nothing filled, or the SDK could
        // not present what it had. Neither is the player's doing, so both are
        // `unavailable` and `paysWithoutAd` decides what that costs them.
        settle('unavailable');
      }
    });

    ad.load();
  });
}
