/**
 * Doc §8's `interstitial_level_complete` — the one ad nobody asked for.
 *
 * Every other slot in this game is opened by the player pressing a button, and
 * this one is not: it arrives on its own, between levels. That makes the
 * pacing rules the important half of the file, and they are the spec's:
 *
 * - **Every fourth completion**, not every one.
 * - **Never within 90 seconds of the last one**, whatever the count says.
 * - **Never mid-level**, which is structural rather than checked — the only
 *   caller is the way off the Complete screen.
 *
 * The genre sells relaxation, so an advert over a board in progress is the
 * placement that breaks the product. `docs/04-ads.md` §9 states that rule; this
 * file is where it is kept.
 *
 * Like `rewarded.ts`, nothing above this knows AdMob exists. The screens call
 * `showLevelInterstitial()` and carry on when it resolves.
 *
 * **The advert is fetched long before it is due, and that is the design.** See
 * `primeInterstitial` — the first version loaded on demand, and the two bugs
 * that came out of that are recorded there because both were reported from real
 * play rather than found by reading.
 */

import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import { track } from '@/analytics';
import { msSinceLastAd, noteAdShown, resetAdPacing } from './adPacing';
import { interstitialUnitId } from './units';

/** Completions between interstitials. Doc §8: every fourth. */
const EVERY = 4;

/**
 * The floor between two interstitials, whatever the count says.
 *
 * Doc §8's 90 seconds. It matters most on the levels this game opens with,
 * which take well under a minute each — four of those in a row is barely two
 * minutes of play, and an advert at the end of it reads as an app that is
 * mostly adverts. The count paces the middle of the game and this paces the
 * start of it.
 */
const MIN_GAP_MS = 90_000;

/**
 * How long to wait before asking again after a request came back empty.
 *
 * Doubling from thirty seconds to a five-minute ceiling. A no-fill is usually
 * either no network or no demand, and both are conditions that outlast one
 * retry — so a fixed interval spends requests on an answer that is not going to
 * change. The ceiling rather than a give-up point because the app is open for
 * as long as someone is playing, and a connection that comes back should be
 * noticed without a relaunch.
 */
const RETRY_BASE_MS = 30_000;
const RETRY_MAX_MS = 5 * 60_000;

/**
 * Completions since the last advert.
 *
 * **In memory, not in MMKV**, and the trade is worth stating. A relaunch resets
 * the count, so a player who closes the app after every level would never meet
 * an interstitial — that is revenue given up. What it buys is no new storage
 * key, no migration, and no way for a corrupt record to make the app show
 * adverts it should not.
 *
 * It also fails in the right direction. Every error here costs an impression
 * rather than showing one too many, which is the side to be wrong on when the
 * thing being paced is an interruption.
 */
let sinceLastAd = 0;

/** A second call while one is on screen does nothing. */
let showing = false;

/**
 * The advert waiting in the wings, and whether it is ready to be shown.
 *
 * One at a time: an `InterstitialAd` is single-use, so the instance is thrown
 * away the moment it closes and a fresh one is requested for next time.
 */
let warm: InterstitialAd | null = null;
let warmReady = false;
let fetching = false;
let unsubscribe: (() => void) | undefined;

/** Set for the duration of one `show()`, so the CLOSED event can end the wait. */
let settleShow: (() => void) | null = null;

let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Fetches the next interstitial, well ahead of the completion that spends it.
 *
 * **This is the fix for two bugs that were reported together**, and they are
 * worth stating because the on-demand version read as correct:
 *
 * 1. *"The loading spinner shows after every level."* The count only reset on
 *    an advert that actually reached the screen — deliberately, so a no-fill
 *    would not cost the player the four levels they had played. But nothing
 *    capped it either, so after the first miss `sinceLastAd` sat at four and
 *    then climbed, every later completion passed the every-fourth gate, and
 *    each one opened a fresh request with a full-screen veil over it. The rule
 *    silently degraded from every fourth level to every level.
 * 2. *"Sometimes the ad loads and sometimes it does not."* A cold
 *    `createForAdRequest` plus `load()` has to cross the network and run an
 *    auction, and that was being attempted inside a five-second budget with the
 *    player waiting on a pressed button. On wifi it lands in a few hundred
 *    milliseconds; on mobile data it often does not land at all — which then
 *    fed straight back into the first bug.
 *
 * Loading ahead removes both. The advert is ready minutes before it is due, so
 * `showLevelInterstitial` is a boolean check rather than a network wait; there
 * is nothing to spin over, so the veil is gone from this path entirely; and a
 * miss is free, because a retry costs a background request rather than a
 * spinner in front of someone who wants the next level.
 *
 * **It never waits and never throws.** Safe to call from anywhere, including
 * before the SDK has initialised — that raises synchronously from
 * `createForAdRequest`, and it is caught here and answered with a retry, which
 * is the same thing that happens when the request comes back empty.
 */
export function primeInterstitial(): void {
  // Deliberately **not** guarded on `showing`. The advert being on screen is
  // exactly when the next one should be requested, and the CLOSED handler calls
  // this while `showing` is still true — that flag does not come down until the
  // awaiting caller resumes. `warmReady` covers the case this would: an advert
  // in hand is not replaced, and the one being shown is only discarded once it
  // closes.
  if (warmReady || fetching) return;

  clearRetry();
  fetching = true;

  try {
    const ad = InterstitialAd.createForAdRequest(interstitialUnitId(), {
      keywords: ['interstitial_level_complete'],
    });
    warm = ad;
    unsubscribe = ad.addAdEventsListener(({ type }) => {
      if (type === AdEventType.LOADED) {
        fetching = false;
        warmReady = true;
        retries = 0;
        return;
      }

      // CLOSED and ERROR both end this advert's life. The instance is spent
      // either way, so it is discarded and the next one requested — after a
      // backoff when the request failed, immediately when it simply finished.
      if (type === AdEventType.CLOSED) {
        const done = settleShow;
        settleShow = null;
        discard();
        primeInterstitial();
        done?.();
        return;
      }

      if (type === AdEventType.ERROR) {
        const done = settleShow;
        settleShow = null;
        discard();
        scheduleRetry();
        done?.();
      }
    });

    ad.load();
  } catch {
    // An SDK that cannot even be asked is the same outcome as one that came
    // back empty: no advert, and try again later.
    discard();
    scheduleRetry();
  }
}

/**
 * Counts a finished level and shows an advert if one is due and ready.
 *
 * Always resolves, and always resolves to nothing — the caller navigates
 * afterwards either way. There is no outcome to branch on because there is
 * nothing owed: the player is not being paid for this one.
 *
 * Call it **after** a level is finished and **before** the next screen, from
 * somewhere no board is mounted.
 */
export async function showLevelInterstitial(): Promise<void> {
  sinceLastAd += 1;

  // A completed level is the natural moment to top up, and it costs nothing
  // visible: `primeInterstitial` returns at once if one is already in hand or
  // in flight. It also covers the case where the launch-time prime failed —
  // without it, a player would depend entirely on the retry timer.
  primeInterstitial();

  if (showing) return;
  if (sinceLastAd < EVERY) return;

  // Measured against **any** full-screen advert, not just the last
  // interstitial: a rewarded one watched moments ago counts, which is what
  // stops two stacking. See `adPacing.ts`.
  //
  // The gap is checked without resetting the count, so a completion that comes
  // too soon still counts toward the next one. Resetting here would let fast
  // play push the advert further and further away.
  if (msSinceLastAd() < MIN_GAP_MS) return;

  // Nothing in hand: the player is owed nothing and must not be made to wait
  // for an advert they did not ask for. The count is left standing, so the
  // next completion with one ready spends it.
  const ad = warm;
  if (!warmReady || !ad) return;

  showing = true;
  try {
    // Resolved by the CLOSED event rather than by `show()` returning, so the
    // caller navigates once the advert is off the screen. Returning earlier
    // would put the next level behind it.
    const closed = new Promise<void>((resolve) => {
      settleShow = resolve;
    });
    ad.show();
    await closed;

    sinceLastAd = 0;
    noteAdShown();
    track('ad_shown', { slot: 'interstitial_level_complete' });
  } catch {
    // `show()` can throw synchronously on an advert the SDK has since
    // invalidated. Nothing is owed, so it is dropped and replaced.
    settleShow = null;
    discard();
    scheduleRetry();
  } finally {
    showing = false;
  }
}

/** Drops the current advert and its listener. */
function discard(): void {
  unsubscribe?.();
  unsubscribe = undefined;
  warm = null;
  warmReady = false;
  fetching = false;
}

function scheduleRetry(): void {
  clearRetry();
  const wait = Math.min(RETRY_BASE_MS * 2 ** retries, RETRY_MAX_MS);
  retries += 1;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    primeInterstitial();
  }, wait);
}

function clearRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = undefined;
}

/**
 * Forgets the pacing state and the advert in hand. Tests only.
 *
 * The counters are module-level by design — see above — which means one test
 * would otherwise decide what the next sees. It clears the retry timer as well,
 * so a test does not leave one pending after the run.
 */
export function resetInterstitialPacing(): void {
  sinceLastAd = 0;
  showing = false;
  settleShow = null;
  retries = 0;
  clearRetry();
  discard();
  resetAdPacing();
}
