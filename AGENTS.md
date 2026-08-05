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
npm run ios             # expo run:ios     — build + install + launch
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
  1 spare is the big jump; spend it late.
- No timer, no fail state. The genre sells relaxation.
- Lock input for the 350ms pour animation or queued taps cause double pours.
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

Three modes in `src/game/difficulty.ts`: gentle, classic, fiendish. They spend
the lever doc §5 names — spare tubes — rather than colour count alone, and a
board never drops below one spare tube. Each mode keeps its **own** unlocks,
current level, and best scores (`progress.v2`, keyed by mode).

**Determinism is load-bearing and must not be broken.** No board is ever stored;
level N in a mode is rebuilt from `seedForLevel(level, DIFFICULTY_SALT[mode])`.
That means the difficulty curve, the salts, the generator, and the RNG are all
part of the save format in practice. Changing any of them silently repoints
every player's progress at different puzzles.
`src/game/__tests__/difficulty.test.ts` pins level 30 against a recorded
fingerprint to catch exactly that; if it fails, the fix is a migration, not a
re-recorded expectation.

Storage keys were bumped to `progress.v2` / `settings.v2` when modes landed. The
old v1 records are ignored rather than migrated — acceptable pre-release,
because nothing has shipped.

Undo and redo are both in. `history` and `future` in `gameStore`; a fresh pour
empties `future`, because that is a new branch and the undone moves are no
longer reachable. Redo returns the same `poured` outcome a tap does, so it runs
the full pour animation rather than snapping the board.

Perf rules being followed in the UI, worth keeping:

- **Never allocate an `SkPath` in a render body.** Both the tube outlines and
  the glass highlights build theirs in a `useMemo` keyed on layout. Inline
  construction churned one native object per tube per render.
- **Icon paths are parsed once, module-level** (`PATHS` in `Icon.tsx`). They
  are immutable — only the canvas transforms — so one copy per glyph is safe.
- **One reaction per animated element, not one per property.** `useUiValue3`
  computes x, y and opacity together; three separate `useUiValue` calls meant
  three per-frame subscriptions each, and the backdrop's fourteen motes made
  forty-two.
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

`src/theme/apothecary.ts` still exports the `Theme` shape the renderer takes,
but every value in it now points at `colors.ts`.

Poppins is bundled and loaded in `Root` before the first frame; a system-font
frame would flash and reflow every screen.

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

Star rating is in `src/game/stars.ts`. Par is the solver's move lower bound,
already computed while generating the level — not a hand-authored number and
not the prototype's `colours * 2`, which assumes capacity 4. A finished level
always pays at least one star, because there is no fail state.

Coins are paid the moment the board is solved, not on the Complete screen: a
player who backs out during the win animation still keeps them.

Two new stores: `economyStore` (coins, daily streak, owned cosmetics) and
`overlayStore` (modal and toast, so any handler can raise one without threading
callbacks or re-rendering the screen below). Settings grew to spec §8 and the
key moved to `settings.v3`.

The music icon's behaviour is spec §7 and is deliberately odd: with master
sound off it is dimmed and opens a modal offering to turn sound back on; with
sound on it cycles the music track and toasts the name. Keep that exact logic.

## Look

Cartoon, not realistic. Two rules, both learned by getting them wrong:

- **Flat fills. No gradients on liquid.** A vertical gradient makes one colour
  read as three shades, which breaks the cartoon look and makes matching
  segments hard to compare — the one thing the player does constantly.
- **Bold dark outlines** on tubes, not thin grey hairlines. Hairlines read as a
  chart; a heavy `theme.ink` stroke reads as drawn.

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
no audio assets exist yet. Colourblind marks have a toggle but the Board does
not draw symbols yet. `android/` and `ios/` already exist — prebuild has been
run.

The app icon is still an Expo default. The **splash** is not: `expo-splash-screen`
draws the native launch screen (`assets/splash-icon.png` on `#150A34`,
configured in `app.json`), and `src/ui/nativeSplash.ts` holds it up until there
is a real frame to hand off to.

`assets/splash-icon.png` is generated, not drawn: `python3 script/make-splash.py`
redraws it from the palette, so the launch mark cannot drift away from the
colours the app itself uses. Expo's default placeholder shipped in that slot
until it was caught on a simulator run.

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
