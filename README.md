# Decant

A water sort puzzle game for iOS and Android. Coloured liquid sits in glass
vials; tap a source, tap a destination, the liquid pours. A level is solved when
every vial holds one colour or none.

No timer, no fail state. The genre sells relaxation, and a clock works against
that.

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript strict · Skia ·
Reanimated · zustand · MMKV.

---

## Getting started

Node 24 and a native toolchain are required. **Expo Go will not run this app** —
Skia and MMKV are native modules, so you need a real build.

```bash
npm install          # also installs the git hooks, via husky
npm run prebuild     # generate android/ and ios/ (both are gitignored)
npm run ios          # build, install and launch on a simulator/device
npm run android
npm start            # Metro only, against an already-installed build
```

iOS needs Xcode and CocoaPods. Android needs JDK 17 and the SDK. There is no
`web` script: MMKV has no web build and this is a phone game.

## Everyday commands

| Command                  | What it does                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| `npm run check:all`      | All six gates in parallel, one summary. **Run this before pushing.** |
| `npm test`               | Jest                                                                 |
| `npm run typecheck`      | `tsc --noEmit`                                                       |
| `npm run lint`           | ESLint, zero warnings tolerated                                      |
| `npm run lint:fix`       | ESLint with `--fix`                                                  |
| `npm run lint:dead`      | Knip — unused files, exports, dependencies                           |
| `npm run lint:md`        | markdownlint                                                         |
| `npm run format`         | Prettier, with a summary of what it rewrote                          |
| `npm run doctor`         | expo-doctor; must stay at 20/20                                      |
| `npm run prebuild:clean` | Regenerate the native dirs from scratch                              |

Full command reference, cache-clearing escalation and troubleshooting live in
[docs/02-commands.md](docs/02-commands.md).

## How it is put together

```text
src/core/      pure game logic — no React, unit-tested
src/game/      level generation, difficulty, star rating
src/render/    Skia board, tubes, pour animation, shaders
src/state/     zustand stores + MMKV persistence
src/theme/     colours, typography, fonts
src/ui/        screens; chrome/ shared components; hooks/; styles/
src/utils/     small pure helpers
script/        CLI tooling and custom ESLint rules
```

`@/*` maps to `src/*`, configured in `tsconfig.json`, `babel.config.js` and
`jest.config.js` — all three, or the alias breaks in one context and not the
others.

### Rules that are enforced, not just agreed

Each of these is a lint rule or a test, because each one describes a bug that
already happened here.

- **`src/theme/colors.ts` is the only file that may contain a colour.**
  Everything else imports from it; translucency comes from `alpha(name, n)` so
  moving a base colour carries to every translucent use of it.
  `local/no-raw-colour` enforces it, and a test fails the build if two palette
  entries share a value or if two colours on one board come within ΔE 30 of each
  other. Even `app.config.ts` imports its splash and icon colours from there,
  which is why the Expo config is TypeScript rather than `app.json`.
- **Components hold no `StyleSheet`.** Every `Foo.tsx` has a
  `styles/Foo.styles.ts` beside it. `local/no-inline-stylesheet` enforces it.
- **Level generation is deterministic and that is load-bearing.** No board is
  ever saved; level N is rebuilt from its seed. The curve, the salts, the
  generator and the RNG are therefore all part of the save format, and a test
  pins a recorded fingerprint. If it fails, the fix is a migration — not a
  re-recorded expectation.

### Two Skia traps worth knowing before you touch the board

Both were found the hard way on Skia 2.6.2 + Reanimated 4.5.1, and the
workarounds must not be undone:

1. `useDerivedValue` output does **not** drive Skia props — the prop silently
   freezes, with no error. `src/render/useUiValue.ts` bridges the gap.
2. An `SkPath` in a shared value does not survive either, so animated shapes are
   built from numeric props.

`AGENTS.md` carries the full list, along with the perf rules the UI follows.

## Before you commit

`.husky/pre-commit` runs prettier, eslint, tsc, markdownlint, jest and knip at
once and blocks the commit if any fail. It never rewrites your files — a hook
that reformats what you are committing changes what you reviewed. Run
`npm run format` yourself.

Signed commits are not required here.

## Documentation

| File                                           | What is in it                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                         | The working file. Architecture, invariants, every decision and the reason for it. Read before changing anything. |
| [docs/00-overview.md](docs/00-overview.md)     | What the app is and why, for someone joining                                                                     |
| [docs/01-water-sort.md](docs/01-water-sort.md) | Game spec — rules, generation, difficulty curve, ad slots                                                        |
| [docs/02-commands.md](docs/02-commands.md)     | Commands, debugging, recovery                                                                                    |

`docs/decant-handoff/` holds the visual source of truth — a build spec and a
playable HTML prototype. It is **gitignored**: it is a working reference, not
shipped source. Get a copy from the designer if you do not have one.

`.claude/settings.json` enables the official Expo plugin for Claude Code, so
the assistant answers against SDK 57 docs rather than from memory. Nothing in
the build depends on it.

## Where it stands

Built: the pure core, level generation with an acceptance gate, a solver, three
difficulty modes, undo/redo, the full Skia board with a shader-drawn pour, nine
screens against the current design, persistence, coins and daily rewards, and
the native splash.

Not built: audio (settings persist, no assets yet), analytics, ads, the
onboarding tutorial, and colourblind marks on the board. The app icon is still
an Expo default.

## Licence

Private and unpublished.
