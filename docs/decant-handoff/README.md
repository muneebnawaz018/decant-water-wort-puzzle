# Decant — Build Handoff Package

This folder is the complete design + implementation brief for **Decant**, a
water-sort puzzle game for iOS and Android. It is meant to be read by a coding
AI (Claude Code, Cursor, etc.) and a human dev together, to implement the game
in the existing **Expo + React Native + Skia** stack.

## What's in here

| File                    | Purpose                                                                                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decant-prototype.html` | The **interactive, playable reference prototype**. Open it in a browser. It is the source of truth for look, layout, spacing, colour, animation, flow, and game feel. It is NOT portable code — do not copy it into React Native. Read it as a spec.      |
| `BUILD-SPEC.md`         | The full implementation spec: tech stack, design tokens (every hex value), screen-by-screen breakdown, component inventory, game logic, animation timings, sound, state, accessibility, and a CSS→Skia/RN translation guide. **Start here for building.** |
| `README.md`             | This file.                                                                                                                                                                                                                                                |

## How the build AI should use this

1. **Open `decant-prototype.html` in a browser first.** Play a few levels.
   Everything you build should match what you see and feel there.

2. **Read `BUILD-SPEC.md` fully** before writing code. It maps every prototype
   element to the target stack.

3. The prototype is HTML/CSS/JS. The target is **Expo +
   `@shopify/react-native-skia` + `react-native-reanimated`**. Most "CSS tricks"
   (gloss, glow, shadows) should be drawn properly in Skia — it will look
   cleaner than the prototype, not worse.

4. Where the prototype uses placeholder data (levels, stats numbers, shop
   items), wire it to the real game/state layer described in the spec.

## Important context

- **Everything is original and drawn in code — no image assets.** No copied art,
  code, names, or trademarks. This is deliberate (fast build + legal safety). Do
  not introduce third-party art or asset packs.

- The prototype's sound is synthesized with Web Audio as a stand-in. In RN, use
  real short sound files via `expo-audio`/`expo-av` (see spec).

- Three things are intentionally **not** finished in the prototype and are
  flagged in the spec as next work: the onboarding tutorial, board/Stages layout
  polish, and hand-tuned level design / difficulty curve.
