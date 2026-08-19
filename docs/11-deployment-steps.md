# 11 — Deployment, in order

`docs/06-launch.md` says what is required and why. This file says **what to do
next, in the order to do it**, because that document is organised by what blocks
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
      start now, and every remaining stage fits inside them

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

- [ ] **The company's AdMob account owns the app**, not a personal one. This is
      a handover and it should be a `.env` edit, never a commit
- [ ] All four IDs in `.env`: two App IDs, two rewarded units
- [ ] **A GDPR consent message created and _published_** under _Privacy &
      messaging_, **separately for the iOS and Android entries**. Add the US
      states message beside it
- [ ] `EXPO_PUBLIC_ADMOB_LIVE=true`, then `npm run prebuild`
- [ ] Register test devices in AdMob, so nobody generates invalid traffic
- [ ] **Link the store listing inside AdMob.** Until it is linked, fill rate is
      poor and the early numbers mislead whoever reads them
- [ ] Publish `app-ads.txt` on the developer website named in the listing
- [ ] Complete the AdMob payment profile and identity verification

**The consent message is not optional polish.** With none published, UMP throws,
`canRequestAds` goes false, and European players get **no ads at all** — test
units included. The game still works, because `paysWithoutAd` grants the spare
vial, but every optional offer dies. `docs/06-launch.md` §6 has the measurement.

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

## Stage 6 — the run before submitting

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
