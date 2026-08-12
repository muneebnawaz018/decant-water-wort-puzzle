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
 */

import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';

import { track } from '@/analytics';
import { msSinceLastAd, noteAdShown, resetAdPacing } from './adPacing';
import { setAdLoading } from './loading';
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
 * How long to wait for a fill before giving up.
 *
 * Shorter than `rewarded.ts`'s ten seconds, deliberately. There the player
 * pressed a button and is owed something, so waiting is the lesser evil; here
 * they finished a level and want the next one, and an unrequested advert is
 * not worth making anyone wait for. If it does not fill quickly, it does not
 * show.
 */
const LOAD_TIMEOUT_MS = 5_000;

/**
 * Completions since the last advert, and when that advert was.
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
 * Counts a finished level and shows an advert if one is due.
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

  showing = true;
  // The veil, for the same reason the rewarded slots have one: this is awaited
  // before the next screen appears, so without it a press of Next is a button
  // that does nothing for as long as the load takes.
  setAdLoading(true);
  try {
    const shown = await present(() => setAdLoading(false));
    if (!shown) return;
    // Only a shown advert resets the pacing. A failed fill must not cost the
    // player the four levels they played to earn the gap.
    sinceLastAd = 0;
    noteAdShown();
    track('ad_shown', { slot: 'interstitial_level_complete' });
  } finally {
    showing = false;
    setAdLoading(false);
  }
}

/**
 * Load one and show it, resolving with whether it reached the screen.
 *
 * The same shape as `rewarded.ts`'s `present`, minus the reward: one settle
 * guard because several events can arrive for one advert, and the listeners
 * come off when it settles — so an advert that finally loads a minute later has
 * nothing left to show it. Without that, a slow fill would eventually appear
 * over whatever the player had moved on to, which is the one placement this
 * project rules out.
 *
 * **It resolves, never rejects, and that is load-bearing here rather than
 * tidy.** `Root` navigates off the Complete screen in this promise's `then`, so
 * a rejection is not a missed advert — it is Home, Replay and Next all doing
 * nothing, with no way off the win screen but killing the app. The throw is not
 * hypothetical: `createForAdRequest` raises synchronously when the native module
 * is missing or the SDK never initialised, and a synchronous throw inside a
 * promise executor becomes a rejection that `try`/`finally` does not stop.
 */
function present(onShown: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    let unsubscribe: (() => void) | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const settle = (shown: boolean) => {
      if (done) return;
      done = true;
      if (deadline) clearTimeout(deadline);
      unsubscribe?.();
      resolve(shown);
    };

    try {
      const ad = InterstitialAd.createForAdRequest(interstitialUnitId(), {
        keywords: ['interstitial_level_complete'],
      });

      deadline = setTimeout(() => settle(false), LOAD_TIMEOUT_MS);

      unsubscribe = ad.addAdEventsListener(({ type }) => {
        if (type === AdEventType.LOADED) {
          if (deadline) clearTimeout(deadline);
          onShown();
          ad.show();
          return;
        }
        // Resolved on CLOSED rather than on OPENED, so the caller navigates
        // once the advert is actually off the screen. Returning earlier would
        // put the next level behind it.
        if (type === AdEventType.CLOSED) {
          settle(true);
          return;
        }
        if (type === AdEventType.ERROR) settle(false);
      });

      ad.load();
    } catch {
      // An SDK that cannot even be asked is the same outcome as one that came
      // back empty: no advert. The player is not owed anything here, so there
      // is nothing to say and nothing to pay.
      settle(false);
    }
  });
}

/**
 * Forgets the pacing state. Tests only.
 *
 * The counters are module-level by design — see above — which means one test
 * would otherwise decide what the next sees.
 */
export function resetInterstitialPacing(): void {
  sinceLastAd = 0;
  showing = false;
  resetAdPacing();
}
