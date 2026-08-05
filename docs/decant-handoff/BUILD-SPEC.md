# Decant — Build Spec (Expo / React Native / Skia)

This document translates the reference prototype (`decant-prototype.html`) into
concrete implementation terms for the target stack. Read alongside the running
prototype.

---

## 1. What Decant is

A water-sort puzzle. Coloured liquid sits in glass vials; tap a source vial, tap
a destination, the liquid pours. A level is solved when every vial holds a
single colour or is empty. No timer, no fail state — undo and restart only. The
genre sells relaxation.

Visual direction: **dark, warm, glossy "apothecary" theme** — deep purple
background with a warm amber glow, gold chrome, pure saturated candy-coloured
liquids in glassy vials. Everything is vector/Skia-drawn; **no image assets**.

Store name: `Decant: Water Sort Puzzle`. Launcher name: `Decant`. Listing
differentiator: **no ads during puzzles, only between levels** — state this in
the first two lines of the store description.

---

## 2. Tech stack (already chosen — do not migrate)

- **Expo SDK 57** (RN 0.86, React 19, TypeScript strict), **prebuild** workflow
  (not Expo Go).

- `@shopify/react-native-skia` — draws the entire board and all "art" (vials,
  liquid, gloss, glow, gold logo, icons, glyphs).

- `react-native-reanimated` — all animation on the UI thread (pour, pops,
  transitions).

- `react-native-gesture-handler` — tap handling (catches fast taps `Pressable`
  drops).

- `react-native-mmkv` — synchronous persistence (survives force-quit).
- `zustand` — game state + settings state (two separate stores).
- **Add:** `expo-audio` (or `expo-av`) for sound; `expo-haptics` for vibration.

Source layout (from project doc):

```text
src/core/      pure logic, React-free, unit-tested — rules, RNG, solver
src/game/      level generation, difficulty modes
src/render/    Skia board, pour animation, ambient vials
src/state/     zustand stores + MMKV persistence
src/theme/     palette + tokens
src/ui/        screens, icons, transitions
src/audio/     sound (was empty — build this)
src/analytics/ (later)
src/ads/       (later, phase 2)

```

---

## 3. Design tokens

### Colours (exact)

#### Environment / chrome

```text
bg          #2A1758   (top of background gradient)
bg2         #150A34   (bottom of background gradient)
panel       #3A2670   (card base)
panel2      #4A3488   (card top, for the vertical gloss gradient)
line        rgba(255,255,255,0.10)   (hairline borders / top gloss)
ink         #F4ECFF   (primary text)
muted       #B7A6E6   (secondary text)
gold        #FFC94B   (accent)
gold2       #FFDE86   (accent highlight)
gold-d      #B7801C   (accent shadow)
accent      #37D26B   (green — primary action)
accent-d    #1C9647   (green shadow)

```

Background is a layered gradient:

- radial warm glow top-centre: `rgba(255,190,100,0.16)` fading out by ~46%
- radial magenta wash bottom-right: `rgba(162,77,255,0.28)` fading by ~60%
- linear `bg → bg2`, 170deg

#### Liquid colours (the sortable units)

Pure, saturated, glossy on dark:

```text
coral      #FF4242   mango     #FF8A1E   plum       #A24DFF   lime      #A6E82A
aqua       #22C9EC   rose      #FF4FA6   blueberry  #3B7BFF   grape     #7B3FF2
tangerine  #FFCE1F   teal      #14C7B2

```

Up to 12 supported; use well-separated hues at low colour counts, closer pairs
only at the hardest levels. Each liquid segment gets an outer glow (`0 0 16px
<colour>55`) + inner shadow + a top white gloss highlight.

### Typography

- Family: **Poppins** (weights 300/400/500/600/700). Ship the font with the app.
- Wordmark "DECANT": weight 700, letter-spacing 0.14em, **metallic gold gradient
  text** (`#FFEFB4 → #FFD170 → #E7A32E`, top→bottom) with a soft emboss shadow.
  In Skia, draw as a gradient-filled text path.

- Headings: 600. Body: 400/500. Labels/eyebrows: 600, uppercase, letter-spacing
  ~0.08em.

### Spacing / shape

- Screen side padding: **24px**. Consistent gap between stacked content blocks:
  **24px**.

- Card radius: 18–22px. Button radius: 16px. Vial glass radius: `12 12 26 26`.
- Panels use a vertical gloss: `linear-gradient(panel2 → panel)` + 1px light top
  border + soft drop shadow + `inset 0 1px 0 rgba(255,255,255,.1)` top
  highlight.

- **Buttons have NO raised bottom "lip".** Use a flat glossy face: bright inner
  top highlight, soft inner bottom shade, plain neutral drop shadow. On press,
  translate down ~2px. (This was an explicit design correction — do not add
  coloured bottom bevels.)

---

## 4. Screens & flow

Flow: **Splash → Home**. From Home: Play → **Stages** (level select) → **Board**
→ **Complete**. Home nav bar → Daily / Shop / Stages / Stats / Settings.
Continue card → resumes current level.

Screen transitions: cross-dissolve with a slight scale + blur, ~500ms, plus a
lamplight "sweep" highlight. In RN, drive with Reanimated shared values; mount
one screen at a time.

### 4.1 Splash

Dark bench, warm lamp glow flickers on, a glowing vial, the gold DECANT wordmark
and tagline "measure · pour · settle" rise in, auto-advance to Home after ~3s
(or tap).

### 4.2 Home

- Top bar: coins pill (gold-bordered, gold coin) left; music/sound icon right.
- Centered content column, one 24px gap between each:
  1. **Hero lockup** — 3 glowing vials aligned on a **gold shelf**, DECANT
     wordmark, tagline.

  2. **Continue card** — level badge (gold), "Continue · Classic", "Level 7", a
     progress bar, a play chip. Tap resumes the current level directly.

  3. **Reward chips row** — "Daily reward · Ready to claim" (→ Daily) and "+50
     coins · Watch a short ad" (→ confirm modal → +coins with a flying "+50"
     animation).

  4. **Play button** — big glossy green; opens Stages.
- **Nav bar** (single grouped rounded panel, flat icons): Daily, Shop, Stages,
  Stats, Settings.

### 4.3 Stages (level select) _(needs polish — see §9)_

Header + back. Three difficulty **tabs**: Gentle / Classic / Fiendish (each
retints the accent). Scrollable grid of level tiles with star ratings,
locked/unlocked, current level pulsing. Tap unlocked tile → Board.

### 4.4 Board (gameplay) _(needs polish — see §9)_

- Header: back (→ Stages), level number + move count, restart.
- The vials, centered, wrapping to rows.
- Controls: Undo, Hint, Add vial.
- Interaction: tap a vial → it lifts + squashes (and plays a tap sound); tap
  another → if legal, it tilts toward the target, a glowing stream pours, a
  splash lands, liquid transfers. Illegal → shake + deselect. When a vial
  completes: it pops (squash/stretch), throws sparkles, plays a two-note ding,
  and (when done) the cork drops in.

### 4.5 Complete

Home button (top-left). Shimmering gold "Beautifully sorted" title. 3 stars pop
in. "Solved in N moves · par M". A **coin reward chip** pops in and pays coins
into the balance. Confetti burst. Buttons: Replay, Next level. Win jingle plays.

### 4.6 Daily

Streak indicator, a 7-day reward track (past = claimed, today = claimable,
future = locked), a Claim button (adds coins), and a bonus "today's brew" puzzle
link.

### 4.7 Shop

Spend coins on **cosmetic** vial skins (preview swatches, Owned/Buy), plus
real-money "Remove ads" and coin packs. Cosmetic only — never pay-to-win.

### 4.8 Stats

Read-only dashboard: levels solved, stars earned, best streak, time played, and
a completion bar per difficulty.

### 4.9 Settings

Grouped rows with switches / a segmented control:

- **Game:** Difficulty (Easy/Medium/Hard), Colourblind marks (toggle).
- **Sound & feel:** Sound, Music, Sound on tap, Vibration, Daily reminder.
- **More:** How to play, Rate us, Restore purchases, Privacy policy. Version
  string.

### 4.10 Global: Modal + Toast

- **Modal:** dark glossy card, title, body, one or two buttons. Used for
  confirms (watch ad, buy skin, rate us, re-enable sound, how-to, privacy).

- **Toast:** small dark pill, bottom-centre, auto-dismiss ~1.8s (track name,
  "+40 claimed").

---

## 5. Game logic (pure, in `src/core`)

- A vial holds `capacity` segments (default **4**), stacked bottom→top.
- **Legal pour** A→B: A not empty, B not full, and B empty OR B's top == A's
  top.

- A legal pour moves the **whole top run** of matching segments, capped by free
  space in B. (Moving one segment at a time feels broken — move the whole run.)

- **Solved:** every vial is empty OR full-and-single-colour.
- No board is ever stored — levels are **seeded** and rebuilt from
  `seedForLevel(level, DIFFICULTY_SALT[mode])`. Generation is
  reverse-from-solved + scramble

  - an acceptance gate (solvable, passes fragmentation check). See project doc
    `docs/01`.

- Difficulty is driven by **spare empty vials**, not colour count. Never below
  one spare. Three modes: gentle / classic / fiendish, each with its own
  progress under `progress.v2`.

- **Prototype simplification to replace:** the prototype uses a trivial
  pair-based generator (`par = colours * 2`) and 12 placeholder levels per mode.
  Swap in the real seeded generator and difficulty curve from the game layer.

---

## 6. Animation spec (timings from prototype)

| Animation         | Detail                                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen transition | ~500ms; opacity + scale(0.97↔1) + blur; lamplight sweep ~700ms                                                                                             |
| Home reveal       | children rise-in, staggered 50/130/210/290ms; nav bar 360ms                                                                                                |
| Pour              | source lifts + tilts ~14° toward target (240ms), glowing stream falls (160ms), splash blooms, settle (~300ms). Total ~540ms, **input locked** during pour. |
| Liquid surface    | slow meniscus wobble (~2.6s loop); rising bubbles inside filled vials                                                                                      |
| Vial select       | translateY(-24px) + scale(1.05), springy                                                                                                                   |
| Illegal move      | horizontal shake (~400ms)                                                                                                                                  |
| Vial completed    | squash/stretch "pop" (~420ms) + sparkle particle burst + cork drop                                                                                         |
| Solved vial idle  | gentle brightness "breathe" (~2.2s)                                                                                                                        |
| Complete: stars   | pop in, staggered ~230ms apart, spring                                                                                                                     |
| Complete: title   | continuous gold shimmer sweep (~2.6s loop)                                                                                                                 |
| Complete: reward  | coin chip pops in after stars, then coins count up                                                                                                         |
| Confetti          | ~28 multicolour particles radiate outward on win                                                                                                           |
| Coin earn (home)  | "+N" gold text floats up from the coin pill; pill pulses                                                                                                   |
| Buttons           | press = translateY ~2px; Play has a slow diagonal shine sweep (~5s loop)                                                                                   |
| Ambient           | warm gold motes drift upward; lamp glow flickers subtly                                                                                                    |

All of the above → **Reanimated shared values on the UI thread**. Do not animate
via React state re-renders. The pour especially must not re-render React per
frame.

---

## 7. Sound spec

Replace the prototype's Web Audio synthesis with short sound files via
`expo-audio`. Gate by `settings.sound` (master) and `settings.tapSound`.

| Event             | Character                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Tap (select vial) | soft short tick                                                                                    |
| Pour              | descending "glug" / water pour                                                                     |
| Vial completed    | pleasant two-note ding                                                                             |
| Win               | short 4-note ascending jingle                                                                      |
| Music             | 3–4 selectable ambient loops ("Herbarium", "Rainfall", "Lo-fi", Off), cycled by the top music icon |

**Music icon behaviour:** if master Sound is OFF in settings, the icon is
disabled (dim + slash) and tapping it opens a confirm modal offering to
re-enable sound. If Sound is ON, tapping cycles the music track (with a toast).
Keep this exact logic.

Haptics: `expo-haptics` light impact on taps/pours when `settings.vibration` is
on.

---

## 8. State & persistence

Two zustand stores, persisted with MMKV:

### Game store

- `coins` (number)
- `progress` per mode: `unlocked` level, `stars` map (levelKey → 0–3)
- current level in progress (for Continue / resume)
- daily: streak, last-claim date, which days claimed
- owned shop items

### Settings store

Kept separate so a settings change never re-renders the board.

- `sound`, `music`, `musicTrack`, `tapSound`, `vibration`, `colourblind`,
  `dailyReminder`, `difficulty` (gentle/classic/fiendish)

Handlers should read stores via `getState()` (not subscribe) so the tap gesture
is never rebuilt.

---

## 9. Accessibility

**Colourblind marks:** when `settings.colourblind` is on, draw a distinct white
glyph on each liquid segment (in Skia). Mapping used in the prototype:

```text
coral ●   mango ▲   plum ★   lime ◆   aqua ∿
rose ✚    blueberry ■   grape ✖   tangerine ○   teal ≈

```

Also: respect reduced-motion (pause ambient loops), keyboard/focus not relevant
on mobile, maintain high contrast (already strong on the dark bg).

---

## 10. Monetisation (phase 2 — stub the hooks, wire ads later)

Never show an ad mid-level. Slots:

| Slot                          | Trigger                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `interstitial_level_complete` | every 4th completion, never mid-level, skip if <90s since last |
| `rewarded_extra_undo`         | after 3 free undos, explicit button                            |
| `rewarded_hint`               | hint button, after 1 free hint per level                       |
| `rewarded_extra_tube`         | player taps "add a vial" — **the money slot**                  |
| `banner_level_select`         | menu only, never on the board                                  |

Coins economy: earned from level completion + daily rewards + rewarded ads;
spent in Shop on cosmetics.

---

## 11. What's DONE in the prototype vs. what remains

**Done (match these):** full visual system, all 9 screens + modal + toast, home
layout & rhythm, playable board with real pour/undo/hint/add-vial, star rating,
complete screen with reward, daily/shop/stats/settings screens, sound design,
micro-feedback (pops, sparkles, coin-fly), colourblind glyphs, music/sound modal
logic.

**Remaining work (flagged, not in prototype):**

1. **Real level generation & difficulty curve** — replace the placeholder pair
   generator with the seeded generator from the game layer, and hand-tune the
   first ~20 levels. This matters more than any visual for retention.

2. **Onboarding tutorial** — a guided first level teaching the pour.
3. **Board & Stages layout polish** — bring their spacing/composition up to
   Home's standard.

4. **Edge states** — "no more undos", "stuck? restart", mid-game empties.
5. **Ads + analytics** — phase 2.
6. **Optional art** — a single mascot / background would close the last visual
   gap vs. top competitors, but needs an image tool and breaks the no-asset
   rule. Deferred.

---

## 12. CSS → Skia / RN quick translation

| Prototype (CSS/HTML)         | Target (RN / Skia)                                                               |
| ---------------------------- | -------------------------------------------------------------------------------- |
| CSS gradients / gloss / glow | Skia `LinearGradient`, `RadialGradient`, `Blur`, real shaders — cleaner than CSS |
| `box-shadow` depth           | Skia shadow / layered shapes, or RN `shadow*` for plain views                    |
| CSS keyframes                | Reanimated `withTiming` / `withSpring` / `withRepeat`                            |
| DOM screens                  | RN screens mounted one at a time (`src/ui/Root`)                                 |
| Web Audio synth              | `expo-audio` sound files                                                         |
| `navigator.vibrate`          | `expo-haptics`                                                                   |
| in-memory JS state           | zustand + MMKV                                                                   |
| unicode glyph icons          | Skia-drawn SVG paths (already the plan)                                          |
| Poppins via web font         | bundled Poppins font                                                             |

The prototype is the **target**, not the source. Build to it.
