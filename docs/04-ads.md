# 04 — Ads: AdMob setup and the code behind it

Doc §8's rewarded slots, how they are wired, and what has to happen outside this
repo before a single coin is earned.

---

## 1. What is already built

Nothing in the UI knows AdMob exists. Three screens call one function:

```ts
const outcome = await showRewarded('spare_vial'); // 'earned' | 'dismissed' | 'unavailable'
```

| File                      | Job                                                          |
| ------------------------- | ------------------------------------------------------------ |
| `src/ads/rewarded.ts`     | The boundary. Policy above, SDK below.                       |
| `src/ads/interstitial.ts` | `interstitial_level_complete`: every 4th win, 90s floor.     |
| `src/ads/units.ts`        | Which ad unit each slot asks for, test or live.              |
| `src/ads/setup.ts`        | Consent, then SDK initialisation. Called once from `Root`.   |
| `src/ui/hooks/useAds.ts`  | Launch: `initialiseAds()`, then primes the interstitial.     |
| `app.config.ts`           | The App IDs, written into the native manifest by the plugin. |

Three slots exist: `spare_vial`, `double_level_reward`, `double_daily_reward`.

**The one rule worth restating**: the spare vial pays even when no ad fills, and
the two doubling offers do not. The vial is the escape hatch on a board a player
cannot finish, and a game with no fail state must not grow one because an
auction came back empty. `paysWithoutAd` is where that lives.

---

## 2. AdMob is for apps. Web is a different product

No, AdMob cannot serve ads on a website or a web build.

| Surface                 | Google's product                    |
| ----------------------- | ----------------------------------- |
| Android / iOS app       | **AdMob**                           |
| Website, web game       | **AdSense**, or Ad Manager at scale |
| HTML5 game in a webview | AdSense for Games / H5 Games Ads    |

They are separate accounts with separate policies and separate payment
profiles, though both pay out through the same Google payments identity.

For this project it does not come up: `platforms` is `['ios', 'android']` and
web was dropped deliberately — MMKV, Skia and the worklet runtime would each
need a browser shim, which is a second rendering path to keep honest for a
target the game does not ship on.

---

## 3. Setting up your own AdMob account for testing

**Read §4 before doing this.** There is a one-way door in it.

1. Sign in at `admob.google.com` with the Google account you want to own it.
2. **Apps → Add app → "Is the app listed on a store?" → No.** This is the
   option that lets an unpublished app serve ads.
3. Name it, pick the platform. Repeat for the second platform — Android and iOS
   are two separate app entries with two separate App IDs, always.
4. Copy each **App ID**. Format: `ca-app-pub-0000000000000000~1111111111`.
   The `~` is what makes it an App ID rather than a unit ID.
5. **Ad units → Add ad unit → Rewarded.** Name it something you will recognise
   in reports. Copy the **unit ID**: `ca-app-pub-0000000000000000/2222222222`,
   with a `/`.
6. **Settings → Account → Test devices.** Add your phone by its advertising ID.
   This is not optional — see §5.

Two entries, two App IDs, one rewarded unit each. That is everything the code
needs.

---

## 4. Your account now, the company's later — the catch

**An app entry cannot be moved between AdMob accounts.** Registering Decant
under your personal account and switching to the company's later means creating
a new app entry there, generating new IDs, and updating this repo. That part is
cheap.

What is not cheap is the store link. Once an AdMob app is linked to a live Play
or App Store listing, that listing is bound to the account holding it, and
unpicking it is a support case rather than a settings change.

So the safe split:

- **Your account, unlisted app entry** — fine for verifying the SDK loads, the
  consent form appears, and the reward callback fires.
- **Company account** — everything from the store listing onward, and every
  real impression.

**Do not link the Play listing to your personal AdMob account**, even briefly.
That is the step that is awkward to reverse.

Honestly, though: Google's test IDs already prove the integration works, and
they need no account at all. A personal account is worth setting up only to see
the AdMob dashboard and reporting for yourself.

---

## 5. Never tap your own live ads

Not once, not "just to check". Google's invalid-traffic detection is automated
and unforgiving, and a suspended publisher account is not a thing you argue your
way out of.

Two protections, and use both:

- **Register your test devices** in AdMob (§3.6). Ads served to a registered
  device are marked test and excluded from billing.
- **Keep `LIVE_ADS_ENABLED` false** until the app is genuinely on a store.

`__DEV__` alone is not enough, and the reason is specific to how this project is
tested: a release APK sideloaded to a phone is not a development build. That is
how Android builds are checked here and how the app will be passed around the
company before launch — every one of those impressions would be live.

---

## 6. Putting real IDs in

Two files, then a prebuild.

**`.env`** — the App IDs, read by `app.config.ts`. These go into
`AndroidManifest.xml` and `Info.plist`, which is why they cannot be a runtime
value: they are read before any JavaScript runs, and a mismatch crashes the app
at launch rather than failing an ad request.

```bash
ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ
```

**`.env`** — the units and the switch. One unit per platform: an ad unit
belongs to a single AdMob app entry, and Android and iOS are always two.

```bash
EXPO_PUBLIC_ADMOB_REWARDED_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW
EXPO_PUBLIC_ADMOB_REWARDED_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/VVVVVVVVVV
EXPO_PUBLIC_ADMOB_LIVE=true          # closed test included, see 11-deployment §6
```

Then:

```bash
npm run prebuild        # App IDs are baked into native files
npm run android         # or ios
```

Verify the App ID landed:

```bash
grep APPLICATION_ID android/app/src/main/AndroidManifest.xml
grep -A 1 GADApplicationIdentifier ios/Decant/Info.plist
```

Ad unit IDs are **not secrets** — anyone can unzip an APK and read them. That is
why they live in the repo rather than in build secrets: hiding them buys nothing
and adds a way for a build to ship with none.

---

## 7. Consent, and why the order matters

`initialiseAds()` gathers consent **before** initialising the SDK. Reversed, the
SDK can request a personalised ad from an EU player who has not been asked,
which is a GDPR violation and eventually a loss of EU demand.

This is also why `delayAppMeasurementInit: true` is set in the plugin config.
Left at its default the SDK starts during app launch — before any JavaScript has
run, so before anyone could have been asked anything, and on the critical path
to a first frame this project works hard to keep seamless.

Outside the EU, UMP returns `NOT_REQUIRED` and no form ever appears.

To test the form from a non-EU country, use UMP's debug geography settings; the
SDK exposes them through `AdsConsentDebugGeography`.

---

## 8. Audience: general, not child-directed

Decant is rated for everyone and **is not child-directed**, and the two are
different things:

- **Age rating** (PEGI 3 / ESRB Everyone) — nothing here will upset a child.
  Decant gets the gentlest rating there is.
- **Child-directed** — the app is _aimed at_ under-13s. A legal designation
  under COPPA and GDPR-K, triggered by how the app is marketed: the Family
  category, kid-facing artwork, "for kids" in the description.

Tagging the app child-directed forces non-personalised ads and families-certified
networks only, which cuts revenue per impression sharply. A nine-year-old playing
the game does not trigger it; listing it in the Family category does.

`maxAdContentRating` is capped at `G` in `setup.ts` — that is a separate control,
and it is about what ads may appear _inside_ the game. A gambling ad in the
middle of a calm puzzle is a rating complaint waiting to happen.

---

## 9. Placement rules this project holds

- **Never show an ad mid-level.** The genre sells relaxation; an interstitial
  over a board in progress is the placement that breaks it. Every slot here is
  opened by the player pressing a button.
- **`spare_vial` is the highest-value slot.** It is asked for at the moment
  someone is stuck, which is the moment they most want something.
- **`EARNED_REWARD` does not pay — `CLOSED` does.** Paying at the reward event
  runs the coin shower and the toast behind a full-screen advert.
- **Dismissed pays nothing, anywhere.** The player chose, and the choice has to
  mean something or the offer is theatre.

---

## 10. Offline, and slow

Two different failures, and only one of them looks like one.

**Flight mode is the easy case.** There is no network to try, so the request
fails almost immediately and `showRewarded` resolves `unavailable`. The spare
vial is granted anyway — it is the escape hatch on a board that cannot be
finished, and an empty ad inventory must never be what leaves someone stuck. The
doubling offers are not: they sit on top of coins already banked, so a failed
offer costs the player nothing they had.

**A weak connection is the one that bites.** The request neither fills nor
fails, and Google publishes no ceiling on how long it will sit there. Left
alone, the promise never settles: the button spins forever, the one-offer-at-a-
time guard stays closed, and every later ad in the session is refused by a wait
that ended in the player's mind minutes ago.

So `LOAD_TIMEOUT_MS` in `rewarded.ts` caps the load at ten seconds. Two details
matter more than the number:

- **It covers the load only.** Once the ad is on screen the clock belongs to the
  player, and a timer firing under a full-screen advert would pay nothing for an
  ad they went on to finish.
- **Giving up unsubscribes.** An ad that finally arrives a minute later has
  nothing left to show it. Without that, a slow request would eventually put a
  full-screen advert over whatever the player had moved on to — the one
  placement §9 rules out.

While the fetch runs, `AdVeil` covers the screen: three gold dots and "Loading
ad", mounted once in `Overlays` because the three slots are raised from three
different places and the daily one closes its own dialog on the way out. It
waits 400ms before appearing, so a fast fill and a flight-mode failure are both
invisible rather than a spinner flashing for two frames.

**None of the above applies to the interstitial, and the difference is the
point.** A rewarded ad is asked for, so a wait is the lesser evil and the veil
is honest about it. The interstitial is not asked for, so there is no wait worth
making anyone sit through — it is fetched ahead of time and shows only what is
already in hand.

That was learned the hard way. The first version loaded on demand, and the two
symptoms arrived together from real play:

- _"The loading spinner shows after every level."_ The count only reset on an ad
  that reached the screen — so that a no-fill would not cost the player the four
  levels they had played — but nothing capped it. After the first miss
  `sinceLastAd` sat at four and then climbed, every later completion passed the
  every-fourth gate, and each one opened a fresh request under a full-screen
  veil. §8's every-fourth rule silently became every level.
- _"Sometimes it loads and sometimes it does not."_ A cold request has to cross
  the network and run an auction, and that was being attempted inside a
  five-second budget with the player waiting on a pressed button. Fine on wifi,
  frequently not on mobile data — which fed straight back into the first
  symptom.

`primeInterstitial` fetches one at launch and another the moment one closes, so
by the fourth completion it has been in hand for minutes. A completion with
nothing ready shows nothing and says nothing, leaving the count standing so the
next ready ad is spent at once. A failed request backs off from thirty seconds
to a five-minute ceiling, and every completion is a free retry on top of that.

---

## 11. Before the first real impression

- [ ] Company AdMob account, app added under it
- [ ] All four IDs in `.env` — two App IDs, two rewarded units
- [ ] `EXPO_PUBLIC_ADMOB_LIVE=true`, then `npm run prebuild`
- [ ] Test devices registered in AdMob
- [ ] Play / App Store listing live and **linked in AdMob** — impossible before
      the app is public, since AdMob's linker searches the public catalogue
      only, and until it lands fill rate is poor and the numbers will mislead
      you
- [ ] Play Console Data Safety declaration mentions advertising
- [ ] `app-ads.txt` published on the developer website named in the store
      listing
- [ ] Payment profile and identity verification done — it takes longer than the
      code does
