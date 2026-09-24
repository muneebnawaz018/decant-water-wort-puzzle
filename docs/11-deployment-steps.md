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

## Start here — where this stands, 8 September 2026

**Decant is live on Google Play.** The closed test ran its fourteen days,
production access was granted, and `versionCode 3` — the same artefact the
testers played — was promoted to production and cleared review the same day.
`Active`, 177 countries, `com.walqalum.decant`.

Stages 0–6 are history. This section is the resume point; **stage 8** has the
detail behind everything below.

### Done on launch day, 8 September 2026

All of it inside a few hours, none of it on the timelines Google quotes:

| What                     | Outcome                                                 |
| ------------------------ | ------------------------------------------------------- |
| Play production release  | **Live** — cleared review the same day, 177 countries   |
| AdMob store-listing link | **Linked** — search failed once, succeeded on retry     |
| W-8BEN tax form          | **Approved** — Services WHT **0%**, expires 31 Dec 2029 |
| AdMob app review         | **Ready · Ad serving enabled** — throttle lifted        |

**Google's stated timelines are worst cases, not estimates.** "1–7 days" for
the Play review, "2–3 days" for the AdMob app review, "up to 7 days" for the
crawler — the first two landed same-day. Plan around them, but check the
console before assuming you are still waiting.

### Waiting on someone else — no action, do not poke

| What                 | State on 8 Sep         | Expect                              |
| -------------------- | ---------------------- | ----------------------------------- |
| Play search indexing | listing live, indexing | hours to ~24h                       |
| `app-ads.txt` verify | _No data to display_   | needs ad requests — see chain below |
| Apple enrolment      | case `102974085615`    | Apple replies by email, 1–2 days    |

**The `app-ads.txt` file is correct and served** (`text/plain`, 200, right
publisher id, on the domain the _listing_ names). Do not re-deploy it or move
the domain to "fix" the status — a change restarts Google's 7-day crawler
window for nothing.

**A payment method (bank account) cannot be added yet.** The Settings page has
no such section at $0.01 of a $100 threshold — AdSense only offers the form as
payout approaches. Not a gap, and not something to hunt for.

### Ours to do, in priority order

1. **Play 7" and 10" tablet screenshots** (stage 3). Not required to publish,
   which is why they did not block; they gate the tablet-optimised badge on
   devices `supportsTablet: true` promises to support. `npm run ios:pad` for
   the layout — capture work, not development.
2. **The first OTA update has never been published or received** (stage 7,
   `docs/10-updates.md` §7). Both channels are configured and verified, but the
   pipeline has never run end to end. Better discovered on a day nothing
   depends on it.
3. **Trademark search**, Class 9 and 41 (stage 0). Still the only open item
   with legal rather than commercial consequence, and the app is now published
   under the name.
4. **Apple Developer Program**, $99, Individual (stage 1). The long pole —
   every iOS item is behind it, and nothing on iOS has started.

### The one chain worth understanding

Kept because it explains the only thing still outstanding, and because it read
like three separate broken things for most of launch day:

```text
tax form ✓ → AdMob app review ✓ → ad serving enabled ✓
                                          ↓
        players arrive → ad requests → app-ads.txt verifies   ← still open
```

Nothing was ever misconfigured. Each link was waiting on the one above it, and
filing the W-8BEN cleared all three in an afternoon. **The last link cannot be
pushed**: `app-ads.txt` verification needs real ad-request volume, so it waits
on organic installs rather than on anything anyone can do.

The general shape is worth keeping for the App Store run: **a stalled
launch-day pipeline is usually one blocked item wearing several costumes.**
Find the top of the chain before touching anything downstream.

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
- [ ] **Apple Developer Program** — $99/yr, enrolling as **Individual**.
      **Blocked at Apple's end since 24 September 2026**, support case
      `102974085615` — see the enrolment note below. The Apple Account is
      `games.walqalum@gmail.com`, Muhammad Talha Khan, which matches the Play
      owner. See the seller-name note below, which is the part with a
      consequence.
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

### Apple enrols as Individual, and the seller name does not follow

Decided 21 August 2026. The two Apple entity types are not a preference:

|                 | Individual                    | Organization                   |
| --------------- | ----------------------------- | ------------------------------ |
| Seller shown as | the enroller's **legal name** | the company name               |
| Needs           | Apple ID, card                | D-U-N-S number, a legal entity |
| Approval        | 1–2 days                      | 2–4 weeks                      |

**Organization was considered and declined**, so it does not need proposing
again: it is the only route to the company name on day one, and the price is a
D-U-N-S number and two to four weeks before anything on iOS can start. Individual
was chosen for the speed, with the seller name treated as a later correction.

So `Walqalum Games` — which every other anchor in the table above says — is the
one thing an Individual account cannot show on day one. **Apple verifies the
name at enrolment against government ID and the payment card**, so typing the
company name into that form does not produce a differently-named account, it
produces a stalled application.

The route to the company name is a **d/b/a request** after approval: Apple
Developer → Contact Us → Membership, with a business registration document
attached. It works on an existing account and can be done at any time, including
after the app is live, so it is deliberately **not** a blocker on anything.

What is at stake is smaller than it sounds. The App Store shows the app name —
`Decant: Water Sort Puzzle` — at the top, and the seller name as a small grey
line beneath it. Play already carries `Walqalum Games` where most launch traffic
will be.

The genuinely irreversible parts here are the bundle id, which is already
correct at `com.walqalum.decant` and matches Android, and Individual →
Organization, which is a support case rather than a setting. The seller name is
neither.

### Enrolment, in order

1. [ ] **Two-factor authentication on the Apple ID.** Enrolment refuses without
       it, and this is the step that silently costs an evening
2. [ ] Enrol via the **Apple Developer app** on iPhone/iPad rather than the web
       form — it verifies identity through the device and is faster for an
       Individual
3. [ ] Legal name, address and phone exactly as they appear on the ID and the
       card. Entity type **Individual**
4. [ ] Pay $99. The card needs international transactions enabled
5. [ ] Wait 24–48h. Apple may telephone to verify
6. [ ] Accept the agreements in App Store Connect → Business → Agreements. **The
       Paid Apps agreement is required even for a free app that runs ads**
7. [ ] Tax forms and bank details, same page. Slow, and nothing downstream waits
       on them, so start and forget
8. [ ] Register the identifier **`com.walqalum.decant`** — the same string
       Android uses, already in `app.config.ts`, permanent once submitted
9. [ ] Create the app record: `Decant: Water Sort Puzzle`, category
       **Games → Puzzle** (see stage 3), SKU anything internal
10. [ ] Only then the AdMob iOS entry — it wants a store listing to link to, and
        stage 4 explains why creating it before that is the wrong move

### Web enrolment fails with "An unknown error occurred", and what it was not

Hit on 24 September 2026 and unresolved, so the diagnosis is recorded rather
than the fix. Every attempt dies at the same place: entity type selected,
License Agreement accepted, Continue — then `developer.apple.com/enroll/error`
and a message with no code and no reason. No charge is taken and no enrolment
record is created, so retrying costs nothing and changes nothing.

Ruled out, in the order they were cheapest to check:

| Suspect                     | Result                                                    |
| --------------------------- | --------------------------------------------------------- |
| VPN or proxy                | none in use                                               |
| Browser extensions, session | clean session, same error                                 |
| Two-factor authentication   | on, with a verified phone                                 |
| Apple Account region        | Pakistan, matching where the enroller is                  |
| **No payment method**       | **was genuinely missing — added, and it changed nothing** |

The payment method is worth keeping in the list precisely because it looked
like the answer. `Payment & Shipping` read _No payment methods_, which is a
real gap and a documented cause of enrolment failures; a Pakistani card and a
shipping address went on, and the error came back byte-identical. **A plausible
cause that is also genuinely broken is still not proof of the cause.**

What is left is account-level and only Apple can see it. Case `102974085615`,
filed from the enrolling Apple Account — which matters, since a case opened
from anyone else's account is about that account. Apple replies by email to
`games.walqalum@gmail.com` and to nowhere else; there is no console thread,
because the membership that would own one does not exist yet.

**Do not file a second case.** Reply on the existing one if it goes quiet past
two business days.

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
- [x] **Closed-test AAB built and uploaded, 20 August 2026** — `versionCode 3`,
      version `1.0.2`. Built with `npm run build:aab -- --production`, so the
      binary carries the `production` update channel rather than `preview`.
      That is the opposite of what the exception in `docs/10-updates.md` §4
      anticipates, and it turned out to be the right call: **it is what made the
      same artefact promotable to production without a rebuild.** Check what a
      binary actually asks for rather than trusting memory —
      `grep -o 'expo-channel-name[^/]*' android/app/src/main/AndroidManifest.xml`
- [x] **12 testers recruited, closed test ran its 14 days.** Completed
      3 September 2026.

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

**The Play half is done and was proved done by the closed test.** Play refuses
to publish to _any_ track — closed testing included — with the listing
incomplete, so the release that went out on 20 August 2026 is the evidence that
these were all filed. That is worth knowing generally: a track that published
is a receipt for every form that gates publishing.

- [x] **Play Console category: Game → Puzzle, not App.** This is also the last
      piece of game recognition on Android — several skins classify from the
      store entry rather than the manifest, and a sideloaded APK has no store
      entry to read
- [x] Play: phone screenshots and the 1024×500 feature graphic
- [x] Play short and full descriptions
- [x] Support URL and contact email
- [ ] **Play 7" and 10" tablet screenshots.** The one Play item genuinely still
      open, and the reason it did not block anything: tablet screenshots are
      **not** required to publish. They gate the tablet-optimised badge and how
      the listing renders to a tablet user, so shipping without them costs
      presentation on the devices `supportsTablet: true` promises to support.
      Worth doing early rather than never — the layout is already verified on an
      iPad Pro 11-inch, so this is a capture pass, not development work

Still open, all of it iOS and all of it blocked on the Apple account:

- [ ] **App Store Connect category: Games → Puzzle.** On iOS this is what makes
      the system treat the app as a game, including Game Mode. The
      `LSApplicationCategoryType` key in the binary does not substitute for it
- [ ] iPhone screenshots at the sizes App Store Connect currently demands
- [ ] **iPad screenshots** — mandatory, because `supportsTablet: true` is set.
      `npm run ios:pad` is the tablet layout
- [ ] App Store short and full descriptions

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

Everything on the Play side of this list is **done**, and for the same reason
as stage 3: none of these are optional for a closed-test release, so the track
that published on 20 August 2026 could not have published without them.

- [x] **Privacy policy hosted at a public URL.** Text is drafted in
      `docs/07-privacy-policy.md`. Required by both stores and unavoidable with
      AdMob. The drawer renders a `Privacy policy` row that needs the real URL
      behind it
- [x] **Play Data Safety** — must declare the advertising ID. Confirmed present
      in the merged release manifest, so this is not a judgement call
- [x] **Play ads declaration** — the app contains ads
- [x] **IARC content rating questionnaire**
- [x] **Play target audience** — rated for everyone, and **not** child-directed.
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
not about ad configuration. **And in the event no fresh build was needed at
all** — see the promotion note at the end of this stage. The table below still
governs any build that _does_ move an App ID, which is a native one every time:

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

### What actually happened: the AAB was promoted, not rebuilt

Steps 2–6 above were never run for the production release, and the reason is
worth keeping because it is the payoff for two decisions taken earlier.

`versionCode 3` — the artefact twelve testers ran for fourteen days — was
promoted straight to production from Play's library. No rebuild, no version
bump, no second R8 build to re-validate. It was eligible because **both**
things that would normally force a rebuild had already been decided the right
way at closed-test time:

| Would force a rebuild       | Why it did not                                                     |
| --------------------------- | ------------------------------------------------------------------ |
| Wrong EAS Update channel    | built with `--production`, so it already asks for `production`     |
| Test ad IDs in the manifest | the closed test deliberately ran on the real App ID and live units |

The second is the trade recorded at the top of this stage, and this is the
return on it: had the closed test run on Google's test App ID, the tested
binary and the shippable binary would have been different artefacts, and the
first build real players ever received would have been one nobody had played.

**Verify the channel from the binary, never from memory of which flag was
typed:**

```sh
grep -o 'expo-channel-name[^/]*' android/app/src/main/AndroidManifest.xml
```

A promoted build also sidesteps the R8 risk in stage 7 entirely — the artefact
going to players is the one that was already played through.

**This is not the default for future releases.** Any release that changes code
is a fresh build and runs steps 2–6 in full, including the `versionCode` bump,
because 3 is now permanently consumed on Play.

---

## Stage 7 — the run before submitting

Nothing on this list is proven by a green build.

**For the 1.0 release this list was satisfied by the closed test rather than by
a separate pass**, which is the second dividend of promoting the tested
artefact: twelve people played `versionCode 3` on real devices, on live ad
units, for fourteen days. A rebuild would have thrown that evidence away and
required the whole list again against a binary nobody had run. The list stands
unchecked because it governs **the next** release, not the one that shipped.

1. [ ] `npm run check:all` — six gates
2. [ ] **Build a signed release and play a full level on a real device.** R8
       strips what only reflection reaches and that fails at runtime, not at
       build time. Build the **APK**, not the bundle; a phone cannot install an
       `.aab`. _(Done 2026-08-12 against test ad units, then covered for 1.0 by
       the closed test on live units — repeat for any new build.)_
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

## Stage 8 — production access, and the first release

Both happened on 8 September 2026 and they are **two separate gates**, which is
the thing the stage-2 table above gets right and everyone else gets wrong:
approval unlocks the production _track_, it does not put anything on it. The
dashboard read `Production: Inactive` for hours afterwards, and the app was
correctly not findable in Play search that whole time.

- [x] **Production access application filed**, 4 September 2026, granted
      8 September 2026 — inside Google's stated "7 days or less". The answers
      given are in `docs/08-store-listing.md`
- [x] **Countries and regions: all 176 plus rest of world.** Two change rows,
      not a duplicate — the explicit list and a catch-all for territories Play
      adds later. Deleting either narrows the release
- [x] **Production release created** — `versionCode 3` promoted from the
      library, full rollout, no staged percentage
- [x] **Submitted for review**, 8 September 2026, all three changes in one
      batch
- [x] **Live on Google Play, 8 September 2026.** Review cleared the same day —
      far inside the 1–7 days stage 2 budgets for it, and worth knowing why:
      the promoted artefact had already passed review once on the closed track,
      so only the track change was new. Track summary reads `Active`,
      `3 (1.0.2)`, 177 countries, and the public listing answers `HTTP 200`
      with the right title and publisher to a plain `curl` of
      `https://play.google.com/store/apps/details?id=com.walqalum.decant`.
      **Verify from outside the console, not from it.** Play Console reporting
      that a release is live and the public catalogue actually serving it are
      two different claims, and only the second one is what a player
      experiences.

Two things about the form that are easy to get wrong in the moment:

- **Batch the submission.** Countries and the release are separate change rows
  and can be submitted separately; doing so spends a review round-trip on
  availability for a track with nothing on it. Submit them together.
- **Managed publishing was left off**, so approval publishes immediately at
  100%. Turning it on makes review completion and go-live two separate moments,
  which is what you want if a launch has to be timed. It was not needed here.

After approval the listing is live and Play search indexes it within about a
day. `https://play.google.com/store/apps/details?id=com.walqalum.decant` 404s
until then, for the developer too — the same trap as the tester opt-in link in
stage 2.

**Do not edit the release while it is in review.** Editing withdraws it.

### `app-ads.txt` lives on the domain the _listing_ names, not the account

The account and the listing carry **different** websites, and only one of them
matters here. This was nearly recorded as a bug on launch day: the Play account
is registered with `https://walqalum.com`, which 404s on `/app-ads.txt`, and the
obvious conclusion — file never deployed — was wrong.

Google derives the crawl target from **Store settings → Store listing contact
details → Website**, which reads `https://decant-website-rho.vercel.app/`. The
file is there and correct:

```sh
curl -sI https://decant-website-rho.vercel.app/app-ads.txt
# HTTP/2 200 · content-type: text/plain · 59 bytes
```

So the whole chain holds: listing → that domain → `/app-ads.txt` →
`pub-1606345493304211`. **Check the listing field before concluding anything
about the file**, because a 404 on the wrong domain looks identical to a
missing deployment.

Two consequences worth keeping:

- **The field and the file move together or not at all.** Pointing the listing
  at `walqalum.com` without deploying the file there first breaks verification
  silently — no error, just fill rate quietly dropping again.
- **`vercel.app` is a shared domain**, so this works but is not the end state.
  The privacy policy and support URL sit on it too; whenever the real domain
  lands, all three move in one change.

### What unblocks the moment the listing is public

Recorded here because all four were asked about while the review was still
running, when the answer for two of them was "not yet". **The listing went live
the same day, so both are now open** — the table is kept because the
distinction recurs at every store launch:

| Task                             | Needed a live listing?                                | Now                |
| -------------------------------- | ----------------------------------------------------- | ------------------ |
| AdMob → link the store listing   | yes — the linker searches the live store index        | **open, do it**    |
| `app-ads.txt` crawl verification | yes — Google reads the developer site off the listing | runs on its own    |
| AdMob payment profile            | no                                                    | **US tax info**    |
| AdMob identity verification      | no, but gated on an earnings threshold — see stage 4  | wait to be offered |

Linking the listing is the bigger of the two fill-rate levers and is the only
one that needs a person. **Done 8 September 2026** — and two things about it
are worth keeping:

- **The linker's search failed on the first try**, minutes after the listing
  went live, and succeeded on the second. It searches Google's _indexed_ copy
  of the catalogue, not the live store, so it lags publication by hours. A
  no-result here is not evidence of a wrong package name.
- **Decline the "Other Android stores" checkboxes** on that form — Amazon,
  Samsung, OPPO, VIVO, Xiaomi. They declare a listing that already exists
  elsewhere. Ticking one claims a listing we do not have.

Linking flipped the app from `Requires review` to `Getting ready · Review in
progress` and filled the package-name column that was empty. **Approved the
same day** once the tax form landed — the row now reads `✓ Ready` /
`Ad serving enabled`, and the generic Android robot in the app column was
replaced by the real launcher icon, which is a second confirmation that the
store link resolved on Google's side.

**Ad serving was throttled the whole time, and the tooltip is where that is
stated rather than the status column:** _"Any apps in review will remain
unreviewed until you add your payment details."_ That single sentence is what
promoted the tax form from a slow background chore to the thing gating revenue
on a live app.

**`app-ads.txt` verification is not a crawl on a timer, and this was got wrong
once.** The tab's own words: _"We haven't detected any **ad requests** with
app-ads.txt implemented"_, and _"if your approved app has had limited ad
requests over the last 7 days, the status may not appear"_. So it needs traffic
to attach the file to, on top of the crawler's stated 7 days. With the closed
test over and the listing hours old, requests are at zero and the tab reads
**"No data to display"** — recorded here as the 8 September baseline, because
in a month the question is whether it ever changed.

**Decline the rewarded-interstitial upsell** that AdMob puts on the dashboard.
It shows an ad automatically without the player opting in, and `AGENTS.md` is
explicit: `rewarded_extra_tube` is the highest-value slot, and **never show an
ad mid-level**. The dashboard optimises for impressions; the game is sold on
being calm.

### The W-8BEN, filed 8 September 2026 — what it took

**Approved instantly**, `Services WHT rate: 0% (Claimed)`, submitted by
Muhammad Talha Khan, **expires 31 December 2029**. Note that: an expired
form reverts withholding to 30% with no warning.

The profile already had name and address verified (13 August 2026); the tax
form was the missing piece. It is a form rather than an application — free, no
uploads, approved on submission — but six things about it are easy to get wrong
and each costs money or a restart:

| Step             | Answer                                                   | If you get it wrong                                                                        |
| ---------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| W-8 form type    | **W-8BEN**                                               | the form **preselects W-8ECI**, which is for people with a US business who file US returns |
| Foreign TIN      | the NTN (CNIC for most)                                  | labelled _Optional_, but the treaty claim is refused without it                            |
| Tax treaty       | **Yes, claim it**                                        | completes happily at **30%** instead of 0%                                                 |
| Income type      | **Services or other business income** — the AdSense line | Royalties is YouTube Partner and Play Pass, not AdMob                                      |
| PE checkbox      | tick it                                                  | it is the stated basis for the 0%; unticked, the rate has no support                       |
| Activities in US | **No**                                                   | Yes contradicts the PE statement and drops the rate                                        |

Two smaller traps: the signature field looks disabled and is simply pre-filled
read-only from the verified profile — **press Submit rather than hunting for a
way to type in it**. And the **unchanged status affidavit is optional** and
worth skipping: it applies the rate retroactively to prior payments, which here
is one cent, in exchange for another perjury certification.

The preview generates **two** PDFs — `Services.pdf` carrying the claim, and
`No treaty applied.pdf` for the income types not claimed. The second one saying
"NO TREATY APPLIED" is not an error. **Open `Services.pdf` and check Part II
line 10 before signing**: it should read article 3 paragraph 2, 0%, Services.

Signed under penalty of perjury by the person named on the profile, so it is
his to file, not an engineer's.

The trademark search in stage 0 and the Apple enrolment in stage 1 are also
unblocked, and both are long-lead.

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

### Play's four "recommended actions", and why none was taken

The production dashboard raised four of these against release 3 (1.0.2) on
9 September. All four were checked against the code, and none is a finding —
that panel matches on app-wide patterns, not on anything it measured in this
build. Recorded so the same four are not re-litigated next time they appear:

| Recommendation                 | Verdict                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Deprecated edge-to-edge APIs   | **Not our code.** Comes from React Native / Expo reacting to Android 15's forced edge-to-edge. Clears on an SDK bump                  |
| Remove orientation restriction | **Declined, on purpose.** `orientation: 'portrait'` is a product decision — see AGENTS.md, "Landscape is not supported"               |
| Bitmap image optimization      | **Nothing to optimize.** Six PNGs, 372 KB total, all launcher/splash/notification. Every in-game icon is a Skia path                  |
| R8 optimization                | **Already on.** `enableMinifyInReleaseBuilds` and `enableShrinkResourcesInReleaseBuilds`, wired at `android/app/build.gradle:147-148` |

One of them does carry a real cost worth stating rather than dismissing:
portrait-lock is a ranking input for tablets and ChromeOS, so declining it
suppresses discovery there. That is a layout project in `src/render/layout.ts`
— a wide, short box the board has never been asked to handle — not a config
flag, and the tablet screenshots in "Ours to do" buy more of the same audience
for an afternoon's work.
