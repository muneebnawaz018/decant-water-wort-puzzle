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
export type AdSlot = 'spare_vial' | 'double_level_reward' | 'double_daily_reward';

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
 */
export async function showRewarded(slot: AdSlot): Promise<AdOutcome> {
  const shown = await present(slot);
  if (shown !== 'unavailable') return shown;
  return paysWithoutAd(slot) ? 'earned' : 'unavailable';
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
 */
function present(slot: AdSlot): Promise<AdOutcome> {
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
      unsubscribe();
      resolve(outcome);
    };

    const unsubscribe = ad.addAdEventsListener(({ type }) => {
      if (type === RewardedAdEventType.LOADED) {
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
