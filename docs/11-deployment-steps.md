# 11 — Deployment, in order

`docs/06-launch.md` says what is required and why. This file says **what to do
next, in the order to do it**, because that document is organized by what blocks
what rather than as a list you can work down.

Nothing here is new information. It is the same requirements, sequenced, with
the code-side items marked done so they are not re-opened.

Two rules govern the order:

- **The 14-day clock starts as early as possible.** A new personal Play Console
  account cannot publish to production until it has run a closed test with 12
  testers for 14 continuous days. Everything else fits inside that window.
- **The name check comes before anything that reserves the name.** The bundle id
  `com.walqalum.decant` cannot change after publication.

---

## Stage 0 — before spending money

- [x] **Store-name availability check — run 19 August 2026.** Results below.
      Decided: **keep "Decant"**, knowing what the search found.
- [ ] **Trademark search — still outstanding, and it is the one with legal
      rather than commercial consequences.** USPTO TESS, WIPO Global Brand
      Database, EUIPO eSearch and IPO Pakistan all need an interactive browser
      session, so this cannot be scripted from the repo. Search **Class 9**
      (downloadable game software) and **Class 41** (online game services);
      a DECANT mark registered for wine in Class 33 does not block a game, one
      in 9 or 41 does. Note that **DECANT GROUP LIMITED** exists as a company
      and ships an App Store app.

### What the name search found

The bundle id is what makes this urgent: `com.walqalum.decant` is permanent
after the first publication, and a rename afterwards means a new listing with
every install and review forfeited.

**Clear, and verified against Apple's lookup API and Play's listing endpoint:**

| Check                                   | Result       |
| --------------------------------------- | ------------ |
| `com.walqalum.decant` on the App Store  | free         |
| `com.walqalum.decant` on Play           | free (404)   |
| Exact title `Decant: Water Sort Puzzle` | no collision |
| Clash with any competitor's bundle id   | none         |

**Not clear, and the reason the decision needed making.** A sweep of ten App
Store regions found **17 apps whose name starts with "Decant"** — 14 of them
wine or drink apps, and **three of them liquid-sorting puzzle games**:

| App                         | Bundle id                      | Released   |
| --------------------------- | ------------------------------ | ---------- |
| `Decant: Color Sort Puzzle` | `com.stackforgestudios.decant` | 2026-08-18 |
| `Decant Grove`              | `com.uuuu.tx`                  | 2026-07-15 |
| `DecantLab`                 | `es.inbee.ios.DecantLab`       | 2025-12-11 |

Plus `Decantra`, a bottle-sorting puzzle live on Play, and a `Decant` jug puzzle
whose Play listing now 404s.

`Decant: Color Sort Puzzle` shipped **one day** before this search was run, and
its store description argues difficulty from spare-tube count and describes
pouring "one top run at a time" — both positions this project's `AGENTS.md`
records as its own. Water sort is a heavily cloned genre and convergent design
is entirely possible; it is recorded as a fact, not a claim.

**Two risks were accepted knowingly:**

1. **App Review may reject the title** as confusingly similar to
   `Decant: Color Sort Puzzle` — same word, same category, one word apart,
   theirs published first. Not certain, but it would be discovered after the
   listing is built.
2. **Permanent second place in search.** Four Decant-named sorting puzzles
   would then exist, three of them already indexed.

Alternatives were screened the same way and are recorded here so the work is not
repeated: `Phial` is taken by `Phial - Water Sort Puzzle`, same genre.
`Apothecary` and `Brew` were both entirely clear — zero games using either word
— and `Water Sort: Apothecary` was the keyword-led recommendation. Neither was
taken up.

---

## Stage 1 — accounts, in parallel

None of these are fast and none depend on each other. Start them all on the same
day.

- [x] **Google Play Console — done 19 August 2026.** Personal account, developer
      name `Walqalum Games`, account ID `8345660181900594121`, owned by
      `games.walqalum@gmail.com`. Website `https://walqalum.com` recorded on the
      account.
- [ ] **Apple Developer Program** — $99/yr. Deliberately deferred: Android is
      being taken to store first, and iOS follows once it is done.
- [ ] **AdMob account**, under `games.walqalum@gmail.com` — see stage 4. The
      one-way door there is that an app entry cannot be moved between AdMob
      accounts, and a listing linked to the wrong one is a support case rather
      than a settings change.
- [ ] Payment profile and tax forms. These take longer than the code does.

Already done, needs nothing: the **Expo account**. `walqalum-games`, holding
`@walqalum-games/decant`, free tier. See `docs/10-updates.md`.

### One identity, and what each anchor says

Settled 19 August 2026, after the account was opened under a different name.
`Walqalum` won because two of the anchors already said it and one of those — the
signing certificate — cannot be changed without generating a new key.

| Anchor         | Value                 |
| -------------- | --------------------- |
| Publisher      | Walqalum              |
| Play developer | `Walqalum Games`      |
| Expo org       | `walqalum-games`      |
| Keystore       | `O=Walqalum`          |
| Package        | `com.walqalum.decant` |
| Future games   | `com.walqalum.<name>` |

**The package was `com.decant.watersort` until an hour before the Play form was
submitted**, which had the shape backwards — the app standing where the
publisher belongs, and nowhere sensible for a second game to go. Caught in time
because the Create app form asks for the package up front and it is permanent
from that moment.

---

## Stage 2 — the closed test, as soon as Play Console exists

This is the item that decides the launch date, so it goes before the polish.

- [x] **App record created, 19 August 2026.** `Decant: Water Sort Puzzle`,
      package `com.walqalum.decant`, Game, Free, status Draft.
- [x] **Play App Signing accepted** — it is a declaration on the Create app
      form rather than a separate step, which is easy to miss. Google now holds
      the real signing key and `decant-playstore.keystore` is demoted to an
      _upload_ key that support can reset. Without it, losing that file would
      mean a new listing under a new package name.
- [x] **Android developer verification — registered, 19 August 2026.**
      `com.walqalum.decant`, status Registered, 3 keys. New apps are registered
      automatically at creation, so this needed no action — but **the home
      page said the opposite for several minutes after the app was created**,
      listing it under _apps not registered_. The Android developer
      verification page was already showing Registered, and the banner caught
      up on a reload. Believe that page, not the banner. The deadline this
      guards is 30 September 2026, after which unregistered apps are removed
      from Play and become uninstallable on certified devices.
- [ ] Register the bundle id on the App Store side, when iOS starts
- [ ] Build the store artefact and upload it to a closed track, with
      `npm run build:aab -- --production`. That flag sets the EAS Update
      channel, and note the deliberate exception in `docs/10-updates.md` §4: a
      closed test is _also_ uploaded as a bundle, and those testers are better
      off on `preview`, so decide which this upload is before passing it
- [ ] Recruit **12 testers** and open the closed test. The 14 continuous days
      start when the twelfth opts in, and every remaining stage fits inside them

### What the 12-testers rule actually measures, and the three reviews

Worth writing down because the rule is widely misdescribed, including by people
who have shipped under it.

**It counts enrolment, not play.** Twelve Google accounts opt in — one click on
the opt-in link, one tap on _Become a tester_ — and stay opted in for fourteen
consecutive days. Nobody has to open the app daily. Drop to eleven on day nine
and the count is interrupted.

**The opt-in link does not exist until the closed-test release clears review.**
Its URL is derived from the package name and is stable —
`https://play.google.com/apps/testing/com.walqalum.decant` — but until the
release is published it answers _App not available_ for everyone, the developer
included. Play Console says as much on the Testers tab: "The link will be shown
here when you publish your app." Sending it early costs you twelve people you
have to chase twice.

**There are three reviews, not one**, and only the last two are slow:

| Step                              | Reviewed?           | Blocks               |
| --------------------------------- | ------------------- | -------------------- |
| Closed-test release               | yes, 1–7 days       | testers installing   |
| Testers opting in                 | no                  | —                    |
| The 14-day window                 | no, automatic       | the application      |
| **Production access application** | **yes, by a human** | the production track |
| Production release                | yes                 | the public listing   |

**The application is the one that fails.** It is a form asking how testers were
recruited, what feedback came back, what changed because of it, and why the app
is ready. Nothing programmatically checks whether anyone played, but a reviewer
reads the answers, and twelve accounts that sat idle for a fortnight do not
survive that reading. So during the window, get something in writing from each
tester — a bug, a complaint, "level 40 was too hard" — and keep the messages.
They are the raw material for the form.

Shortest realistic path from a submitted closed test to a public listing is
about three weeks, four or five if the application is bounced once.

---

## Stage 3 — the store listings

Strings, screenshots and answers are drafted in `docs/08-store-listing.md`.

- [ ] **Play Console category: Game → Puzzle, not App.** This is also the last
      piece of game recognition on Android — several skins classify from the
      store entry rather than the manifest, and a sideloaded APK has no store
      entry to read
- [ ] **App Store Connect category: Games → Puzzle.** On iOS this is what makes
      the system treat the app as a game, including Game Mode. The
      `LSApplicationCategoryType` key in the binary does not substitute for it
- [ ] iPhone screenshots at the sizes App Store Connect currently demands
- [ ] **iPad screenshots** — mandatory, because `supportsTablet: true` is set.
      `npm run ios:pad` is the tablet layout
- [ ] Play: phone screenshots, 7" and 10" tablet screenshots, and a 1024×500
      feature graphic
- [ ] Short and full descriptions, both stores
- [ ] Support URL and contact email

### The two category dropdowns cannot be set from this repository

Written out because it is asked every time, and because the answer looks wrong:
the app already declares itself a game in both binaries, so it is reasonable to
assume something in the config still needs changing. Nothing does.

There is no Expo config key, no config plugin and no manifest attribute that
sets a **store** category. A store category is a field on the store's own record
of the app, not a property of the binary, so it can only be set from inside the
console — after the account exists and the app record has been created.

What the binaries already say about themselves, both verified rather than
assumed:

| Declared in                  | Value                              |
| ---------------------------- | ---------------------------------- |
| merged `AndroidManifest.xml` | `android:appCategory="game"`       |
| `ios/Decant/Info.plist`      | `public.app-category.puzzle-games` |

That is everything code can contribute. The remaining half is two dropdowns:

- **Play Console** → the app → _Grow_ → _Store presence_ → _Store listing_ →
  _App category_. Set **Category: Game**, then **Game → Puzzle**. Picking
  `App` instead is the mistake to avoid; OEM game modes and performance profiles
  read this, and `android:appCategory` does not cover it for skins that ask the
  store
- **App Store Connect** → the app → _App Information_ → _General Information_ →
  **Primary category: Games**, subcategory **Puzzle**. On iOS this is what makes
  the system treat the app as a game, Game Mode included.
  `LSApplicationCategoryType` is primarily a macOS Launch Services key and does
  not substitute for it

Both consoles have APIs, and neither is a way around this: the API keys are
generated from inside the console, which needs the paid account first. So the
order is stage 1, then this, and there is no earlier moment at which it can be
done.

---

## Stage 4 — AdMob handover

The build ships on Google's public test IDs today, which earn nothing and are
the correct default. `docs/04-ads.md` §11 is the detailed version of this list.

- [x] **The company's AdMob account owns the app** — `games.walqalum@gmail.com`,
      publisher `pub-1606345493304211`. A handover is a `.env` edit, never a
      commit
- [x] Android IDs in `.env`: App ID, rewarded unit, interstitial unit. **iOS is
      still on Google's test IDs** and needs its own AdMob app entry — a unit
      minted for the Android entry means nothing to the iOS one and is answered
      with permanent no-fill
- [x] **GDPR consent message published** — `Decant EEA consent`, with
      _Do not consent_ enabled in every EEA country. US states message beside it
- [x] Test device registered, so nobody generates invalid traffic
- [x] **Privacy options entry point built** — `Ad privacy choices` in the
      settings drawer. Not optional: the published consent message tells players
      to look for it, and the US states message has **no console-side entry
      point at all**. See the note at the end of this stage
- [x] `EXPO_PUBLIC_ADMOB_LIVE=true`, then `npm run prebuild`. **Set for the
      closed test as well, deliberately** — an earlier note here said production
      only. The point of a closed test is that QA sees what a player sees, and
      test ads would hide a wrong unit id, a broken rewarded grant and a
      mis-timed interstitial until the day it earns money. The registered test
      device is what keeps those impressions out of the account; testers are not
      registered and their traffic is real, which is accepted at twelve people
- [x] Publish `app-ads.txt` on the game's website —
      `google.com, pub-1606345493304211, DIRECT, f08c47fec0942fa0`, at
      `decant-web/public/app-ads.txt`. Live and serving; **verification is a
      separate thing and is still pending** — see below
- [ ] Complete the AdMob payment profile and identity verification. Slow —
      mailed-PIN verification in some regions — and nothing downstream waits on
      it, so start it early and forget it. Note that AdMob's own Verification
      tab will not accept documents until earnings pass a threshold, so this is
      "start when offered", not "do now"

### Two AdMob steps that cannot be done before the app is public on Play

Both were tried early and neither is possible; recorded so nobody spends an
afternoon looking for a button that is not there.

- [ ] **Link the store listing inside AdMob.** AdMob's linker searches the
      **public** Play catalogue, and an app on a closed track has no public
      page — the search returns nothing and there is no manual override. So this
      waits for production, not for the closed test.
- [ ] **`app-ads.txt` crawl verification.** Google finds the file by reading the
      developer website field **off the public listing** and fetching
      `/app-ads.txt` from that domain. No public listing, no crawl. The file is
      already correct at the right URL; the status flips a day or two after the
      production listing goes live.

Until both land, fill rate is low and eCPM is low, because some demand will not
bid on unverified inventory at all. **Do not read the closed test's revenue
numbers as a forecast** — with twelve testers on throttled, unverified
inventory they measure nothing. What the window is good for is functional: ads
appear at all, the rewarded grant hands over the spare vial, the interstitial
fires where §8 says it does, and the consent form behaves in the EEA.

### iOS AdMob — not started, and blocked on Apple rather than on us

The build ships iOS on Google's test App ID and both iOS unit variables are
blank, which `src/ads/units.ts` reads as "use the SDK's test units". That is the
designed default and is correct until there is an iOS build going somewhere.

The order is forced, because AdMob's iOS entry wants the same public listing the
Android one does:

- [ ] Apple Developer Program — $99/yr, and the long pole
- [ ] App Store Connect app record, then a public App Store URL
- [ ] AdMob → Add app → iOS → **listed on a store**, and search for it
- [ ] Mint the rewarded and interstitial units, fill `ADMOB_IOS_APP_ID`,
      `EXPO_PUBLIC_ADMOB_REWARDED_IOS` and
      `EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS` in `.env`
- [ ] `npm run prebuild` — the App ID is written into `Info.plist`, so this is
      a native change, not a JS one — then a fresh build

**Creating the iOS entry as "not listed on a store" is possible and is still
the wrong move.** The Android entry sits unlisted today for a reason with a date
on it: production is weeks away and the link is already on this list. An iOS
entry has no such date, so it would sit unlinked indefinitely under limited ad
serving, uncovered by `app-ads.txt`, earning nothing — and an app entry with no
store presence and no timeline is the shape Google's fraud tooling looks at.
Make it in the same sitting as the Apple account, not before.

**The iOS-specific thing to verify first when that day comes** is the sequence
in `src/ads/setup.ts`: UMP consent, then Apple's ATT prompt, then
`mobileAds().initialize()`. It is written and reasoned about and has never run
on a real iOS device against live ads. Getting the order wrong costs
personalised ads with no error to tell you so.

**The consent message is not optional polish.** With none published, UMP throws,
`canRequestAds` goes false, and European players get **no ads at all** — test
units included. The game still works, because `paysWithoutAd` grants the spare
vial, but every optional offer dies. `docs/06-launch.md` §6 has the measurement.

**Neither is the privacy options entry point, and the console cannot supply
it.** The US states message's _Entry point_ tab has no fields — it answers
"You need to implement a privacy options entry point in your app", because
there is nothing to configure on Google's side. The EEA message is the same
problem in softer words: its body reads "Look for a link or button in the app
menu to manage or withdraw consent", text this project cannot edit, so a build
without the row publishes a dialog that sends European players hunting for
something that is not there.

`privacyOptionsRequired()` in `src/ads/setup.ts` gates the row on UMP's own
answer rather than on a region the app has no business knowing, so it appears
only where a form is genuinely owed. It calls `showPrivacyOptionsForm()` and
deliberately **not** `reset()` followed by a fresh gather: reset discards the
decision before asking again, so a player who opens the row out of curiosity
and backs out would have silently revoked their own consent.

---

## Stage 5 — compliance forms

Every answer is a fact about the code, so they are quick if read off the right
place rather than guessed.

- [ ] **Privacy policy hosted at a public URL.** Text is drafted in
      `docs/07-privacy-policy.md`. Required by both stores and unavoidable with
      AdMob. The drawer renders a `Privacy policy` row that needs the real URL
      behind it
- [ ] **Play Data Safety** — must declare the advertising ID. Confirmed present
      in the merged release manifest, so this is not a judgement call
- [ ] **Play ads declaration** — the app contains ads
- [ ] **IARC content rating questionnaire**
- [ ] **Play target audience** — rated for everyone, and **not** child-directed.
      `src/ads/setup.ts` sets `MaxAdContentRating.G`, which is a different thing
- [ ] **Apple App Privacy labels** — Identifiers and Usage Data for AdMob, and
      they must agree with `PrivacyInfo.xcprivacy`, which declares
      `NSPrivacyTracking: true`

---

## Stage 6 — the production build

This stage used to say the closed-test AAB could never be promoted, because the
test build ran on Google's test App ID and `EXPO_PUBLIC_ADMOB_LIVE=false`. That
is no longer true and the decision was deliberate: **the closed test runs on the
real App ID and live units**, so QA sees the ads a player sees. Test creatives
would hide a wrong unit id, a rewarded grant that never fires, and an
interstitial at the wrong level until the day it costs money.

The trade taken with it is invalid-traffic risk. Twelve people triggering
rewarded ads on a handful of devices is the pattern that reads as fraud, and a
suspension lands on a brand-new publisher hardest. It is accepted at twelve
testers and only at twelve: the developer's own device is registered as a test
device, testers' are not, and asking a dozen people for their advertising IDs
was refused as unworkable. **If the tester pool ever grows, revisit this** —
either register them or turn the flag off for that track.

So the promotion question is now only about the channel and the version code,
not about ad configuration. A fresh build is still required, and it is still a
**native** one whenever an App ID moves:

| What changes               | Where it lives            | Reaches a device by    |
| -------------------------- | ------------------------- | ---------------------- |
| Ad **unit** IDs            | JS bundle, inlined        | rebuild or OTA         |
| `EXPO_PUBLIC_ADMOB_LIVE`   | JS bundle, inlined        | rebuild or OTA         |
| **`ADMOB_ANDROID_APP_ID`** | **`AndroidManifest.xml`** | **prebuild + new AAB** |

In order, and none of it is optional:

1. [x] `EXPO_PUBLIC_ADMOB_LIVE=true` in `.env` — already set, see above
2. [ ] Confirm every ID in `.env` is the real one. There is **no fallback** in
       `app.config.ts` on purpose — a missing value fails the build loudly
       rather than shipping test IDs that earn nothing and look fine
3. [ ] **`npm run prebuild`.** Not `run:android`, not a plain rebuild. The App
       ID reaches the manifest only through prebuild, and it is read before any
       JavaScript runs — a build against stale native dirs ships the test App
       ID silently
4. [ ] **Bump `android.versionCode`** (and `ios.buildNumber`) in
       `app.config.ts`. Play rejects a duplicate outright
5. [ ] Build with `--production` so `DECANT_UPDATE_CHANNEL=production` is
       baked in. It is deliberately **not** implied by `--aab`, since a closed
       test is uploaded as a bundle too and those testers belong on `preview`
6. [ ] Verify live units on a **registered test device** before uploading —
       real IDs, test creatives, no billable traffic. A typo in a unit ID is
       answered with silent no-fill, and the first build to use the live IDs
       should not be the one going to real users

**The advertising ID is the only thing a rollback cannot undo here.** An OTA can
revert `EXPO_PUBLIC_ADMOB_LIVE`; nothing can revert a manifest.

---

## Stage 7 — the run before submitting

Nothing on this list is proven by a green build.

1. [ ] `npm run check:all` — six gates
2. [ ] **Build a signed release and play a full level on a real device.** R8
       strips what only reflection reaches and that fails at runtime, not at
       build time. Build the **APK**, not the bundle; a phone cannot install an
       `.aab`. _(Done 2026-08-12 against test ad units — repeat against live
       ones.)_
3. [ ] **Listen to the sounds through a phone speaker**, not a simulator. The
       previous audio set died on exactly this judgement after measuring fine
4. [ ] **Verify the ads path against live IDs** with a registered test device,
       and confirm a refused or failed rewarded ad still grants the spare vial
5. [ ] Check the tablet layout on an iPad after the same build
6. [ ] Confirm the merged release manifest still has no
       `SYSTEM_ALERT_WINDOW`, by running `grep uses-permission` over
       `android/app/build/intermediates/merged_manifest/release/*/AndroidManifest.xml`

7. [ ] **Publish the first OTA update and confirm a device receives it.** Both
       platforms are configured and verified, but no update has ever been
       published and none has been received — see `docs/10-updates.md` §7

To get genuine first-run state on Android, clear the data rather than
reinstalling — `allowBackup` is on, so a reinstall restores progress from Google
Drive:

```sh
adb shell pm clear com.walqalum.decant
```

---

## Already done — do not re-open

Code-side, all of it verified rather than assumed:

- **Upload keystore** at `decant-playstore.keystore`, alias `upload`,
  SHA-1 `10:92:6C:…:3B:45`, opens with the environment passwords. Back it up in
  two places; it is the one artefact that cannot be rebuilt once published
- **Release signing survives prebuild** — `plugins/withReleaseSigning.js`
- **Game category, both platforms** — `android:appCategory="game"` via
  `plugins/withGameCategory.js`, confirmed in the merged manifest;
  `LSApplicationCategoryType` confirmed in the generated `Info.plist`. The store
  categories in stage 3 are the remaining half
- **`versionCode` and `ios.buildNumber` set**, moved together by
  `npm run release:version`
- **OTA updates configured** — `expo-updates`, EAS Update, two channels, both
  platforms verified. `docs/10-updates.md`
- **R8 and resource shrinking on**, `targetSdk` 36, three unused Android
  permissions stripped, 50 `SKAdNetworkItems`, ATT prompt sequenced after UMP
  and before SDK init, `ITSAppUsesNonExemptEncryption: false`
- **The release bundle has been built and measured** — ~20 MB actual download

Deliberately not in 1.0, recorded in `docs/06-launch.md` §4: RevenueCat
purchasing, Play Games Services and Game Center, an analytics service.
