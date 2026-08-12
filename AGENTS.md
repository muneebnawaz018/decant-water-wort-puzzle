# Expo HAS CHANGED

Read the exact versioned docs at <https://docs.expo.dev/versions/v57.0.0/>
before writing any code.

---

## Decant — project context

Water sort puzzle game. First title to ship. Spec lives in
`docs/01-water-sort.md` — read it before building anything; it is the source of
truth for rules, generation, difficulty curve, theme, and ad slots.

## Name

**Decant.** Chosen over the doc's original working title "Vial".

Play Store and trademark availability NOT yet verified — check before reserving
the listing.

Names, and which is which:

- Store title / app name: `Decant: Water Sort Puzzle` (25 chars)
- Launcher name (`app.json` `expo.name`): `Decant` — long names truncate on the
  home screen; the full title lives in the Play/App Store listing, not here
- npm package name and repo folder: `decant-water-wort-puzzle`
- Expo slug: `decant`. Bundle id / package: `com.decant.watersort`
- Spec file kept its original filename, `docs/01-water-sort.md`

## Stack decision

Expo SDK 57 (RN 0.86, React 19, TypeScript strict), **prebuild workflow — not
Expo Go**. Skia and MMKV need a native build: `npm run android` / `npm run ios`.
Ships on both iOS and Android from this one codebase.

Expo was chosen over bare RN CLI deliberately. Reasons: config plugins handle
the AdMob native wiring (ads are the business model), EAS Build/Submit gives the
store pipeline this project exists to prove, expo-updates allows shipping
level-gen fixes without a store review, and SDK upgrades avoid hand-diffing
`android/` and `ios/`. Prebuild still produces real native dirs you can edit. Do
not "fix" this by migrating to bare CLI.

## Layout

```text
src/core/      pure game logic, no React, unit-tested
  types.ts     WaterState, PourMove, LevelParams (doc §4)
  waterCore.ts canPour / pourCount / applyPour / undoPour / isSolved
  rng.ts       seeded mulberry32; seedForLevel(n) so level N is identical everywhere
src/utils/     pure helpers shared by the UI (clamp, percentWidth, plural)
src/theme/     colors.ts palette · typography.ts type presets · fonts.ts family
               names · apothecary.ts the renderer's Theme shape
src/game/      level generation, session/level flow
src/render/    Skia board, tubes, pour animation
src/state/     zustand stores + MMKV persistence
src/ui/        screens; chrome/ shared components; hooks/; styles/
src/audio/     expo-audio + expo-haptics                 (empty)
src/analytics/ event log                                 (empty)
src/ads/       stubbed slots, phase 2 (doc §8)           (empty)
```

**A component file holds no StyleSheet.** Every `Foo.tsx` has a
`styles/Foo.styles.ts` beside it exporting `styles`, and any layout constant the
styles need (`RACK_HEIGHT`, `HUD_HEIGHT`, `GAP`) is exported from there too
rather than declared in the component — a constant used by both belongs with the
layout, not with the markup. Components import `{ styles }` and read as markup.

Repeated type is a preset in `src/theme/typography.ts`, not a hand-written
`fontFamily`/`fontSize`/`color` triple. The presets exist because the same
eyebrow label had already drifted to 10/0.8 on Home and 10/0.9 in Shop. They are
plain objects, deliberately **not** `StyleSheet.create` — the registered form
cannot be spread, and `{ ...text.rowLabel, flex: 1 }` is the whole point.

Anything below Home is a `ScrollPage` (`chrome/ScrollPage.tsx`): safe-area top,
header, scrolling body. Four screens were each repeating that frame down to the
same `insets.bottom + 30`. Safe-area padding comes from `useScreenPadding`,
pre-shaped and memoised so the style objects keep their identity.

`@/*` maps to `src/*` — configured in both `tsconfig.json` and
`babel.config.js` (module-resolver), and mirrored in `jest.config.js`.

## Commands

```bash
# native builds — required, Expo Go cannot load Skia or MMKV
npm run prebuild        # generate android/ and ios/
npm run prebuild:clean  # regenerate from scratch after a plugin/config change
npm run ios             # expo run:ios     — build + install + launch, iPhone 17 Pro
npm run ios:pad         # the same, on iPad Pro 11-inch — the tablet layout
npm run android         # expo run:android
npm start               # expo start --dev-client — Metro for an installed build

# checks
npm run check:all       # all six gates in parallel, one summary — use this
npm test                # jest
npm run typecheck       # tsc --noEmit
npm run lint            # eslint, zero warnings tolerated
npm run lint:fix        # eslint --fix
npm run lint:md         # markdownlint-cli2
npm run format          # prettier --write, with a summary of what changed
npm run format:check    # prettier --check, no writes
npm run lint:dead       # knip — unused files, exports, deps; zero tolerated
npm run lint:dead:fix   # knip --fix, deletes what it is sure about
npm run doctor          # expo-doctor, must stay at 20/20
```

iOS needs Xcode + `pod` (CocoaPods); Android needs JDK 17 and the SDK. No `web`
script: MMKV has no web build and the game is phone-only.

### `npm run doctor` is a wrapper, and why

`script/doctor.mjs`, not `expo-doctor` directly. Doctor's nineteen other checks
run untouched and stay fatal; only its dependency-version check is replaced.

Expo publishes patches to an SDK continuously and doctor compares against its
**live network** recommendation, so the gate went red every week or two on patch
drift alone (`57.0.9` against `57.0.10`) with nothing changed here. Chasing each
one costs a prebuild, a rebuild and a re-test for bug fixes the app may not even
be hitting, and a gate that cries wolf stops being read.

**`expo.install.exclude` was tried first and is the wrong tool** — worth
recording so nobody reaches for it again. The name suggests a filter; it is a
blindfold. Excluded packages leave version validation entirely, at every
severity, and leave `npx expo install --fix` with them. Measured rather than
assumed: with eight packages excluded, `expo-asset` was set to `11.0.0` against
a required `~57.0.10` and doctor still reported 20/20. `expo` itself had to be
on that list to silence the noise, so an SDK 58 upgrade would have left all
eight behind on SDK 57 — silently, at the worst possible moment.

The wrapper sets `EXPO_DOCTOR_SKIP_DEPENDENCY_VERSION_CHECK` and does the
version check itself against `node_modules/expo/bundledNativeModules.json` —
the manifest shipped _inside_ the installed `expo` package, saying what this SDK
expects. **That local file is the whole trick**, because it moves only when
`expo` does:

| Case                                      | Result                      |
| ----------------------------------------- | --------------------------- |
| Patch drift against Expo's newest release | invisible — the noise, gone |
| A package installed at the wrong version  | fails (major difference)    |
| SDK bumped, packages left behind          | fails (minor or worse)      |

That last row is the case `install.exclude` would have hidden, and it is the
one worth having a gate for at all.

The trade, stated plainly: a patch Expo publishes _after_ your installed SDK was
cut is invisible here. That is the design, not an oversight — sync patches
deliberately at release time with `npx expo install --check`, and look hardest
at `expo-splash-screen`, the one package whose patch could move something
visible, since the two-splash handoff depends on exact numbers.

`drift()` compares major and minor against the range's floor rather than calling
`semver`. Severity is the only question being asked, every value in that file is
a plain `~x.y.z`, and `semver` is in `node_modules` only as a transitive of
npm's own tree — reaching for an undeclared package is how a script breaks on an
unrelated dependency bump.

Full command reference, cache/clean escalation, and the RN 0.6x → 0.86
differences live in `docs/02-commands.md`.

## The commit gate

`.husky/pre-commit` runs prettier, eslint, tsc, markdownlint, jest and knip at
once and blocks the commit if any fail, printing a per-file error count rather
than a wall of output. Prettier, eslint and markdownlint see only the staged
files; tsc, jest and knip cannot be scoped that way and run over the project.

The hook never writes to your files. A gate that reformats what you are
committing changes what you reviewed — it tells you to run `npm run format`
instead. It calls `node_modules/.bin` directly rather than through `npx`, which
re-resolves the package on every call.

Jest is in the gate on purpose. Determinism is part of the save format here, so
the fingerprint test that catches a repointed level has to run _before_ the
commit, not after.

Knip is configured strictly — `include` lists every issue type it supports, and
a finding is an error, not a report. Its first run found fourteen exports that
nothing outside their own file used, plus a dead `ts-jest`; `jest-expo` handles
the transform. Nothing else in the gate notices dead code: tsc, eslint and the
tests are all perfectly happy with an export whose last caller was deleted.

The four `ignoreDependencies` entries are native or config-only packages knip
cannot see through — `babel-preset-expo` and `babel-plugin-module-resolver` are
named as strings inside `babel.config.js`, and `expo-updates` arrives as a
native transitive of `expo-dev-client`.

`plugins/*.js` is in `ignore` for the same blind spot, one level up: a config
plugin is named as a **path string** in `app.config.ts`'s `plugins` array and is
never imported, so knip sees an unreferenced file with an unused default export.
`entry` is the wrong instrument here and was tried — `includeEntryExports` is on,
so knip then flags the plugin's own `module.exports` instead. The eslint rules
next door look like the same case and are not: `eslint.config.mjs` genuinely
imports them, so they sit in the import graph.

Two ESLint rules in `script/eslint-rules/` hold this project's own invariants,
both errors:

- `local/no-raw-colour` — a hex or `rgba()` outside `src/theme/colors.ts`. It
  found two on its first run: a hard-coded mote colour in `Backdrop` and the
  wordmark's emboss.
- `local/no-inline-stylesheet` — `StyleSheet.create` in a `.tsx`.

Signed/signed-off commits are deliberately **not** enforced here, unlike
`flex/admin-ui` — no signing key is configured on this repo. The hooks for it
live in that project if it's ever wanted.

## Dependencies — what each one is for

| Package                          | Why it is here                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `expo`                           | SDK 57 runtime, config plugins, prebuild                                                                 |
| `expo-dev-client`                | Custom dev build; replaces Expo Go, which cannot load Skia/MMKV                                          |
| `@shopify/react-native-skia`     | Draws the whole board — tubes, liquid, gradients, meniscus, glass highlight (doc §9)                     |
| `react-native-reanimated`        | The 350ms pour animation on the UI thread; JS-thread animation drops frames                              |
| `react-native-worklets`          | Reanimated 4's worklet runtime — a peer dep, not a direct import                                         |
| `react-native-gesture-handler`   | Native tap handling on tubes; RN's `Pressable` misses fast taps during animation                         |
| `react-native-mmkv`              | Synchronous key-value store for progress/settings. Sync matters — save must survive force-quit (doc §13) |
| `zustand`                        | Game/session store. Small, no boilerplate, works fine outside React for the pure core                    |
| `react-native-safe-area-context` | Notch/gesture-bar insets for board layout                                                                |
| `expo-audio`                     | Pour sound pitched by destination fill, chimes (doc §7). Replaces the removed `expo-av`                  |
| `expo-haptics`                   | Haptic on every pour, heavier on tube completion (doc §7)                                                |
| `expo-asset`                     | Bundles fonts/audio into the native build                                                                |
| `expo-status-bar`                | Status bar styling over the parchment background                                                         |
| `expo-build-properties`          | Turns on R8 and resource shrinking for Android release builds; both default off                          |
| `babel-plugin-module-resolver`   | Resolves the `@/*` → `src/*` alias at build time                                                         |
| `jest-expo` / `ts-jest`          | Test preset for RN + TS                                                                                  |
| `markdownlint-cli2`              | `npm run lint:md`                                                                                        |

Not installed yet, needed later: `react-native-google-mobile-ads` (doc §8,
phase 2), `expo-updates` (ship level-gen fixes without a store review).

## Invariants

- Core logic in `src/core` stays pure and React-free so it can be unit-tested
  and run in a level-preview tool.
- A pour moves the **whole** top run of matching segments, capped by free space.
  One-at-a-time feels broken.
- Level generation is reverse-generation from a solved board, with an acceptance
  gate (doc §5). Seeded, so level N is reproducible.
- Difficulty is driven by **extra empty tubes**, not colour count. 2 spare →
  1 spare is the big jump; spend it late. Past the shape ceiling the dial is
  selection pressure — see the difficulty section.
- **The scramble must not clump.** A uniform reverse walk preserves the runs a
  solved board starts with, and produces boards that look half-played. Score
  un-pours and take the least-clumping one.
- No timer, no fail state. The genre sells relaxation.
- Lock input for the 350ms pour animation or queued taps cause double pours.
- **A refused pour re-arms the tube that was tapped.** The selection used to
  stay put on the theory that the player was aiming; in practice a refusal is
  nearly always a mis-tap on the _source_, and keeping the wrong tube armed
  meant tapping it again just to clear it. The outcome is still `illegal`, so
  the warning haptic and sound still fire — the pour did not happen, and only
  the selection moved.
- `rewarded_extra_tube` is the highest-value ad slot. Never show an ad mid-level.

## State — as of the last session

Done: project scaffold, deps, config, `waterCore` + `rng` + theme, expo-doctor
20/20, docs lint clean. Level generation is finished — `src/core/solver.ts`,
`src/game/levelParams.ts`, `src/game/waterGenerator.ts`, 22 passing tests.

Verified over levels 1–1000: every board passes the gate, every board solvable,
every solution replays to a solved state. Longest solution 51 moves, ~3.4ms to
generate a level.

**The doc's `inverseMoves` pseudocode (§5) has a bug.** It allows lifting a
tube's whole top run when other colours sit underneath; that un-pour has no
legal forward inverse, so a scramble can reach a board with no path back to
solved. `src/game/waterGenerator.ts` only permits a whole-run lift when the tube
empties. A test replays every generated un-pour backwards to hold the line.

Two deliberate deviations from §5, both commented at the source:

1. "reachable in under 60% of the scramble steps" needs an optimal solution
   length, which is unaffordable to compute on a 12-colour board. Replaced by a
   scale-free fragmentation ratio carrying the same 60% intent.
2. That floor is unreachable at capacity 5 — measured range is 0.50 to 0.68 —
   so the floor drops to 0.50 there. Solvability and the already-solved-tube
   check carry the gate on those levels.

Also done: Skia board render (`src/render`), game and settings stores with MMKV
persistence (`src/state`), and the splash → home → stages/game/settings flow
(`src/ui`), with icon buttons, back navigation, and screen transitions. 54
tests. Every screen verified running on the iOS simulator.

Icons are Skia-drawn SVG paths in `src/ui/Icon.tsx` — no image assets, no
`react-native-svg`, no Lottie. Lottie was considered and skipped: it needs a
native rebuild and a JSON artwork pipeline we have no artwork for, and Skia plus
Reanimated already cover vector icons and UI-thread motion.

## Difficulty modes

Three modes in `src/game/difficulty.ts`: gentle, classic, fiendish. **Each mode
owns a whole curve table in `levelParams.ts`** — not one shared table with
modifiers. The modifier design ("fiendish = classic + 1 colour − 1 spare") had
two structural bugs: the `−1 spare` hit the one-spare floor at level 1, so
fiendish burned the game's main lever before its first board and the mode gap
_halved_ at 201 when classic finally jumped; and the `+1 colour` collided with
the 12-colour clamp in the rotating endgame, making a third of fiendish's
endgame classic's exact shape on a different seed. Own tables: fiendish starts
at two spares and spends them at 101 (a hundred levels before classic's 201),
runs a fixed 12-colour endgame, and gentle never drops below two spares, never
leaves capacity 4, and never tightens its gate — the relaxation promise held
structurally. A board never drops below one spare tube anywhere. Each mode
keeps its **own** unlocks, current level, and best scores (keyed by mode).

### The scramble picks the least-clumping un-pour

**This is the fix for "almost all vials have similar colour patterns", and it
is one line of the walk.** A uniform reverse walk is biased toward
half-solved-looking boards structurally, not by luck: an un-pour lifts part of
a uniform top run, so it _preserves_ whatever sits underneath, and the only
move that clears a tube's bottom is one that empties it. The long runs the
solved board starts with therefore survive the scramble — and more steps do not
help, because the distribution saturates (130 steps and 300 produce identical
statistics).

`scramble` now scores every candidate un-pour with `clumpDelta` and takes the
best, ties broken randomly. The delta is O(1) — an un-pour touches exactly two
runs, so no board copy is needed, which is what makes scanning every candidate
cheaper than sampling a few used to be. Measured at 12 colours, capacity 5, 20
boards each:

| 12c / cap 5        | uniform | least-clumping |
| ------------------ | ------- | -------------- |
| tubes with a 3-run | 9.1     | 0.85           |
| segments in runs   | 32.1    | 2.5            |
| fragmentation      | 0.44    | 0.55           |
| par                | 20      | 27             |

Par going **up** is the part to remember: a board that looks pre-played largely
is pre-played, so un-clumping is not cosmetic — it hands back the moves the
clumps had already made for the player.

A **random deal** was the other candidate and lost on cost, not on looks. It
cannot produce a one-spare board at all (0% of random deals are solvable there)
and its boards run par ~49, where the exact-par search costs 4s at p95 on a
laptop against 2ms here — unaffordable on a phone, and par now feeds the hint
plan as well as the rating.

`maxLongRunMass` in the gate is the matching measure: segments sitting in a run
of 3+. It replaces `maxCappedTubes` as the real check, which had a blind spot
that caused the whole bug — it only ever saw a run of `capacity - 1`, so a
board of eleven 3-run tubes reported **zero** capped tubes and passed.

### Difficulty past the shape ceiling is selection pressure

Colours cap at 12 (palette), capacity at 5 (par-search cost), spares floor at 1,
and the scramble saturates — so past the top of a curve the _shape_ cannot get
harder. What still can is how hard the generator looks: `generateLevel` keeps
the **hardest accepted board of the sample** (by `moveLowerBound`, not by
fragmentation), and `samplesFor` grows the sample with the level, ramped on
`log2` so early levels move fast and late ones keep inching. Measured lift at
the endgame: classic par 26 → 28, fiendish 27 → 31.

The ramp runs to roughly **level one million** before its cap (gentle 16,
classic 40, fiendish 56 samples). It used to stop at 32× each mode's ramp
start — best-of-24 by fiendish 1280 — which made every level past that
statistically identical, the old 503-plateau one octave up. In `samplesFor`
the **slice (slope) and cap are separate numbers on purpose**: the cap used to
be derived into the slope, so raising it would steepen the whole curve and
silently repoint every level above the ramp start. Decoupled, raising the cap
touches only levels past the old plateau, and a test pins the mid-game values
byte-for-byte. Measured at the far end: fiendish level 1,000,001 generates in
59ms on a laptop (≈0.2–0.3s on a phone, that level only — level 1281 is
unchanged at 17ms), bound 29 → 31 between the old plateau and the million
mark. Best-of-N grows on a log, so a cap past 56 buys almost nothing — the
walk's hardest producible board is an edge no sample size passes.

`moveLowerBound` is the right ranking key now for a reason worth keeping: on
un-clumped boards it sits within a move of the true optimum (measured gap p50
0–1, max 2), so ranking by it is ranking by par. Fragmentation was only ever a
proxy and is now just the tie-break.

**There is no difficulty floor, and that is deliberate.** One was built and
removed. Ramped above the median it rejected 27 of 30 boards at classic 201 —
capacity-4 boards land on their median almost every time, so a bar above it is
a bar nothing clears; lowered under the median it was redundant, because
selection already discards the easy tail. A rejected board is not a harder
board, it is a level that falls back to whatever the fallback ranking liked.

It was also the wrong instrument for this game. There is no fail state and no
timer, so a board that falls together easily is a short pleasant one rather
than a defect, and the stars already say what a run was worth. Measured with no
floor at all: 0 rejections across every mode from level 1 to 5030, and the
smallest board the generator opens on still needs 6 pours.

Gentle tops out at **10 colours**, and the reason is par cost rather than
difficulty: capacity 4 with two spares is the most expensive shape to search
(all that empty space branches), measuring 138ms worst at ten colours, 209ms at
eleven, 418ms at twelve on a laptop. Par is deferred, but a second-long block
just after the board appears is a stutter on the calmest mode in the game.

**Determinism is load-bearing and must not be broken.** No board is ever stored;
level N in a mode is rebuilt from `seedForLevel(level, DIFFICULTY_SALT[mode])`.
That means the difficulty curves, the gate ramps, the salts, the generator, and
the RNG are all part of the save format in practice. Changing any of them
silently repoints every player's progress at different puzzles.
`src/game/__tests__/difficulty.test.ts` pins level 30 in **all three modes**
against recorded fingerprints to catch exactly that; if one fails, the fix is a
migration, not a re-recorded expectation. Classic's curve is byte-identical to
the original shared table below 501, on purpose — its pin proves the mode
rewrite moved no tuned board. `GENERATOR_VERSION` is at 2 for the rewrite.

Storage keys were bumped to `progress.v2` / `settings.v2` when modes landed. The
old v1 records are ignored rather than migrated — acceptable pre-release,
because nothing has shipped.

### The level in progress

`src/state/session.ts`, key `session.v1`. Doc §13 asks for a save that survives
a force-quit; progress between levels always had one, and this is the half that
was missing — quitting on move 40 of 51 used to come back at move zero.

**No board is stored.** Level N is rebuilt from its seed, so the moves made
since are the only thing that cannot be recomputed; replaying them onto a fresh
board reproduces the position exactly. A snapshot would be bigger, would
duplicate what the generator already knows, and could drift out of step with it.

The record is `{ difficulty, level, moves, extraTaken, hintsUsed, paidHints,
paidUndos, freeUndosUsed }` and the moves are flat `[from, to, from, to, …]`.
`count` is deliberately absent — `applyPour` decides it, so storing it only
invites a saved number and a replayed number to disagree. A worst-case board
(51 moves, the longest over levels 1–1000) is a hundred small integers, which
is why it can be rewritten on every pour rather than batched. MMKV is
synchronous, so the write lands before the frame does; an AppState listener
would not run at all when the process is killed. `saveSession` also stamps
`gen: GENERATOR_VERSION` — see the storage section below.

Lifecycle: written after every pour, undo, redo, restart and spare vial;
cleared the moment the level is solved, and when another level or another mode
is opened. A record with no moves and no spare vial is deleted rather than
stored, so an opened-and-abandoned level leaves nothing behind.

Three guards, all tested. `loadSession` validates every field, because the
record outlives the app version that wrote it, and refuses a record whose
`gen` stamp is not the current `GENERATOR_VERSION`. And `restoreSession`
returns null — start the level clean — if any saved move is not legal from the
position before it. That is the escape hatch for determinism being
load-bearing: change the curve, a salt, the generator or the RNG and level N
is a different puzzle, so the moves stop making sense. The stamp covers the
remainder the replay check cannot: moves that happen to be legal on the new
board would replay into a position nobody was ever in. Losing your place is
acceptable; a board the game cannot reason about is not.

The spare vial is appended before the replay rather than at the move it was
taken. It lands at the end, so no earlier move can name it and every tube a
move does name keeps its index — the same reason `addTube` grows `initial`.

`future` is not saved. A redo stack is a within-session affordance, and
restoring one would mean carrying moves the player has already rejected across
a relaunch.

Undo and redo are both in. `history` and `future` in `gameStore`; a fresh pour
empties `future`, because that is a new branch and the undone moves are no
longer reachable. Redo returns the same `poured` outcome a tap does, so it runs
the full pour animation rather than snapping the board.

### Storage keys and migrations

Six live keys, one MMKV instance (`decant`), all through `src/state/storage.ts`:
`progress.v4`, `settings.v3`, `economy.v3`, `session.v1`, `bonus.v1`,
`played.v1`, and whatever legacy key a store is still migrating from. An app
update never loses data on its own — MMKV's file sits in app-private storage,
which both platforms keep across store updates. What loses data is key bumps
and generator changes, so both are governed:

- **Additive change → same key, optional field.** Every `load()` validates
  field by field, so a missing field defaults and an old record still reads.
  `hintUsed` → `hintsUsed` and `paidUndos` on `session.v1` are the pattern: no
  bump, nobody's position discarded. A bump is only for a field whose
  _meaning_ changed — economy v2's `streak` counted claims, not visits, and
  carrying the number would invent a history.
- **Key bump → migrate, write, then delete the old key, in that order.** A
  crash mid-migration leaves both records and the next launch migrates again.
  The delete is not hygiene: `readJson` drops a corrupt record and returns the
  fallback, so a legacy key left on disk is what a corrupt current record
  silently resurrects — a build-old wallet, or a `paidBlocks` list empty
  enough to pay every milestone again. Keys nothing migrates from any more
  (`progress.v1`, `settings.v1`/`v2`, `economy.v1`) are removed on sight at
  `storage.ts` import.
- **The generator is versioned: `GENERATOR_VERSION` in
  `src/game/generatorVersion.ts`.** No board is stored anywhere, so the curve,
  the salts, the generator and the RNG are the save format. `saveProgress` and
  `saveSession` stamp the constant; on mismatch `loadProgress` keeps levels,
  stars and `paidBlocks` — still true of the new boards — and drops `best`,
  the one field that measured the old ones, while `loadSession` retires the
  record. Bump it in the same commit that re-records the level-30 fingerprint
  in `difficulty.test.ts`, never one without the other. This matters double
  once expo-updates ships level-gen fixes OTA: the fingerprint test is the
  tripwire, the stamp is what makes tripping it survivable.
- **Cross-store writes order mark before money** — see the milestone section.
- **`storage.ts` opens MMKV in a try/catch** and falls back to an in-memory
  store: every record is validated and rebuildable, so one session without
  persistence beats a crash on the launch path before any screen exists.
- **Backups are on, on purpose** — `allowBackup` is set explicitly in
  `app.config.ts` (the manifest is prebuild output; edits there evaporate).
  A restored backup carries the daily-reward record, so restoring an old one
  re-opens claimed days; accepted for the same reason clock-winding is.
- **Skin ids are save format too** — `settings.skin` holds one, `economy.owned`
  will hold a list, and `skins.test.ts` pins the ids. Add ids freely; renaming
  or removing one needs a rename map in the load paths first, or a player's
  purchase orphans silently.
- One accepted gap: `bonus.v1` keys its cooldown to the local calendar day, so
  crossing timezones can stretch a wait or open a second puzzle in one local
  day. Coins-only stakes, same acceptance as device-clock winding.

Perf rules being followed in the UI, worth keeping:

- **Never allocate an `SkPath` in a render body.** Both the tube outlines and
  the glass highlights build theirs in a `useMemo` keyed on layout. Inline
  construction churned one native object per tube per render.
- **Icon paths are parsed once, module-level** (`PATHS` in `Icon.tsx`). They
  are immutable — only the canvas transforms — so one copy per glyph is safe.
- **One reaction per animated element, not one per property.** `useUiValue3`
  computes x, y and opacity together; three separate `useUiValue` calls meant
  three per-frame subscriptions each, and the backdrop's fourteen motes made
  forty-two. `useUiValue2` does the same for the pairs — the meniscus wobble
  and each bubble — taking the rack from twenty-four reactions a frame to
  twelve.
- **Time-based animation is measured in frames, not milliseconds.** The app
  runs at whatever the panel offers, 120Hz included —
  `CADisableMinimumFrameDurationOnPhone` is in the generated `Info.plist` (Expo
  sets it from SDK 54; without it iOS pins ProMotion to 60), and Android
  follows the display. So a constant like "ignore a gap over 50ms" means three
  frames on one phone and six on another, which is backwards: the faster panel
  is where a jump shows most.

  `advanceDrift` in `src/render/backdrop.ts` learns the frame interval from the
  frames themselves and clamps a stall to three of them. Nothing is told the
  refresh rate and nothing needs re-telling when it changes — Android drops to
  60 under thermal load and iOS varies ProMotion between 10 and 120 on its own,
  so a rate read once at mount is wrong for most of a session. A stall is kept
  out of the estimate; letting one in would raise the ceiling meant to catch
  the next. Drift speed is unaffected by any of it — the clock advances by real
  elapsed time, so it covers the same ground per second at every rate, and a
  test pins that across 30, 60 and 120.

- **A canvas redraws every node on it when any one value changes.** This is the
  rule most of the cost on this app traced back to, and it has two
  consequences worth keeping in mind.

  Static art on an animated canvas is re-rasterised forever. Home's rack was
  fourteen draw calls per vial, twelve of them carrying a `BlurMask`, and the
  bubbles alone were re-running those gaussians sixty times a second for a
  pixel-identical result. It is now recorded once with `createPicture` and
  replayed as a single op; only the meniscus and the bubbles are live nodes.

  And motion belongs on its own surface. The backdrop's fourteen two-pixel
  motes were forcing three full-screen gradient fills every frame — behind
  every screen, for as long as the app is open. The gradients now have their
  own canvas underneath and rasterise once.

  So: if it cannot move, it goes in a `Picture` or on a separate canvas.

- **Never select a store method to derive rendered state.** The selector
  returns a stable function identity, so the component never re-renders when
  the data behind it changes. Home reads `lastClaim` and compares it; reading
  `claimable` instead left "Ready to claim" stale after a claim.

- Screens mount one at a time in `src/ui/Root.tsx`. An unmounted screen cannot
  animate or hold a Skia surface.
- The splash animation runs on the UI thread and cancels on unmount. Nothing
  loops.
- Handlers read stores through `getState()` rather than subscribing, so the tap
  gesture is never rebuilt and settings changes never re-render the board.
- Settings live in their own store for the same reason.
- `Board` and the layout are memoised; layout only recomputes when tube count,
  capacity, or the box changes.

The pour animation is in (doc §7). `src/render/pour.ts` holds the timing phases
and arc geometry as pure functions; `src/render/Board.tsx` draws the stream,
the rising level, and the splash. It runs for exactly `POUR_MS` (350ms) with
input locked, and the receiving level does not start rising until the arc has
had time to land — filling early is what makes a pour look fake.

A pour flies the tube out of the rack, tilts it over its lip, runs a stream
into the destination, drips the last few drops off the lip, and returns.
`POUR_MS` is 1150 — doc §7's 350ms covers the pour itself, and at that speed
alone the whole thing reads as a snap rather than as liquid.

## The liquid shader

The arriving liquid is drawn by an SkSL fragment shader, not a rectangle —
`src/render/liquid.ts` holds the source, `liquidEffect.ts` compiles it. Every
pixel asks "am I below the surface?", where the surface is two travelling waves
pinned at the tube walls, decaying as the liquid settles. It costs about what
filling a rect costs, because the GPU answers for all pixels at once.

The split between the two files is deliberate: importing Skia outside a native
runtime throws (it needs JSI bindings), so the shader source and its helpers
live in a Skia-free module and stay testable.

To animate a shader, pass `uniforms` as a plain shared value built with
`useUiValue` — the same rule as every other animated Skia prop here.

## The handoff redesign

`docs/decant-handoff/` is the current visual source of truth: `BUILD-SPEC.md`
plus a playable `decant-prototype.html`. It is **gitignored** — a local working
reference, not shipped source. It supersedes doc §9's parchment
theme. Read the spec before touching any screen.

Theme is now dark: deep purple ground, warm lamp glow, gold chrome, pure
saturated liquids.

**`src/theme/colors.ts` is the only file allowed to contain a hex or an
`rgba()` string.** Everything else imports from it. Three layers:

- `colours` — the raw palette, one entry per colour that exists in the design.
- `ui` — semantic names (`ui.glassEdge`, `ui.wellDeep`, `ui.accentWash`).
  Components use these.
- `gradients` — named stop pairs, so two components cannot invent the same
  ramp slightly differently.

Translucency comes from `alpha(name, opacity)`, never a second hand-written
string, so moving a base colour carries to every translucent use of it. It
takes a palette _name_, not a hex, so a literal cannot be smuggled back in and
a rename breaks the build.

`src/theme/__tests__/colors.test.ts` fails the build if two palette entries
share a value, if any board's colours come within ΔE 30 of each other, or if a
liquid comes within ΔE 40 of the background. Those checks have already earned
their keep — they caught `wash` and `plum` holding the same purple, and the
liquid palette letting two near-identical purples co-occur from level 201.

**The `pieces` array is ordered by separation, not by the spec's listing
order.** `paramsForLevel` takes the first N, so the order decides which
colours a board can use. Farthest-point ordered, the closest pair in the first
eleven is ΔE 33; the one tight pair only ever co-occurs on a twelve-colour
board. Reordering repaints boards but changes no puzzle — generation, seeds
and saved records all work in indices, never in colours. `symbols` is
index-aligned and moved with it.

Slots eleven and twelve are `fern` and `olive`. Spec §3 names only ten and
they already fill the bright end of the hue wheel, so these sit lower in
lightness instead of squeezing between adjacent hues. They replace a near-white
`chalk` that was ΔE 3 from the text colour.

**Never `pieces[n]` outside the board.** Decoration names its colours; the board
uses indices. `AmbientVials`' rack
holds `colours.aqua` and friends directly, not `pieces[4]` — indices move
whenever `pieces` is reordered, and holding them in a fixed decorative layout
silently repainted the whole home rack the first time that happened.

Stacked segments get a hairline seam at each boundary. Without it, two
adjacent segments of one colour read as a single tall band and a vial stops
looking like four units — which is the thing that tells a player what the game
is.

Colourblind marks pick their own colour via `glyphOn(fill)`. A fixed white
mark disappeared on `lime` and `tangerine`, both above L\* 84 — the
accessibility feature failing silently on two of twelve colours.

**The marks are load-bearing, not a nicety.** `colour vision` in
`src/theme/__tests__/colors.test.ts` simulates protanopia, deuteranopia and
tritanopia over the palette. Twelve hues do not survive two working cone
types: at a full board the closest pair is under dE 1, and no repalette fixes
that, so a test asserts the failure rather than hoping nobody checks. Colour
carries identity for trichromats; glyphs carry it for everyone else.

`pieces` and `symbols` are both ordered for that. A board takes the first N of
each, so the order decides what co-occurs early. The colour order was searched
under a hard floor — every pair inside the first eleven stays above dE 30 for
normal vision — and then maximised for the worst case across the three
deficiencies at the sizes players actually reach: dE 30 at four colours, 14 at
six, 7 at eight. Ten and eleven came out a shade worse than the previous order
and that was accepted; both are far below perceptible either way, and those
sizes start at level 501. Glyphs follow the same rule, since the set holds six
near-pairs (`dot`/`ring`, `wave`/`waves`, `plus`/`cross`, `square`/`diamond`,
`triangle`/`star`, `stripe`/`grid`) — one of each in the first six, so a
partner never lands before seven colours.

Both orders have regression pins in that test. Raising one number lowers
another; check the trade before moving either list.

`src/theme/apothecary.ts` still exports the `Theme` shape the renderer takes,
but every value in it now points at `colors.ts`.

Poppins is bundled and loaded in `Root` before the first frame; a system-font
frame would flash and reflow every screen.

The **nav bar is mounted once in `Root`**, floating over the screens, not
rendered by each of them. It shows on Home and on all five destinations, and is
hidden on the splash, the board — where a stray tap mid-pour would cost a move —
and the win screen. `active` marks the current destination; a bar that looks the
same everywhere is decoration rather than navigation. Screens clear it through
`padding.scrollTailWithNav`, so no screen needs to know its height twice.

The bar's strip is **opaque and full-width**, with a short gradient dissolve
above it. Three attempts were needed and the first two are instructive: a
translucent bar let the stage grid slide visibly through it, and a fade spanning
the whole slot was still ~70% transparent at the bar's top edge, because a
gradient interpolates across its own height. It now covers only its own band, so
it reaches full opacity exactly where the solid strip starts.

Anything the UI shows but cannot yet deliver wears a `SoonBadge`, or a
`SoonOverlay` where a badge is too easy to miss on the way to pressing Buy. The
overlay veils the artwork only — covering the whole card buried the name and
muddied the swatches, which are the part worth previewing. The shop's
skins have one because **nothing reads `economyStore.owned`** — the renderer
paints from the palette — so a purchase would have taken 200 coins and changed
nothing on screen. They preview instead of selling until the board honours a
skin. The real-money rows are marked for the same reason: spec §10 puts the
store SDK in phase 2.

### Purchasing (phase 2 — decided, not built)

The SDK is **RevenueCat** (`react-native-purchases`), not a hand-rolled IAP
layer, and the deciding product is `Remove ads forever`. It is a permanent
entitlement that switches off the app's actual revenue stream, so a faked one
costs money indefinitely — and telling a real receipt from a fake needs
server-side validation, which this app has no server to do. RevenueCat is that
server without building one; hand-rolling with a client-only library would
mean trusting the device outright or standing up a backend the whole
architecture avoids. Free until $2.5k/month tracked revenue, then 1% — a good
problem. It needs the native build this project already requires, and adds a
purchase-history disclosure to both stores' privacy forms.

The rules that outrank any SDK:

- **The store receipt is the ledger; MMKV is a cache.** The opposite of every
  other record in the app, and the reason a purchase survives uninstall,
  "Clear data" and a new phone when nothing else does.
- **`Remove ads` must never be written into `economyStore.owned`.** It is read
  from RevenueCat's own cached `CustomerInfo` and nowhere else. Mirroring it
  into MMKV creates two answers that disagree the moment they can: this app
  ships `allowBackup: true`, so a reinstalled Android device can restore
  `economy.v3` — entitlement flag included — from Google Drive while
  RevenueCat, which has just minted a fresh anonymous App User ID, says the
  player owns nothing. One source per fact. `owned` keeps only what coins
  bought.
- **Reinstall recovery is automatic, with the button as the backstop.** This
  is the case that decides whether a paying player is treated properly, so it
  gets two mechanisms rather than one.

  A fresh install mints a _new_ anonymous App User ID that owns nothing, so
  the entitlement is absent until the device receipt is synced. RevenueCat
  documents `restorePurchases` as user-triggered only and warns against
  calling `syncPurchases` on every launch — it adds latency and can alias
  users together unintentionally — but explicitly sanctions triggering a sync
  **once per subscriber**, which is exactly this. So:

  > On launch, read the cached `CustomerInfo`. If no entitlement **and** no
  > recovery sync has run for the current App User ID, call `syncPurchases`
  > once and record the ID it ran for.

  The flag is keyed on the App User ID, not on "have we ever synced" — this
  app ships `allowBackup: true`, so a reinstalled Android device can restore
  an MMKV flag from Google Drive alongside a RevenueCat ID that is brand new.
  Keyed on the ID, that restored flag does not match and the sync still runs.

  Nobody loses access to anything. An anonymous ID restoring a receipt owned
  by another anonymous ID **merges (aliases)** the two rather than transferring
  between them, so the old profile keeps its entitlement as well.

  A `Restore purchases` row is **built as part of this work** — it does not
  exist today, having been removed rather than badged when there was nothing
  to restore. It goes back in the drawer's **More** group beside `Rate us`,
  calls `restorePurchases`, and is not optional: both stores require a visible
  way to recover a non-consumable, and it is the guaranteed path when the
  automatic sync is refused or the device is offline. It needs to be findable
  by someone who is annoyed and looking for it.

  **None of this is proven until it is tested on both stores.** The acceptance
  run, with a Play licence tester and an iOS sandbox account, in release
  builds — IAP does not work against debug signing:

  1. Buy `Remove ads`, confirm ads stop.
  2. Uninstall, reinstall, launch, **touch nothing**: ads must still be off.
  3. Repeat, but press `Restore purchases` instead — same result.
  4. Same store account on a second device: same two checks.
  5. Buy again while already owning it: the store must answer "already owned"
     and land on the entitlement rather than charging twice.
  6. Airplane mode on a fresh install: no crash, no ads (none can be fetched),
     and the entitlement arrives once the network does.

- **Entitlements do not cross platforms.** The receipt belongs to the Play or
  Apple account, so Android → iOS loses the purchase. Say so on the purchase
  row rather than in a support reply.

  **No login, and that is the decision, not an omission.** Accounts are the
  only thing that would carry a purchase across platforms, and they are the
  one feature that would cost this app its shape: a backend it does not have,
  Apple's in-app account-deletion requirement (5.1.1(v)), Sign in with Apple
  alongside any third-party login, a wider privacy policy, and a login wall on
  a casual puzzle game. The gap is covered two cheaper ways — the stores
  refuse to double-charge for a non-consumable, so a player who never finds
  the Restore row and presses Buy again lands on their entitlement anyway
  (test this with a licence tester, it is the common path); and a genuine
  platform switcher gets a promotional entitlement granted by hand from the
  RevenueCat dashboard. Revisit only if switchers show up as a real number
  there, which is a problem worth having.

- Nothing waits on the entitlement check at launch. Spec §8 puts the first
  interstitial at the fourth level completion, which is minutes of runway, and
  a reinstall with no network shows no ads anyway because none can be fetched
  — the offline failure mode cancels itself out.
- **Grant before acknowledging, dedup by purchase token.** Money has already
  moved, so the coin pack's grant must happen at least once: an unacknowledged
  purchase is redelivered on next launch, which makes a crash between charge
  and grant self-heal. Android auto-refunds anything unacknowledged after
  three days, so the acknowledge is revenue, not tidiness.
- **Coin packs are consumable and not restorable** — once granted they are
  ordinary coins in `economy.v3`, and spent coins must not resurrect on
  reinstall. `Remove ads` is the restorable one.
- **`PRODUCTS` in `game/economy.ts` stays display-only.** The store quotes the
  real localised price at runtime; never charge from a number in this repo.
- Blocked on accounts, in order: store listing (the name check), Play Console
  and App Store Connect products, RevenueCat project keys. The SDK is not
  installed until those exist — a keyless dependency is dead weight knip would
  rightly flag.

Shared chrome is in `src/ui/chrome/`: `Backdrop`, `Panel`, `GlossButton`,
`Wordmark`, `CoinPill`, `NavBar`, `HeroRack`, `Overlays`.

- `Backdrop` lives in `Root`, outside the screen transition, so navigating does
  not restart the mote drift or pay for a new Skia surface. Screens are
  transparent; they no longer paint their own background.
- **Buttons have no raised bottom lip.** The spec flags this as an explicit
  design correction — flat glossy face, press down 2px, no coloured bevel.
- The wordmark is Skia text with a gradient shader. RN `Text` can only take a
  flat colour, so gold lettering has to be drawn.

All nine screens are converted: Splash, Home, Stages, Board, Complete, Daily,
Shop, Stats, Settings, plus the global modal and toast. `IconButton` was
deleted with the parchment theme — `ChromeIconButton` (square, chrome) and
`ControlButton` (round, board) replace it.

Star rating is in `src/game/stars.ts`. Par is the **true fewest pours** that
finish the board — `optimalMoves` in `src/core/solver.ts`, IDA* over the
generator's own output. A finished level always pays at least one star, because
there is no fail state.

Par used to be `moveLowerBound` and that was a real bug. A lower bound is not a
target: checked against an exhaustive search it sat below the actual optimum on
22 of levels 1–40 and on 25% of levels 501–900, so three stars was unreachable
on those however well the level was played.

The fix is affordable because `moveLowerBound` is an admissible heuristic, so
IDA* prunes hard on it — most boards close in a few dozen nodes. Over all 800
boards in levels 501–900 across classic and fiendish, which is the worst the
game can produce at 12 colours and one spare: median 1ms, p95 11ms, worst 133ms,
none hitting the 2M node cap.

It still runs **off the level-load path**. `refinePar` in `gameStore` defers it
a tick, because par is not read until a level is solved and Hermes on a phone is
several times slower than the machine those numbers came from. Until it lands
`par` holds the bound, so a rating is always available and is wrong only in the
old direction — too strict, never too generous. A result arriving after the
player has moved on is discarded, and a board that exhausts the node cap keeps
the bound.

That one deferred search now feeds two things. `optimalLine` in `solver.ts`
returns the shortest winning line itself — the path was always on IDA*'s stack;
`optimalMoves` is a wrapper that keeps only its length — and `refinePar` seeds
the whole line into `hintLine`, so par and the hint plan arrive together and
the first Hint press on an untouched board costs no search at all.

**Hints follow that optimal line — a hint is the provably shortest
continuation.** The DFS line hints used to hand out ran ~20% over the optimum
(median 1.20x), which silently capped a fully-hinted run below three stars:
advice that lowers the score of the player taking it. A press answers from the
cached plan; walking off the plan re-plans from the current position under a
node budget (`HINT_OPTIMAL_BUDGET`), and a position that will not close inside
it falls back to the DFS line, delivered with `optimal: false` and **never
billed** — it consumes neither coins nor the free hint, and continuing a
fallback plan stays free too (`hintLine` entries carry the flag). The
per-paid-hint star ceiling from `stars.ts` came out in the same change: with
hints perfect, a fully-hinted run legitimately finishes at par, and the economy
already prices the help — hints cost more than the stars they unlock pay back.

Par measures the **generated** board, not the one on screen. Taking the spare
vial makes a level easier to finish but does not make it a different puzzle —
and it is the escape hatch (doc §10's rewarded slot), so tightening the target
the moment a player reaches for help would punish them for using it.

**Stars are rated on efficiency, `par / moves`, not on a fixed move target.**
Three stars at 85% or better, two at 50% or better, one for anything that
finishes. A ratio scales with the board, which a flat allowance cannot: a
40-move puzzle has more places to lose a move than a 7-move one.

One override: three stars within one move of par regardless of ratio.
Percentages compress on small numbers — five moves on a four-move board is 80%
— so without it the levels people learn on would be the strictest in the game.

With par exact, `moves <= par` would mean literally optimal play, which asks
the player to solve the board in their head before touching it. The cushion is
not there to cover exploration — an undone pour leaves no trace, since `moves`
is `history.length` and undo drops the move from it — it is there so playing
well is enough without playing perfectly.

One star has no lower limit, deliberately. Five hundred pours on a fifteen-move
board is still a win, because there is no fail state.

For calibration: the non-optimising solver, a stand-in for competent play that
is not trying to be clever, finishes at 1.20x the optimum (median over 141
boards across all three modes), 1.50x at p90, 1.94x worst. Under these bands
that sample scores 60 three-star, 81 two-star, no one-star. A looser 25%
three-star band was tried first and moved 36 of those runs up to three stars;
85% was chosen instead, so three stars stays worth something.

Coins are paid the moment the board is solved, not on the Complete screen: a
player who backs out during the win animation still keeps them.

### Milestone bonuses

Every ten levels pays a bonus on the stars earned in that block —
`milestoneBonus` in `src/game/stars.ts`. Driven by stars rather than by levels
finished, so a block cleared carefully pays more than one scraped through, and
the same rule that gives a completed level at least one star means a completed
block always pays something.

**The rate tapers.** Four coins a star in the first block, falling by one every
two blocks to a floor of one — up to 120 for levels 1-10, up to 30 from block
seven onward. Two things had to be balanced: the bonus has to be worth noticing
early, when a player has nothing saved and the levels are short, and it has to
stay a _bonus_ later rather than becoming the main income, or the economy ends
up paying for elapsed time instead of for playing well. At the floor it is
worth roughly one extra level on top of the ten levels' own payouts.

**The whole earnings side was halved in Aug 2026, and the ad payouts were
not** — that asymmetry is the monetisation design, not an oversight. At the
original rates an engaged week banked ~6,500 coins against ~200 of possible
spending, which priced both revenue paths out of existence. A rewarded ad
(still 50) is now worth about two finished levels, so the free path to
affording help is the ad; the 8,000-coin pack is now about a month of engaged
play. Every quantity lives in `src/game/economy.ts` and everything — UI copy,
tests, toasts — derives from it, so a future rebalance is one edit there.

`paidBlocks` on the progress record is what stops a replay claiming a bonus
twice. It has to be stored: whether a block is _complete_ can be read off
`stars`, but whether it has been _paid_ cannot. The mark and the level's own
record go into one write, so a crash between them cannot pay twice — and the
coins move only after that write lands. Coins live under a different key, and
MMKV has no cross-key transaction, so the order is the guarantee: a crash in
the gap forfeits a payout rather than minting it again on the replay, which is
the same trade `payBonus` makes and the one a player cannot farm by killing
the app on the win frame. Undo and hint charges run the same way round —
affordability checked, mark persisted, then the wallet.

A block is paid on whichever level completes it, not on the highest-numbered
one — levels can be replayed and revisited in any order.

Storage moved `progress.v2` → `v3` for the new field. Levels and stars carry
across and `paidBlocks` starts empty, so an existing player is paid for blocks
they have already finished. The alternative is marking them paid for a bonus
that did not exist when they earned it. It has since moved again, `v3` → `v4`,
for the generator stamp — see the storage section.

### The daily reminder

`src/notifications/`, and it is a **local** notification end to end — the OS
holds the schedule and delivers it. No server, no Firebase, no APNs, no push
token, no network. Everything it needs to know is `lastClaimAt`, which is
already on the device. The docs draw that line explicitly: push needs FCM/APNs
credentials and a project id, local needs none of it.

`schedule.ts` is pure and free of `expo-notifications`, the same rule
`src/core` follows for React — the arithmetic decides whether a player is
nudged at the right moment, and it should be testable without a native module.
`dailyReminder.ts` is the thin adapter around it.

**An absolute date trigger, not "daily at nine".** The reward runs on a rolling
twenty-four hours from the moment of the claim, so a fixed hour would fire with
hours still on the clock. An instant also has no opinion about timezones or
daylight saving, which a recurring hour/minute trigger does.

Two per cycle: the reward at +24h, and — only from a three-day streak, since
below that there is nothing invested to lose — a warning at +44h, four hours
before the window shuts. Anything already due is dropped rather than fired
late; the reward is on screen where it can be seen.

Cancel-then-reschedule on every claim rather than diffing. There are at most
two, and tracking identifiers across a process death is more state to get wrong
than the work it saves. iOS caps pending notifications at 64.

Three things about permission, all of them the difference between working and
silently not:

- **The Android channel is created before the prompt.** On Android 13+ the
  permission dialog does not appear at all if no channel exists.
- **Permission is asked at the toggle, not at launch.** That is the moment the
  player has said they want it; a prompt on first run with no context is the
  one people deny reflexively. A refusal leaves the row off rather than showing
  "on" against a blocked OS, and offers `Linking.openSettings()` — neither
  platform will show its dialog twice.
- **`reconcilePermission` runs on foreground.** Permission can be withdrawn in
  system settings while the app is closed, and it also re-syncs the schedule,
  which covers the case of a reminder that has already fired leaving the queue
  empty.

`POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED` arrive from
expo-notifications' own manifest at merge time, so they are not in
`android/app/src/main/AndroidManifest.xml` and should not be added there.
`RECEIVE_BOOT_COMPLETED` is what re-registers the schedule after a reboot. iOS
needs no `Info.plist` entry — local notification permission is runtime only.

**expo-audio's plugin is configured, not defaulted.** Left alone it adds
`RECORD_AUDIO`, `NSMicrophoneUsageDescription`, and two background-audio
foreground services, because most apps using it record or play behind a lock
screen. This one does neither. A puzzle game shipping a microphone permission
is a store-review question with no good answer.

### The daily brew

`src/game/dailyPuzzle.ts`, one board a day, keyed by `dayIndex(now)` — days
since the epoch, on the **local** calendar so it turns over at the player's own
midnight. The seed is the day and nothing else, so the board is stable all day
and survives a reinstall.

**The shape follows the player: the Hard curve at `furthest + BREW_LEAD` (30),
taking the max across all three modes.** It used to be a constant at the ceiling
— twelve colours, one spare — and that was right for the player it was written
for and wrong for everyone else, because **nothing gates the Rewards row on
progress**. Someone an hour into the game could open the hardest board the
generator makes holding zero coins, one free hint, and a board that is not saved
if they leave, where two positions in five reached by casual play have no
winning line at all. Scaling fixes that without a lock, and converges on the old
fixed shape past roughly level 400 — so nothing changes for the player it was
originally tuned for.

Measured across a career: furthest 1 → 6 colours / cap 4 / 2 spare, par 14; 100
→ 8c/4/**1**; 200 → 10c/5/1; 400+ → 12c/5/1, par 32. Ahead of the player's own
ladder in every mode at every point sampled, 0 rejections, generation ≤ 28ms.

Two things `brewParamsFor` has to keep doing:

- **Skip the breather.** `paramsForLevel` drops a band on every tenth level, so
  a player whose furthest ends in a zero would get a quietly easier brew that
  day, for a reason nobody could read off the screen. `+ 1` steps off it.
- **Take the max across modes**, so pushing Hard and then opening the brew from
  Easy cannot draw an easier board.

`furthest` is read **live**, not pinned for the day. Open the brew, leave it,
clear a level, come back, and the shape moves up with you. Nothing needs
defending there: the brew is never written to `session.v1`, so returning always
meant a board from move zero anyway, and pinning it would cost a stored field
and a migration to make a board slightly less current.

It pays **per star** (`bonusPuzzlePerStar`, 20 → 20/40/60), not flat. Flat was
right while the board was always the ceiling; with the shape following the
player it would hand the same coins to a six-colour brew and a twelve-colour
one. The Rewards row advertises the ceiling for the same reason — a row
promising the maximum for any completion is a small lie a player notices
exactly once. The row's copy derives from the constant, so it moved with the
rebalance on its own.

### The daily reward

`economyStore`, key `economy.v3` — v2's streak counted claims rather than
visits, so the balance and the shelf carried over and the run started fresh.
**A rolling twenty-four hours from the moment you claim**, not a calendar day —
claim at 9am and the next one opens at 9am tomorrow, wherever the clock
happens to be.

Calendar days were the first version and they misbehave at both ends: claim at
11pm and you can claim again an hour later, but claim at 9am and then open the
app at 8am the next day and the streak breaks on a technicality. A timer has
neither problem.

Device time, per spec — there is no server to ask, and the game is offline
first. That means the clock can be wound forward to farm rewards, which is
accepted rather than defended against: the reward is coins, the coins buy
cosmetics, and a player cheating themselves out of a daily habit is not worth
the complexity of a trusted time source. Winding _backwards_ is handled, since
it is as likely to be a timezone change as an exploit — elapsed time is floored
at zero, so the timer pauses rather than skips.

The streak has a **48-hour window**, twice the interval. Claim inside it and the
track continues; miss it entirely and it restarts at day one. Without the grace
a player who claims at 9am one day and 10am the next has already lapsed, which
is the same technicality in a different shape.

`timeUntilClaim` drives a live countdown through `useClaimTimer`, which ticks
once a second only while something is actually counting down, and re-reads the
clock on `AppState` foreground — timers do not run in the background, so a
screen left open overnight would otherwise show a stale countdown over a dead
button.

Storage moved v1 → v2 for the shape change, and this one **is** migrated rather
than dropped: the old record's calendar date becomes that day's midnight, which
only ever brings the next claim forward, and coins carry across. Losing a
balance to a scheduling fix is not a trade worth making even pre-release.

Two new stores: `economyStore` (coins, daily streak, owned cosmetics) and
`overlayStore` (modal and toast, so any handler can raise one without threading
callbacks or re-rendering the screen below). Settings grew to spec §8 and the
key moved to `settings.v3`.

Spec §7's music-icon behaviour — dimmed with sound off, cycling tracks and
toasting their names with sound on — is **not implemented and will not be**.
The game has no background music; see the Sound section for why the whole
feature was removed rather than left badged.

## Changing mode

Both places that offer the choice — the Stages tabs and Settings' segmented
control — go through `confirmDifficultyChange` in `src/ui/confirmDifficulty.ts`,
so the two cannot drift apart.

It confirms rather than switches. A tab that looks like a filter is not one:
each mode keeps its own unlocks and its own place, so switching moves the
player to a different level, and it drops whatever was in progress on the
current board. The modal names the level the other mode picks up on, and says
so explicitly when the current level is part-solved — the spare vial counts as
progress there too, since taking it is a one-per-level decision and switching
away quietly hands out a fresh one.

`settingsStore` owns the mode. `gameStore` follows it through a subscription,
which is what reloads the board and clears the session, so the confirmation has
to gate the settings call and nothing else.

## Haptics

`src/ui/feedback.ts` holds all three: `feedbackFor` for a board tap outcome,
`feedbackTap` for chrome, `feedbackWarn` for a control that was pressed and
could not do its job. All three read `settings.haptics` at call time rather
than subscribing — a toggle must not re-render the board.

**A vibration means something happened.** A tap that changes nothing must not
have one, and that rule is held structurally rather than by remembering:

- The tick lives in the shared button components — `GlossButton`,
  `ControlButton`, `ChromeIconButton`, `NavBar`, `SettingRow`, `Switch`,
  `Segmented`, Home's chips and Continue card, Stages' tiles and tabs — through
  `useTapHandler`. Added per screen instead, it was on four buttons and missing
  from the rest.
- A disabled `Pressable` never fires `onPress`, so dead controls are silent for
  free. That is why the dead ones are now genuinely disabled rather than merely
  greyed: a locked stage tile, Undo at zero moves, the page arrow past the
  frontier, and the tab or segment you are already on. Each of those used to
  take a press and do nothing.
- The board's `ignored` outcome — empty glass, nothing held — stays silent.
  `selected` and `deselected` both tick, because putting a vial back down is as
  deliberate as picking it up.
- A refusal answers differently from a success. Hint with no pour left and a
  second spare vial both warn, so they do not feel like the thing they were
  asking for.

The modal's scrim is deliberately not wrapped. Tapping outside a dialog to
dismiss it is the one press in the app that should feel like nothing.

`Rate us` shows a **Soon** badge and is deliberately not tappable — there is no
store listing to send a rating to yet. A control that visibly moves and changes
nothing reads as a broken game, not a missing feature.

**`Restore purchases` is not in the drawer at all**, and its absence is the
decision rather than an oversight. A badged row promises a feature that is
merely unfinished; this one did not exist even in plan, since the game sells
nothing for money and the shop's coins are device-local. It comes back in the
same piece of work that adds the purchase SDK — both stores require it then,
and the phase 2 notes above describe what it has to do.

## Sound

Five recorded one-shots in `assets/audio`, played by `src/audio/sounds.ts`
through **`modules/system-sound`**, a local Expo module of this project's own.
Effects only, and **there is no music** — see the end of this section, because
its absence is a decision rather than a gap.

### It does not use `expo-audio`, and the reason cost an evening

`expo-audio` was installed, worked, shipped a whole audio layer — and is now
uninstalled, plugin and all. It wraps `AVPlayer`, which is a **streaming-media
pipeline**, and on the iOS 26 simulator that pipeline never finishes loading a
local file: `isLoaded` stays false forever and `FigFilePlayer` signals
`err=-12864` at the render stage, on byte-identical files that the same build
plays perfectly on an iOS 18 simulator. Silence, no JS error, nothing to catch.

The replacement plays decoded buffers through the primitives games actually
use — `AVAudioEngine` (iOS 8+) and `SoundPool` (Android API 1) — so every
device that can install the app can play its sounds. The module mirrors
`modules/system-haptics` file for file: `expo-module.config.json`, a podspec, a
Swift `Module` and a Kotlin `ModuleDefinition`, and an `index.ts` exporting
`requireOptionalNativeModule<SystemSoundModule>('SystemSound')`, which is
`null` under Jest and therefore needs no mock.

Four things about it that are load-bearing:

- **iOS builds one chain per cue**: `AVAudioPlayerNode → AVAudioUnitVarispeed →
mainMixer`, with the session set to `.playback` + `.mixWithOthers`. The
  varispeed unit is what pitches the pour; both engines are tape-style, rate
  and pitch moving together, which is exactly what `pitch.ts` wants and means
  there is no `shouldCorrectPitch` to remember to switch off.
- **The engine starts lazily, on the first `play`.** Starting it at load costs
  a running audio graph on the launch path for a game that may never make a
  sound.
- **Retriggering a cue restarts it** (`stop` → `scheduleBuffer` → `play`), so a
  hurried double-tap is one tap rather than two smeared together, while
  _different_ cues overlap freely.
- **Android checks `ready`** — `SoundPool` loads asynchronously and playing an
  id before its `OnLoadCompleteListener` fires is a silent no-op.

**`playbackRate` on `expo-audio` is a getter-only property that TypeScript
types as writable.** Assigning to it throws at runtime, the throw was swallowed
by the `try`/`catch` around playback, and so `play()` never ran at all — hours
of "the file is fine, the volume is fine, why is there no sound". Recorded here
because the trap is not in the types, and because the shape of it recurs: a
`catch` around the whole of a playback call hides the one line that is wrong.

### Cues are loaded through `expo-asset`, never as a bare `require()`

A `require('*.m4a')` resolves to a file inside the bundle in release and to a
**Metro URL** in development — and Metro serves assets with no `Content-Type`
_and_ `X-Content-Type-Options: nosniff`, so a decoder is handed no format and
forbidden from guessing one. `Asset.downloadAsync()` puts real bytes on disk
and `localUri` keeps the extension. In release the asset is already local, so
it costs nothing. **Debug and release differ here, so audio that works in one
proves nothing about the other.**

`primeSounds()` does that resolution once, from `Root`'s first layout, and a
cue that fails to load simply stays silent — audio is a garnish on a puzzle
game, and a device that cannot load a sound should not crash.

### The cues, and where they come from

Recorded sources only. An audio layer was built and deleted before this one and
the reason still governs the file: its effects were **synthesised**, and sine
waves and filtered noise do not sound like liquid or wood. Every file's origin
and licence is in `assets/audio/CREDITS.md`, and a file with no entry there
does not ship.

- `tap` — Kenney glass, CC0.
- `pour` — water poured into a glass **that already holds water** (Freesound,
  carroll27, CC0). Two rejected takes are recorded in CREDITS and both failed
  on _subject_ rather than quality: a 0.23s bubble glug could not cover a
  1850ms animation, and a bottle-neck pour sounded like someone **drinking**,
  because a narrow neck glugging is the sound a throat makes.
- `complete`, `level`, `illegal` — **arranged from a real marimba**
  (VSCO 2 CE, sgossner, CC0): a rising fifth, a walk up to a ringing chord, and
  a low damped falling fifth. Kenney's originals were a bell and a chiptune
  cue, and the chiptune one was received as "some Nokia mobile msg ring" —
  which is what a digital arpeggio is. Modern casual games use tuned acoustic
  percussion; a wooden bar has a soft attack and a decay that gets out of the
  way. This is **arrangement, not synthesis** — no object in the world makes
  the sound of a puzzle going right, so the notes are chosen but every sample
  is a struck bar.

`script/prepare-sounds.py` is the only way these files should ever be written:
drop a source in `assets/audio/source/` (gitignored) and run it. It cuts on the
onset, forces mono/44.1k, sets per-cue levels, fades edges to true zero, and
**encodes the shipped `.m4a` itself** — that encode used to be a hand-run
ffmpeg line, which is how a re-levelled `.wav` ships beside last month's audio.
Its `ARRANGEMENTS` table holds the played cues, `damp` mutes a bar's ring, and
`punch` is a soft limiter — see below.

### Two things measurement got wrong before an ear got them right

Both were reported by playing the game, not by reading a number, and both are
the reason the last line of this section exists:

1. **A chord's peak is not its loudness.** The win fanfare peaked 4dB above
   every other cue and was reported as _quieter_ in play. Five bars struck at
   once sum into a spike two milliseconds long, and normalising to that spends
   the whole headroom on something nobody can hear. `punch` (a `tanh` soft
   limiter, gradual knee so wood does not go buzzy) rounds the peaks off before
   the normalise, and lifted its sustained level 6.5dB with no change to any
   gain.
2. **Tempo has to move a lot to be felt.** The fanfare's run went 65ms → 120ms
   a note, which is a doubling, is measurable, and was reported as "no
   difference". 240 was then too slow. It sits at 170.

### Timing is enforced, not tuned

`src/audio/sounds.ts` schedules the long cues against the pour animation
(`POUR_MS`, `PHASE`) rather than firing them at the tap: the tube spends the
first 15% of the animation flying to its target, and a pour heard then reads as
the phone answering rather than as liquid.

**No two long cues may start within `MIN_GAP_MS` of each other**, and that is a
rule the code holds rather than three constants that have to agree. Hand-spaced
delays were tried twice and drifted back both times, for a structural reason:
each is tuned against its own animation phase and nothing checks them against
one another. The last move of a level fires three cues, each over a second
long, so they ran together as one noise.

Each cue asks for the moment it would like and a scheduler hands out the next
free slot. The two kinds yield differently, which is the whole design: **the
rewards wait** (a finished vial and a solved board describe a state the board
is now in, so a beat late still reads correctly) and **the pour is dropped** (it
belongs to one second of animation and means nothing outside it — better silent
than late). `tap` and `illegal` bypass the scheduler entirely, because feedback
that arrives on a schedule is not feedback.

`src/audio/__tests__/spacing.test.ts` pins the gap itself rather than today's
numbers, including that the reward is never the thing dropped.

### The dials

- **`VOLUME` in `sounds.ts`** is the loudness dial — one number, scaling every
  cue together so the ladder survives. The files stay at the digital ceiling on
  purpose: a quiet master throws away resolution and cannot be raised later
  without re-encoding, so the ceiling lives in the assets and the taste lives
  in code where changing it is a reload.
- **`TRIM`** is per-cue and deliberately short — two entries, both corrections
  an ear made to a measured ladder. The pour is turned _down_ because it is the
  only **continuous** cue (every other sound is a strike that decays, so its
  peak is heard for milliseconds; the pour holds near peak for over a second)
  and the win is turned _up_ because its energy is spread across a chord.
- **`TARGETS` in `prepare-sounds.py`** holds the ladder itself, in deliberately
  unequal peaks.

### No music, and that is the decision

There is no background track, no `music` setting, no `musicTrack`, and no row
in the drawer. All of it existed as a badged placeholder and was removed rather
than filled in.

A puzzle with no timer and no fail state is what people play with a podcast or
their own music on. An app that starts singing at them is the one they silence
outright — and silencing an app costs it the effects too, which are the half
that carries information here. The cost of building it was real as well: a loop
that does not grate needs two or three minutes of seamless audio, which is
where CC0 material thins out badly, and one track is 2–4MB against the ~80KB
the entire effects set weighs.

If it ever comes back it needs a decision about defaulting **off**, and the
`mixWithOthers` session above is what makes not fighting the player's own audio
the default today.

### Testing

**`modules/system-sound` needs no Jest mock** — `requireOptionalNativeModule`
returns `null` with no native runtime and the audio layer treats that as "play
nothing", which is exactly the production behaviour on a device that failed to
load a cue. `feedbackAndroid.test.ts` is the exception and mocks it explicitly,
because its gutted `react-native` mock kills the `expo` import underneath.
`spacing.test.ts` mocks it the other way, with a fake that records call times,
since what it tests is _when_ `play` happens.

**They have been heard on a simulator only.** A phone speaker is where a bright
chime turns shrill, and that judgement has not happened yet — the previous set
died on exactly such a judgement after measuring fine.

## Tablets

The app ships on iPad (`supportsTablet: true`) and on Android tablets, and the
chrome scales to them. **`src/theme/scale.ts` is the only file that knows a
tablet is wider than a phone.** Everything else calls `s()`.

`s()` returns its input **unchanged** on phones — exactly `1`, not "about 1". A
phone build renders the styles this project already shipped, and the test that
pins that across three phone sizes is the most valuable one in the file. Above a
600dp shortest side — Android's own `sw600dp`, just under the smallest iPad — it
multiplies by the width over a 390pt baseline, capped at 1.45. The cap matters:
a 1024pt iPad is 2.6x the baseline and scaling type by that turns a settings row
into a billboard. Past a point a bigger screen should show a more comfortable
UI, not a proportionally huge one.

**The window is read once, at module scope.** The alternative is a hook, which
would make every `Foo.styles.ts` a function of width and rebuild the styles on
each render — and they are `StyleSheet.create` singletons precisely so their
identity is stable. The app is portrait-only, so no rotation can invalidate the
reading. iPad Split View can, and does not: the board re-measures, the chrome
keeps its launch scale until relaunch. Accepted, and the reason `npm run ios:pad`
exists — you cannot check the tablet layout by resizing a phone simulator.

Three things are deliberately outside it:

- **The board.** `src/render/layout.ts` already derives tube width, gap and
  radius from the box it is handed, so it scales on its own and a second
  multiplier would double-count. It also stays pure and React-free, which is why
  `GameScreen` passes it a scaled `hitTest` slop rather than the module reading
  one — a fixed 12dp halo around a tube twice the size is a tighter target than
  phone players get.
- **The splash vial.** `assets/splash-icon.png` is drawn by the OS at a fixed dp
  size on every device, so scaling the React vial would break the handoff the
  two splashes were built around — on tablets only, which is exactly where
  nobody would look for it. The glass in `SplashScreen.styles.ts` sits under a
  fenced comment saying so, and a test pins `splash.ts` as device-independent.
- **1dp hairlines and `borderWidth: 1`.** A scaled hairline lands between
  physical pixels and renders as a grey smear.

**Grids derive their column count; they do not hold one.** `columnsFor` and
`gridTile` in `src/theme/grid.ts`. The stage grid was a hardcoded `COLUMNS = 4`,
which on an iPad made 230dp squares each holding one level number — the grid
grew and its content did not, so a screen whose whole job is showing many levels
at once showed sixteen.

Two bugs came out of that, and both were only visible on a device:

1. **An explicit width has to come with an explicit `flexGrow: 0`.** At two
   columns an even tile count always fills its rows, so a growing tile never has
   room to grow into. At three it does — the shop's four skins put one card
   alone on the last row and `flexGrow: 1` stretched it to the full width.
2. **`FlatList` has no notion of an incomplete row.** A 50-tile stage page never
   divides evenly, and `flex: 1` tiles split whatever width the short last row
   has. This was already shipping on phones: at four columns, levels 49 and 50
   rendered double-width. `StagesScreen` pads the last row with spacer items.

`useScreenPadding` also returns `sides` now, from `insets.left`/`right`. Those
are zero in portrait on a phone, which is why the omission went unnoticed; they
are not zero on iPad.

Verified on an iPad Pro 11-inch (M4) across Home, Stages, Board, Shop, Stats,
Settings and Daily, then rebuilt on iPhone to confirm the phone was untouched.

**Landscape is not supported.** `orientation` is `'portrait'`, so an iPad
letterboxes rather than rotates. Apple accepts that; making it real is separate
work and would need the board layout to handle a wide, short box.

## Look

Cartoon, not realistic. Two rules, both learned by getting them wrong:

- **Flat fills. No gradients on liquid.** A vertical gradient makes one colour
  read as three shades, which breaks the cartoon look and makes matching
  segments hard to compare — the one thing the player does constantly.
- **Bold dark outlines** on tubes, not thin grey hairlines. Hairlines read as a
  chart; a heavy `theme.ink` stroke reads as drawn.

Paths are built with `Skia.PathBuilder.Make()...detach()`, never
`Skia.Path.Make()` plus mutating calls — the mutating API is deprecated in Skia
2.x and warns on every build. `detach()` hands back an immutable path, which is
what the memoised layout wants anyway. `Skia.Path.MakeFromSVGString` is **not**
deprecated; icons and colourblind glyphs still use it.

**Two Skia traps, both found the hard way. Do not undo these.**

1. `useDerivedValue` output does **not** drive Skia props in this version pair
   (Skia 2.6.2 + Reanimated 4.5.1). The prop silently freezes at whatever it
   held when the node was recorded — no error, no warning. Plain mutables from
   `useSharedValue` do work. `src/render/useUiValue.ts` bridges the gap:
   compute in a `useAnimatedReaction`, write into a normal shared value, hand
   that to Skia. Proven by probe: an opacity bound to a shared value tracked;
   the same opacity bound to a derived value did not.
2. An `SkPath` written into a shared value does not survive either, so animated
   shapes must be built from **numeric** props — `Rect` with animated x/y/width
   /height, `Circle` with animated cx/cy/r. That is why the splash is twenty
   `Circle` nodes rather than one path, and why the liquid surface is a plain
   rect rather than the rippling wave it was originally written as.

Everything still runs on the UI thread; React does not re-render during a pour.
Keep it that way.

Home uses `src/render/AmbientVials.tsx`, a slow decorative loop, in place of the
static board preview it had before. One shared value, cancelled on unmount.

Not started: `src/audio`, `src/analytics`, `src/ads`. Sound settings persist but
no audio assets exist yet. `android/` and `ios/` already exist — prebuild has
been run.

Colourblind marks are done end to end: `src/render/ColourMark.tsx` draws them,
`Board` takes a `marks` prop, and `GameScreen` feeds it the `colourblind`
setting. The toggle is purely additive — it overlays glyphs and never touches a
fill, so a player who leaves it off sees exactly the board they see today. It
still defaults to off, which is worth revisiting: the palette collapses for a
deuteranope from four colours on, so roughly one man in twelve meets an
ambiguous board around level 6, well before anyone goes looking through
Settings.

The app icons are original vector art, not Expo defaults. `assets/icons/*.svg`
are the masters and `script/make-icons.sh` renders them into the PNGs the icon
fields in `app.config.ts` point at — iOS, the Android adaptive
foreground/background pair, and the Android 13+ monochrome layer. Edit an SVG,
run the script, commit both.

Two traps that script exists to avoid. macOS `qlmanage` renders these SVGs
faithfully but **flattens alpha onto white**, which turns the adaptive
foreground and the monochrome layer into white squares — the icon still looks
plausible in a file browser and is wrong on a launcher. And `sharp-cli` writes
PNG bytes under the source basename, extension included, so the file it leaves
is called `<name>.svg` and is a PNG; the script renames it. It fetches
`sharp-cli` through `npx` rather than taking a dependency, since nothing at
build or run time needs it.

The adaptive foreground keeps its padding on purpose: launchers crop the outer
~18% to whatever mask shape they use, so the vial sits inside the safe zone.
`adaptiveIcon.backgroundColor` is `colours.nightDeep`, from the palette — the
icon README suggests `#140A32`, a shade off, and the palette wins so there is
one source for it.

The **splash** is separate: `expo-splash-screen` draws the native launch screen
(`assets/splash-icon.png` on `#150A34`), and `src/ui/nativeSplash.ts` holds it
up until there is a real frame to hand off to.

### The two splashes are one splash

The OS cannot run an animation before React Native exists, so the launch window
is always a static image — that part is not a choice. What _is_ a choice is
making the static image the animation's own first frame, which is what this
does: the native splash is the **empty vial**, and the in-app splash pours
liquid into the identical shape at the identical place. The handoff is invisible
because nothing moves across it.

Three things have to agree or the vial jumps at launch:

| Where                                  | What it sets                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `src/theme/splash.ts`                  | `VIAL_WIDTH` 54, `VIAL_HEIGHT` 150 — the shared numbers                       |
| `src/ui/styles/SplashScreen.styles.ts` | The animated vial's box                                                       |
| `script/make-splash.py`                | The PNG, cropped tight, drawn at the same aspect, stroke, radii and highlight |

`src/theme/splash.ts` exists as its own React-Native-free module so
`app.config.ts` can import it — the config is loaded by plain Node, which cannot
resolve `StyleSheet`.

**`imageWidth` is the side of a square box, not the rendered width.**
expo-splash-screen generates a square imageset (54×54, 108×108, 162×162) and
fits the image inside it, so a 54×150 vial passed `imageWidth: 54` rendered
19dp wide against the animated vial's 54. It takes `VIAL_HEIGHT`, and the
contained image then measures exactly 54×150. Verified by measuring the
highlight stripe across a launch burst: 9×89dp centred at (186, 417) in both the
native frame and the first React frame.

The vial **rises** rather than starting high (`VIAL_RISE`, 44dp). Composition
wants it above centre with the wordmark beneath, but centre is where the OS
draws the native image — so it begins there and glides up as the wordmark
arrives, which also makes the two read as one movement. Any static offset here
puts the jump straight back.

The splash's own layout follows from this. The vial is the only thing in the
centred column and the wordmark is absolutely positioned beneath it — anything
stacked in that flow would push the vial off centre, and the OS centres the
native image with no such offset.

**The window itself is painted, in three places.** Between the OS dismissing the
splash and React drawing its first frame, what shows is the native root view —
white by default, which flashed for a frame on every launch:

- `backgroundColor` in `app.config.ts` (and `android.backgroundColor`), which
  becomes iOS's root view colour and Android's `windowBackground`.
- `SystemUI.setBackgroundColorAsync` at module scope in `App.tsx`, so a dev
  reload or an Android config change cannot repaint it white later.
- `App.styles.ts` colours the outermost React view, for the instant before the
  screens below paint themselves.

A dev build can still show a brief white frame from expo-dev-client's own
launcher screen. That is the launcher, not the app, and it is not in a release
build.

`assets/splash-icon.png` is generated, not drawn: `python3 script/make-splash.py`
redraws it from the palette and the stylesheet's numbers, so the launch mark
cannot drift from the app it opens. Expo's default placeholder shipped in that
slot until it was caught on a simulator run.

`react-native-bootsplash` was considered and skipped. It would mean
hand-maintaining the iOS storyboard and Android theme that `expo prebuild`
regenerates, and the two would fight over `LaunchScreen.storyboard` on every
prebuild. Expo's own module is already in the plugin pipeline.

Two details there are load-bearing:

- `preventAutoHideAsync()` runs at **module scope**. Auto-hide fires on the
  first drawn frame, so by the time a component effect runs it has already
  happened — and the flash it was meant to prevent has already been seen.
- `hideNativeSplash()` is called from `Root`'s `onLayout`, not from the effect
  that loads the fonts. Hiding while the tree is still blank shows the ground
  colour for a beat, which reads as a stutter rather than a launch.

Changing any splash value needs `npm run prebuild` — it is baked into native
assets, not read at runtime.

## `app.config.ts`, not `app.json`

The Expo config is TypeScript so it can `import { colours }`. JSON cannot, which
meant the splash background and the Android adaptive-icon background were second
copies of hexes that already lived in the palette — and the icon was still
carrying Expo's default pale blue behind a near-black app.

Two constraints there:

- The import must carry its extension (`./src/theme/colors.ts`). Expo transpiles
  the config file but resolves its imports through plain Node, which cannot find
  an extensionless `.ts`. `allowImportingTsExtensions` in `tsconfig.json` exists
  for that one line.
- `colors.ts` must stay free of React Native imports. It is loaded outside the
  app runtime here, so a native import in it breaks `expo prebuild` and every
  EAS build with it.

### Release size, via `expo-build-properties`

Two Android release settings default to **off** in the Expo template, and a
release build without them ships an unminified dex and every resource the
project has ever had:

- `enableMinifyInReleaseBuilds` — R8. The debug APK carries eight dex files
  totalling ~55MB, most of it code no release build reaches.
- `enableShrinkResourcesInReleaseBuilds` — drops unreferenced resources. Safe
  here in a way it often is not: resources are reached by name only through
  `getIdentifier()`, and this app draws its icons as Skia paths and has no
  bitmap art beyond the launcher icons and the splash.

They are set through the plugin in `app.config.ts`, **not** by editing
`android/gradle.properties`. Prebuild regenerates that file, so an edit there
survives until the next config change and then disappears — the worst possible
failure mode for a build setting, because nothing tells you it is gone.

R8's risk is that it strips what only reflection reaches, and that fails at
runtime rather than at build time. Every native module here ships consumer
ProGuard rules and `android/app/proguard-rules.pro` adds Reanimated's, so the
framework is covered; this app's own code uses no reflection. **Play a release
build through a level before trusting it** — a green build proves nothing about
R8.

### What the debug APK's size means: nothing

98MB, and almost none of it ships. `lib/arm64-v8a` alone is 71MB unstripped —
`libreactnative.so` 22MB, `librnskia.so` 17MB — plus a 4.7MB
`libbarhopper_v3.so`, which is ML Kit's barcode scanner, pulled in by
`expo-dev-client` for QR scanning and absent from release entirely. Release
strips the symbols, R8 shrinks the dex, and Play serves one ABI split out of the
AAB rather than all four.

Check a release build with `ls -lh android/app/build/outputs/`, never a debug
one.
