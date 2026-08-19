# Decant — project overview

Share this with anyone joining the project. It covers what the app is, why it
exists, what is built, and what is left. Deeper detail lives in
`docs/01-water-sort.md` (game spec) and `docs/02-commands.md` (build commands).

## What it is

Decant is a water sort puzzle game for iOS and Android. Colored liquid sits in
glass vials; you tap a source vial, tap a destination, and the liquid pours. A
level is done when every vial holds one color or is empty.

Theme is an apothecary bench: aged parchment, a brass rack, glass vials, warm
lamplight from the upper left. Everything on screen is drawn with Skia — there
are no image assets, not even for the icons.

Store name is `Decant: Water Sort Puzzle`, launcher name is `Decant`. The Play
Store and trademark checks have not been run yet, so nothing is reserved.

## Why this game first

The genre is crowded and this title is not expected to be a hit. Its job is to
prove the whole pipeline works end to end: generation engine, undo, persistence,
analytics, ads, EAS build, store submission, a build in real hands. It was
picked because it has the least that can go wrong — no physics, no real-time
loop, no art dependency, no camera.

Judge it on whether the machine ran, not on installs.

The one listing differentiator worth having: incumbent reviews in this genre are
dominated by ad complaints. Decant promises no ads during puzzles, only between
levels, and says so in the first two lines of the description.

## Rules

A vial holds `capacity` segments (default 4), stacked bottom to top. A pour from
A to B is legal when A is not empty, B is not full, and B is either empty or its
top segment matches A's top segment.

A legal pour moves the **whole** top run of matching segments, capped by free
space in B. One segment at a time feels broken and players say so.

No timer. No fail state. Undo and restart only. The genre sells relaxation, and
a timer breaks that proposition outright.

## Stack

Expo SDK 57 (RN 0.86, React 19, TypeScript strict) on the **prebuild** workflow,
not Expo Go — Skia and MMKV need a native build. `android/` and `ios/` already
exist.

Expo was chosen over bare RN CLI on purpose: config plugins handle the AdMob
native wiring, EAS Build/Submit is the store pipeline this project exists to
prove, expo-updates lets level-gen fixes ship without a store review, and SDK
upgrades avoid hand-diffing the native dirs. Do not migrate this to bare CLI.

Load-bearing packages: `@shopify/react-native-skia` draws the entire board;
`react-native-reanimated` runs the pour animation on the UI thread;
`react-native-gesture-handler` catches fast taps that `Pressable` drops;
`react-native-mmkv` persists synchronously so a save survives a force-quit;
`zustand` holds game and settings state.

```bash
npm run ios / npm run android   # build, install, launch
npm start                       # Metro for an installed dev build
npm test                        # jest
npm run typecheck               # tsc --noEmit
npm run doctor                  # expo-doctor, must stay 20/20
```

## Layout

```text
src/core/      pure logic, React-free, unit-tested — rules, RNG, solver
src/game/      level generation, difficulty modes
src/render/    Skia board, pour animation, ambient vials
src/state/     zustand stores + MMKV persistence
src/theme/     apothecary palette
src/ui/        screens, icons, transitions
src/audio/     empty
src/analytics/ empty
src/ads/       empty
```

`@/*` maps to `src/*` in `tsconfig.json`, `babel.config.js`, and
`jest.config.js`.

## Level generation

Levels are generated in reverse from a solved board, then scrambled, then run
through an acceptance gate. Everything is seeded — level N in a given difficulty
mode rebuilds identically on every device from
`seedForLevel(level, DIFFICULTY_SALT[mode])`.

**No board is ever stored.** That makes the difficulty curve, the salts, the
generator, and the RNG part of the save format in practice. Change any of them
and every player's progress silently points at different puzzles.
`src/game/__tests__/difficulty.test.ts` pins level 30 against a recorded
fingerprint to catch that. If it fails, the fix is a migration, not a re-recorded
expectation.

Verified across levels 1–1000: every board passes the gate, every board is
solvable, every solution replays to a solved state. Longest solution is 51
moves; a level takes about 3.4ms to generate.

Two deviations from the spec, both commented at the source:

1. The spec's "reachable in under 60% of the scramble steps" needs an optimal
   solution length, which is unaffordable on a 12-color board. Replaced with a
   scale-free fragmentation ratio carrying the same intent.
2. That floor is unreachable at capacity 5 (measured 0.50–0.68), so it drops to
   0.50 there. Solvability and the already-solved-vial check carry the gate on
   those levels.

The spec's `inverseMoves` pseudocode (§5) has a bug: it allows lifting a vial's
whole top run while other colors sit underneath, and that un-pour has no legal
forward inverse, so the scramble can reach a board with no path back to solved.
`src/game/waterGenerator.ts` only permits a whole-run lift when the vial empties.
A test replays every generated un-pour backwards to hold that line.

## Difficulty

Three modes — gentle, classic, fiendish — in `src/game/difficulty.ts`.
Difficulty is driven by **spare empty vials**, not color count. Two spare down
to one spare is the big jump; spend it late. A board never drops below one spare.

Each mode keeps its own unlocks, current level, and best scores under
`progress.v2`, keyed by mode. Keys were bumped to `progress.v2` / `settings.v2`
when modes landed; v1 records are ignored rather than migrated, which is fine
because nothing has shipped.

## Feel and performance

The pour runs for exactly 350ms with input locked — unlocked, queued taps cause
double pours. `src/render/pour.ts` holds the timing phases and arc geometry as
pure functions; `Board.tsx` draws the stream, the rising level, and the splash.
The receiving level does not start rising until the arc has had time to land;
filling early is what makes a pour look fake.

The whole animation is driven by one shared value on the UI thread through
`useDerivedValue`. React does not re-render during a pour. Keep it that way —
moving any of it into React state costs a re-render per frame.

Other rules being followed and worth keeping:

- Screens mount one at a time in `src/ui/Root.tsx`. An unmounted screen cannot
  animate or hold a Skia surface.
- The splash animation runs on the UI thread and cancels on unmount. Nothing
  loops forever.
- Handlers read stores via `getState()` instead of subscribing, so the tap
  gesture is never rebuilt and a settings change never re-renders the board.
- Settings live in their own store for that same reason.
- `Board` and the layout are memoised; layout recomputes only when vial count,
  capacity, or the box changes.

Icons are Skia-drawn SVG paths in `src/ui/Icon.tsx` — no image assets, no
`react-native-svg`, no Lottie. Lottie was considered and dropped: it needs a
native rebuild and a JSON artwork pipeline, and there is no artwork to feed it.

## Monetisation (phase 2, stubbed)

| Slot                          | Trigger                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| `interstitial_level_complete` | Every 4th completion, never mid-level, skip if under 90s since the last |
| `rewarded_extra_undo`         | After 3 free undos, explicit button only                                |
| `rewarded_hint`               | Hint button, after 1 free hint per level                                |
| `rewarded_extra_tube`         | Player taps "add a vial"                                                |
| `banner_level_select`         | Menu only, never on the board                                           |

`rewarded_extra_tube` is the money slot — it converts because it solves the
exact frustration the player feels at that moment. Never show an ad mid-level.

## Where it stands

Done: scaffold and config, expo-doctor at 20/20, pure core (rules, seeded RNG,
solver), level generation and the acceptance gate, three difficulty modes, the
Skia board, the pour animation, game and settings stores with MMKV persistence,
and the splash → home → stages / game / settings flow with icon buttons, back
navigation, and screen transitions. 54 passing tests. Every screen has been run
on the iOS simulator.

Not started: `src/audio` (settings persist but no assets exist), `src/analytics`,
`src/ads`. Colorblind marks have a toggle but the board does not draw the
symbols yet. The app icon and splash are still Expo defaults. Play Store and
trademark availability are unverified.
