# 06 — Before launch

Everything standing between the current build and a live listing on both
stores. Written down because most of it is not code, and the parts that are not
code have lead times measured in weeks — the account work has to start before
the code work is finished, not after.

Ordered by what blocks what, not by effort. Each item says where it lives, so
the code items can be picked up without re-deriving them.

Two of the deliverables have their own files, both drafted and both needing no
account to finish:

- `docs/07-privacy-policy.md` — the policy text, plus the placeholders to fill
  and notes for whoever files the store privacy forms
- `docs/08-store-listing.md` — every string both consoles ask for, the
  screenshot plan, and the answers to the category and rating questions

---

## 1. The one that decides the date

**A new personal Play Console account cannot publish to production until it has
run a closed test with at least 12 testers for 14 continuous days.** Google
requires it, it is calendar time, and no amount of finished code compresses it.

So the order is: signing key → signed build → closed test opened → everything
else happens while that clock runs. Treat every other item on this page as work
that fits inside those two weeks.

Organization accounts are exempt from the 12-tester rule but need identity
verification, and an Apple organization account needs a D-U-N-S number, which
is its own multi-week wait. Check which kind of account is being used before
assuming a date.

---

## 2. Code — blockers

These are in this repo and nobody outside it is waiting on them.

### 2.1 The upload keystore — done, and the one file to never lose

Generated 2026-08-13. It lives at **`decant-playstore.keystore` in the project
root**, where `plugins/withReleaseSigning.js` finds it with no path configured,
and it is gitignored by an explicit rule.

Named for the app and the store rather than `upload.keystore`, because a folder
holding four projects' `upload.keystore` files is a mistake waiting to happen
and choosing the wrong one is only discovered at an upload form.

```text
Alias   upload
Owner   CN=Muneeb, OU=Mobile Development, O=Walqalum, L=Lahore, ST=Punjab, C=PK
Valid   13 Aug 2026 → 29 Dec 2053
SHA-1   10:92:6C:5C:64:77:A9:B1:9D:58:52:C4:0B:E5:DC:EE:58:A2:3B:45
```

**The passwords are not beside it.** `DECANT_UPLOAD_STORE_PASSWORD` and
`DECANT_UPLOAD_KEY_PASSWORD` come from the environment — `~/.zshrc` on this
machine — and the build fails with a named error if the keystore is found and
they are not. Keeping the two apart is what makes a leaked checkout
recoverable: the file alone signs nothing.

`DECANT_UPLOAD_KEY_ALIAS` is optional and defaults to `upload`.
`DECANT_UPLOAD_STORE_FILE` is optional too, and overrides the root lookup for a
CI runner or a machine that keeps the key elsewhere — but **only when the path
it names exists**. One pointing at a file that has since moved is a leftover
export rather than an instruction, so the build says so and uses the root key.
That rule was written after a stale variable from an earlier terminal session
failed a build with `Keystore file '…/upload.keystore' not found`, naming a path
nothing on disk mentioned any more.

**Back up the file and the password separately, in two places.** This is the
only artefact in the project that cannot be rebuilt. A signing key is not a
password that can be rotated after the fact: whoever holds it can ship an update
to every installed copy of the app, and whoever loses it can ship none.

**Enrol in Play App Signing** when creating the listing. Google then holds the
real signing key and this one is demoted to an _upload_ key, which support can
reset. Without it, losing this file means a new listing under a new package
name — every install and review forfeited.

---

## 3. Code — done

Kept here so nobody re-opens them.

- **Two win-screen defects, both found by playing a release build and neither
  reachable by a test.** Worth keeping together, because they share a root
  cause: a level is settled the instant the board solves, and that instant is
  the _start_ of the winning pour — `POUR_MS` is 1850ms before the Complete
  screen exists. Everything hung off that gap.

  **The winning pour never appeared to land.** `endPour` cleared the animation
  and navigated in the same callback, which React batches into one commit, so
  the board was never painted in its settled state: the last segment was drawn
  by the animation, the animation vanished, and the win screen was already on
  top. `SETTLE_MS` now holds the finished board on screen for 420ms first. The
  timer is kept in a ref and cleared on unmount — input unlocks with the pour,
  so the back button is live during that beat and a stale timer would drag the
  player to Complete from wherever they had gone.

  **The milestone toast fired over the board, mid-pour**, and had faded before
  the player reached the screen it belonged to. Messages are now queued —
  `queueToast` on `overlayStore`, flushed by `CompleteScreen` on mount — rather
  than delayed by a number. That is the requirement stated directly, and it
  deleted a worse version of the same problem: the skin-unlock toast used a
  hand-tuned `setTimeout(3200)` picked to clear the win animation, a value that
  needed re-guessing whenever the animation moved, plus an `unref` cast to stop
  it leaking a Jest worker handle. Four tests cover the queue.

  Neither was a logic error, which is why 597 passing tests said nothing about
  either. Both were sequencing, and sequencing is what a device shows and a test
  does not.

- **Release signing survives prebuild** — `plugins/withReleaseSigning.js`
  rewrites the template's `signingConfig signingConfigs.debug`, which Play
  rejects outright. The generated gradle reads `DECANT_UPLOAD_*` from the
  environment at **build** time, so no keystore password is written into any
  file and changing the key needs no prebuild.

  Three behaviors, all three exercised against gradle rather than assumed:
  all four variables set signs with the upload key; none set falls back to the
  debug key and prints a warning naming the consequence; a partial set throws,
  because a keystore path with no password is a typo or a half-finished CI
  secret rather than a decision. The fallback is deliberate — every tester APK
  is built without those variables, and failing that build would stop work
  unrelated to publishing.

- **`ios.buildNumber` and `android.versionCode` are set**, so prebuild stops
  writing `1` on every run. Play never lets a version code be reused on a
  track — even one that failed to upload — and App Store Connect rejects a
  duplicate within a version, so the second upload was going to fail with an
  error that names the number rather than the missing config.

- **`npm run release:version` moves them together.**
  `script/release-version.mjs` asks whether this is a build, patch, minor or
  major, or takes it as an argument, and writes
  `version`, `buildNumber`, `versionCode` and `package.json` in one go. The
  build number always increments; the semver only moves if the release is one.
  It refuses to run if the two build numbers have drifted apart, rather than
  guessing which is right and burning a version code on Play. Not named
  `version`, because npm fires a script by that name during its own
  `npm version` lifecycle.

- **iOS `NSPrivacyTracking` corrected to `true`**, via `ios.privacyManifests`
  in `app.config.ts` — set there because `ios/` is prebuild output and Expo
  merges the value into the generated `PrivacyInfo.xcprivacy` rather than
  replacing it.

  **The empty `NSPrivacyCollectedDataTypes` beside it is correct and was left
  alone.** An earlier reading of this called the whole file wrong; reading
  Google's own bundled manifest settled it. Apple aggregates each SDK's
  manifest with the app's, so the app declares what _it_ collects and the SDK
  declares what _it_ collects — and Google's does, in full, at
  `GoogleMobileAds.framework/PrivacyInfo.xcprivacy`, including
  `NSPrivacyCollectedDataTypeDeviceID` marked `Tracking = true`. This app
  collects nothing on its own account: MMKV never leaves the device, and the
  analytics log added since is on-device only, with no vendor and no network.
  Apple's "collect" means transmitted off the device, so neither counts.

  What was genuinely wrong was the flag. Apple defines `NSPrivacyTracking` as
  whether the app **or a third-party SDK** tracks, and with AdMob bundled the
  answer is yes.

  `NSPrivacyTrackingDomains` is left empty on purpose. Apple **blocks**
  requests to domains listed there when tracking permission is refused, so a
  wrong entry does not fail review — it silently kills ad fill for everyone who
  declined, which reads as weak demand rather than as a mistake. Google
  publishes no domain list for this key.

- **The release bundle has been built and measured**, which had never been done
  — every previous size figure came from a debug APK and meant nothing.

  `npm run build:aab` produces a **100 MB `.aab`**, and that number alarms
  people who have not taken it apart. Almost none of it reaches a phone:

  | Part of the bundle           | Size     | Delivered?                  |
  | ---------------------------- | -------- | --------------------------- |
  | one ABI + dex + res + assets | ~19.8 MB | **yes — this is the app**   |
  | debug symbols                | 42.9 MB  | no — Play keeps them itself |
  | the other three ABIs         | 32.5 MB  | no — a device gets one      |

  So an arm64 phone downloads roughly **20 MB**, less again once Play splits
  resources by density and language. Of that, `librnskia.so` is 4.6 MB and
  `libreactnative.so` 2.7 MB — the floor of this stack rather than anything to
  trim. The debug symbols are worth keeping: they are what lets Play symbolicate
  a native crash.

  R8 is confirmed to have run — two dex files here against eight in the debug
  APK. The exact download figure comes from Play Console's app size report
  after the first upload; the numbers above are read from the bundle's own
  compressed entries.

- **The ATT prompt is requested** — `requestTracking` in `src/ads/setup.ts`,
  using `expo-tracking-transparency`. Sequenced after the UMP form and before
  `mobileAds().initialize()`: UMP first so the system dialog has a lead-in, the
  SDK last because it reads the tracking status when it starts and would
  otherwise hold "denied" for the whole session.

  The package is installed for its runtime API and is deliberately **not** in
  the `plugins` array. Its config plugin writes
  `NSUserTrackingUsageDescription`, which the AdMob plugin already writes, and
  two plugins owning one plist string makes the value depend on plugin order.

- **50 `SKAdNetworkItems` added**, through the AdMob plugin's own
  `skAdNetworkItems` option so they merge with the SDK's contribution instead
  of racing it for the key. Copied verbatim from Google's published list, last
  updated 30 January 2026. Re-check it at release and on any ads SDK upgrade —
  a stale list costs demand, never correctness.

- **`ITSAppUsesNonExemptEncryption: false`** in `ios.infoPlist`, so App Store
  Connect stops asking the export-compliance question on every upload.

- **Three unused Android permissions removed.** `SYSTEM_ALERT_WINDOW`,
  `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` came from the Expo bare
  template — not from `expo-dev-client`, which was checked and cleared — and
  `prebuild --clean` re-emitted all three every time. `android.blockedPermissions`
  in `app.config.ts` now strips them, verified absent from the merged release
  manifest via `gradlew :app:processReleaseMainManifest`. `SYSTEM_ALERT_WINDOW`
  was the one that mattered: Play treats "display over other apps" as sensitive
  and a puzzle game has no answer for it.
- **`targetSdk` is 36**, which meets Play's requirement.
- **UMP consent runs before SDK initialisation** (`src/ads/setup.ts`), with
  `delayAppMeasurementInit` set so the SDK cannot start before the form is
  answered.
- **R8 and resource shrinking are on** for Android release builds, through
  `expo-build-properties` rather than `gradle.properties`.
- **`.env`, `ios/` and `android/` are gitignored**, so no account-specific
  AdMob ID has ever been committed.

- **The level-complete interstitial is built** — `src/ads/interstitial.ts`,
  doc §8's `interstitial_level_complete`, the last unbuilt slot and the only
  non-rewarded revenue in the game.

  All three of the spec's rules are held, and two of them are held by tests:
  every fourth completion, never inside 90 seconds of the last one, and never
  mid-level. That last one is **structural rather than checked** — the only
  caller is `leaveComplete` in `Root`, which runs between the win screen and
  whatever comes next, the one moment in the app where a level has finished and
  the next has not started. Firing on the win itself would put an advert over
  the board, which is the placement `docs/04-ads.md` §9 rules out, because the
  board is still mounted behind the Complete screen.

  Pacing state is in memory, not MMKV. A relaunch resets the count, so a player
  who quits after every level never meets one — revenue given up in exchange
  for no new storage key and no way for a corrupt record to show adverts it
  should not. Every failure mode here costs an impression rather than showing a
  spare, which is the correct side to be wrong on for an interruption.

  A failed fill does **not** reset the counter: the four levels a player spent
  earning the gap are not taken back by AdMob having nothing to serve.

  Three faults found by reviewing it after it was written, all fixed and all
  now pinned by tests that fail without the fix:

  **The 90-second gap counts every full-screen advert, not just interstitials**
  (`src/ads/adPacing.ts`). Measured interstitial-to-interstitial, it permitted
  the worst sequence the app can produce: finish a level, press Double, watch a
  rewarded advert, and the win screen navigates home on its own once the coin
  shower ends — straight into a second full-screen advert, triggered by a timer
  rather than a tap, aimed at the player who had just chosen to watch the
  first. Taking a rewarded spare vial and finishing the board seconds later did
  the same thing. One clock for every format removes the family rather than the
  two reachable cases.

  **The loading veil is shared** (`src/ads/loading.ts`). It lived inside
  `rewarded.ts`, so the interstitial — which is awaited before the next screen
  appears — left Next dead for up to five seconds with nothing on screen. That
  is the exact failure the veil exists to prevent, and `AGENTS.md` names the
  consequence: a dead button gets pressed again.

  **Neither ad call may reject, and the win screen does not trust that it
  won't.** `Root` navigates in `showLevelInterstitial().then(…)`, so a rejection
  is not a missed advert — it is Home, Replay and Next all doing nothing at
  once, with no way off the screen but killing the app. The throw is real rather
  than theoretical: `createForAdRequest` raises synchronously when the native
  module is missing or the SDK never initialised, and a synchronous throw inside
  a promise executor becomes a rejection that the `try`/`finally` around it does
  not stop. Both `present` functions now settle instead — `unavailable` for a
  rewarded offer, so `paysWithoutAd` still grants the spare vial — and
  `leaveComplete` catches before it navigates, because the guarantee should not
  depend on a file two imports away staying correct. It is invisible in every
  build where adverts happen to work, which is every build anyone tests.

- **`.env.example` named an ad variable that nothing reads.** It documented
  `EXPO_PUBLIC_ADMOB_REWARDED`, while `units.ts` has always read
  `..._REWARDED_ANDROID` and `..._REWARDED_IOS`. Anyone setting up live ads by
  following that file would have filled in a dead name and served test ads
  forever — earning nothing, with no error anywhere. Now four correct names,
  two platforms times two formats.

- **A local analytics log exists** — `src/analytics/`, a 200-event ring buffer
  in MMKV under `analytics.v1`.

  **No vendor and no network.** That is what keeps
  `docs/07-privacy-policy.md` honest when it says the game collects nothing; if
  this module ever learns to `fetch`, that document and both stores' privacy
  forms change in the same commit.

  It earns its place twice over without a backend: a bug report becomes a
  sequence rather than a guess, and the events are named now, while each one is
  understood, instead of being retro-fitted onto a shipped app. Wired into the
  paths worth knowing about — level start, completion, abandon, hint, undo,
  spare vial, ad outcome, daily claim, purchase.

  `track` never throws and is the only thing exported through the front door.
  Reading the log is deliberately not re-exported, so no screen is tempted to
  render it and turn a diagnostic into a feature.

---

## 4. Code — decisions to make, not defects

Each of these is a deliberate gap. They need an answer before launch, and the
answer is allowed to be "not in 1.0".

- **`expo-updates` is installed and configured.** Done 19 August 2026 — see
  `docs/10-updates.md` for the runbook, the account details and the commands.

  In short: EAS Update hosts the bundles, builds stay local with our own
  keystore, the project is `@walqalum-games/decant`, and there are two channels
  — `preview` for tester APKs (the default) and `production` for store builds,
  set with `script/build-apk.sh --production`. `runtimeVersion` uses the
  `fingerprint` policy, because `nativeVersion` is built from the build number
  and this project bumps that on every upload.

  **The rule that survives from the original entry, unchanged and now more
  reachable than it was:** an OTA update must never change level generation
  without bumping `GENERATOR_VERSION`. No board is stored anywhere, so the
  curves, the salts, the generator and the RNG are the save format, and a
  JavaScript-only update that touches any of them silently repoints every
  player's progress at different puzzles — with no store review in between to
  slow it down. The fingerprint test in `difficulty.test.ts` is the tripwire,
  the version stamp is what makes tripping it survivable, and the `preview`
  channel is the new third layer: the only one that catches the mistake before a
  player sees it. Rolling back does not undo it.

  Both platforms are verified: Android carries the channel in the merged
  `AndroidManifest.xml`, iOS in `Expo.plist`, and `--production` was confirmed
  to flip it on each. Not yet proven: no update has been published, and none has
  been received by a device.

- **Play Games Services and Game Center are skipped, and the reason is the
  game rather than the effort.** Recorded because "did we ever consider
  leaderboards?" is a question that comes back, and because the OS-level game
  panels are a _different_ thing that is already done — see below.

  Neither store requires them. Nothing about a submission changes by leaving
  them out.

  What they would buy here is thin. There is no fail state and no timer, so
  there is no competitive axis to rank on; a leaderboard on a game whose whole
  promise is relaxation works against the promise. Achievements are the part
  with real appeal, and `StatsScreen` already shows that progress locally.
  `src/game/dailyPuzzle.ts` records the same conclusion at the source — the
  daily brew was deliberately built with no leaderboard, no sharing and no
  compare.

  What they would cost is the same direction `AGENTS.md` already refused for
  purchasing: sign-in prompts, a wider privacy policy, and re-filed Data Safety
  and App Privacy forms on both stores. Lighter than a custom account system,
  but pointing the same way, and a login banner is a poor first impression on a
  casual puzzle game.

  **Cloud save is the one genuinely attractive piece, and Android already has
  it free.** `allowBackup: true` restores progress from Google Drive — §9
  records it working well enough that reinstalling is useless as a reset.

  If it is ever wanted, the moment is alongside the RevenueCat work, which is
  when account plumbing gets confronted anyway.

  **None of this is what makes a phone treat the app as a game.** Xiaomi's Game
  Turbo, Samsung's Game Booster and the rest read `android:appCategory="game"`,
  which `plugins/withGameCategory.js` sets and which is verified in the merged
  manifest; iOS's half is `LSApplicationCategoryType`, verified in the generated
  `Info.plist`. The only outstanding piece is the Play Console category in §8,
  because several skins classify from the store entry rather than the manifest —
  and a sideloaded APK has no store entry to read.

- **Purchasing (RevenueCat) is phase 2.** See `AGENTS.md`. Blocked on accounts
  in a fixed order: store listing → store products → RevenueCat keys. The
  `Restore purchases` row goes in with that work, not before — both stores
  require it only once something is sold.
- **`Rate us` and `Theme` are badged "Soon"**, and the shop's real-money rows
  are too. `Rate us` unblocks the moment a listing exists. `Theme` and the
  money rows do not.
- **Colorblind marks default to off.** The palette collapses for a deuteranope
  from four colors on, which is roughly level 6 — so about one man in twelve
  meets an ambiguous board long before he would think to look in Settings.
  Worth revisiting as a default.
- **The sounds have only been heard on a simulator.** A phone speaker is where
  a bright chime turns shrill, and the previous audio set died on exactly that
  judgement after measuring fine.
- **There is still no analytics _service_.** `src/analytics/` now records
  events on the device, which answers "what did this player do before it broke"
  but not "how many players reach level 20". Retention, funnel and ad
  performance need a vendor, a privacy-policy change and a re-filed Data Safety
  form. Launching without one is survivable — AdMob reports revenue on its own
  — but it should be a decision rather than a discovery.

---

## 5. Accounts and identity

Start these first. They gate everything downstream and none of them are fast.

- [ ] **Google Play Console** — $25 one-time, plus identity verification
- [ ] **Apple Developer Program** — $99/yr; D-U-N-S number first if enrolling as
      an organization
- [ ] **Store name availability and trademark check for "Decant"** — never run.
      `docs/00-overview.md` and `AGENTS.md` both flag it. Do it before
      reserving either listing, because the name is baked into the bundle id
      (`com.walqalum.decant`), which cannot be changed after publication.
- [ ] **Bundle id registered** on both platforms
- [ ] **Payment profile and tax forms** on both — takes longer than the code

---

## 6. AdMob handover

The build currently runs on Google's public test IDs. Live serving needs all of
this, and the checklist in `docs/04-ads.md` §11 is the detailed version.

- [ ] **The company's AdMob account owns the app**, not a personal one. This is
      a handover, and it should be a `.env` edit — never a commit.
- [ ] All four IDs in `.env`: two App IDs, two rewarded units
- [ ] **A GDPR consent message created and _published_ in AdMob**, under
      _Privacy & messaging_, for **each** app — iOS and Android are separate
      entries. Add the US states message beside it. See below.
- [ ] `EXPO_PUBLIC_ADMOB_LIVE=true`, then `npm run prebuild`
- [ ] Test devices registered in AdMob, so nobody generates invalid traffic
- [ ] **The store listing linked inside AdMob.** Until it is, fill rate is poor
      and the early numbers will mislead whoever reads them.
- [ ] `app-ads.txt` published on the developer website named in the listing
- [ ] AdMob payment profile and identity verification complete

### Without it, Europe sees no ads at all

Not degraded ads. **None.**

**The app cannot create the form.** UMP only displays one authored in the AdMob
console, so with none published `AdsConsent.gatherConsent()` throws — "Failed to
read publisher's account configuration … lack of configured form(s)" —
`setup.ts` swallows it exactly as designed, and the player is asked nothing.

The part that matters is what the SDK does next. Consent is _required_ in the
EEA and cannot be _obtained_ without a form, so Google sets `canRequestAds` to
false and refuses every request — test ad units included. A European player
would reach a game where the rewarded button always answers "No ad available
right now", the daily doubling never works, and the interstitial never appears.
The whole ad business, off, for a region, with nothing in the app to say so.

This was measured rather than reasoned about, and it corrected an earlier
assumption written here — that a missing form merely meant non-personalised ads
at a lower rate. It does not. `EXPO_PUBLIC_ADS_DEBUG_EEA=1` (see `.env.example`)
fakes the geography so the European sequence runs on a developer machine, and
the first run produced exactly that dead state against a real AdMob app ID.

**There is no middle setting.** Published or not published; ads serve or nothing
does. An earlier version of this section offered "accept the lower rate" as an
option and no such option exists.

**The game survives it, and only the revenue does not.** Worth stating plainly,
because it is what makes shipping ahead of the console work defensible rather
than reckless: `paysWithoutAd` grants the spare vial when no advert can be
shown, so a European player stuck on a board still gets their way out, free and
without being told why. What they lose is every _optional_ offer — doubling a
reward, the free-coins button, paying for help with an advert instead of coins —
each of which fails politely into "No ad available right now". Nothing becomes
unwinnable and nothing is gated behind an advert that can never load.

**Turn the flag back off before testing anything else about ads.** While it is
on, every launch resets consent into a state that cannot be satisfied, so ads
stop loading and the symptom looks like a broken ad unit rather than a
deliberate refusal.

Once the message is published, re-run with the flag on. The log should read
`[ads] consent REQUIRED canRequestAds true` after the form is answered, and the
form should appear **before** Apple's tracking prompt.

---

## 7. Compliance forms

Filed in the consoles, but every answer is a fact about the code.

- [ ] **Play Data Safety** — must declare the advertising ID. Confirmed present
      in the merged release manifest as `com.google.android.gms.permission.AD_ID`
      alongside the three `ACCESS_ADSERVICES_*` permissions, so this is not a
      judgement call.
- [ ] **Play ads declaration** — the app contains ads
- [ ] **IARC content rating questionnaire**
- [ ] **Play target audience and content** — the app is rated for everyone and
      is **not** child-directed. `src/ads/setup.ts` sets
      `MaxAdContentRating.G`, which is a different thing, and the console
      answers have to match the code rather than the other way round.
- [ ] **Apple App Privacy labels** — Identifiers and Usage Data for AdMob. Must
      agree with `PrivacyInfo.xcprivacy`, which now declares
      `NSPrivacyTracking: true` — see §3.
- [ ] **Privacy policy hosted at a public URL.** Required by both stores and
      unavoidable with AdMob. The drawer already renders a `Privacy policy` row
      (`src/ui/chrome/SettingsDrawer.tsx`) — it needs a real URL behind it.

---

## 8. Store listing

- [ ] **Play Console category: Game → Puzzle, not App.** OEM game modes and
      performance profiles read the store category, not the manifest, so
      `android:appCategory="game"` and `LSApplicationCategoryType` — both
      already set — do not cover this.
- [ ] **iPad screenshots.** `supportsTablet: true` is set, which makes them
      mandatory on App Store Connect. `npm run ios:pad` is the tablet layout.
- [ ] iPhone screenshots at the sizes App Store Connect currently demands
- [ ] Play: phone screenshots, 7" and 10" tablet screenshots, and a 1024×500
      feature graphic
- [ ] Short and full descriptions, both stores
- [ ] Support URL and contact email

---

## 9. The run before submitting

Nothing on this list is proven by a green build.

1. `npm run check:all` — six gates, all passing
2. **Build a signed release and play a full level on a real device.** R8 strips
   what only reflection reaches, and that fails at runtime, not at build time.
   `npm run build:apk` — the **APK**, not the bundle; a phone cannot install an
   `.aab`.

   **Done, 2026-08-12, physical Android.** R8 broke nothing: the board draws,
   the pour animates, session and progress survive. Confirmed working — the
   interstitial appears on the fourth completion and hands off to the next
   level afterwards, and block one pays 120 coins, which is the taper's first
   rung exactly (4 coins × 30 stars).

   It found two defects, both since fixed and both invisible to every test in
   the suite because both were about _when_ something happened rather than
   whether it happened. See §3.

   **Android Auto Backup makes reinstalling useless as a reset.** `allowBackup`
   is on by design, so uninstalling and reinstalling restores progress from
   Google Drive. To get genuine first-run state, clear the data instead:

   ```sh
   adb shell pm clear com.walqalum.decant
   ```

3. **Listen to the sounds through a phone speaker**, not a simulator — see §4.
4. **Verify the ads path against live IDs** with a registered test device, and
   check that a refused or failed rewarded ad still grants the spare vial.

   **Done against test units, 2026-08-12**, iOS simulator and physical
   Android. Every one of these was checked by hand because none of them is a
   claim about this project's code — they are claims about how Google's SDK
   behaves, and the suite cannot make those:

   - The ATT prompt appears once on a fresh install, carrying the wording from
     `app.config.ts`. Choosing _Ask App Not to Track_ leaves rewarded adverts
     filling and paying normally — the majority path, since most people
     decline.
   - Four completions produce exactly **one** interstitial, and it lands after
     the win screen rather than over the board.
   - Doubling a reward and then letting the win screen navigate on its own
     produces **no second advert**. That sequence used to show two full-screen
     adverts back to back, the second triggered by a timer rather than a tap.
   - A spare vial is still granted when no advert can be shown. This is the one
     that must never fail: it is the escape hatch on a board the player cannot
     finish.
   - Replaying a finished level does not pay its block bonus again.

   Still to do here: the same pass against **live** ad units, and the UMP form
   ahead of it, which needs the consent message published first — see §6.

5. Check the tablet layout on an iPad after the same build.
6. Confirm the merged release manifest still has no `SYSTEM_ALERT_WINDOW`:

   ```bash
   grep uses-permission \
     android/app/build/intermediates/merged_manifest/release/*/AndroidManifest.xml
   ```

---

## 10. Architecture work — not a launch blocker

Recorded here so it is not confused with the list above. None of it changes
behavior and none of it gates a submission; all of it is cheaper to do before
the codebase has a shipped version to keep working.

- **`src/state/gameStore.ts` is a god store** — 1251 lines, 25 state fields, 15
  actions, and six unrelated concerns in one closure: board and selection,
  undo/redo, the hint plan, the deferred par search, payouts and milestones,
  and session persistence. Extractable into collaborators behind the same
  `useGameStore` surface, so no screen changes.
- **One Skia `<Canvas>` per `Icon`** (`src/ui/Icon.tsx`). The nav bar alone
  mounts five, and Home carries roughly a dozen live native surfaces to draw a
  dozen static glyphs. This is the app's real memory cost, and the one place
  where consolidating is worth measuring.
- **Three layer violations**, each a constant parked in the consumer's layer
  instead of a shared one: `state/overlayStore.ts` imports `IconName` from
  `ui/Icon`, `game/difficulty.ts` imports from `theme/colors`, and
  `audio/sounds.ts` imports pour timing from `render/pour`.
- **`src/types/` and `src/analytics/` are empty directories.**
- **Styles live in mirrored trees** (`ui/styles/`, `ui/chrome/styles/`), so
  every component is two files in two places. Colocating keeps the no-inline-
  StyleSheet rule and drops the mirror.
- **Allocation in the solver's hot path** — `applyPour` deep-copies every tube
  and `solver.ts` builds its state key by `map().join()`, both once per IDA*
  node. Measured p95 is 11ms, so this is headroom rather than a problem.
