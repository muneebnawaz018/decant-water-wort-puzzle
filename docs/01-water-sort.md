# 01 — Water Sort

**Theme:** Apothecary Bench
**Working title:** Decant (verify availability on Play before committing)
**Engine:** React Native (Expo SDK 57, prebuild — native dirs generated, not
managed-only)
**Build:** 6 days after the shell exists, 3 weeks if it carries the shell
**Ship order:** First

---

## 1. Why this one goes first

It has the least that can go wrong. No physics, no real-time loop, no art
dependency, no camera. The board is colored rectangles in glass tubes. Every
visual asset is a shape you can draw in Skia.

Its real job is not to succeed commercially. It is to prove the pipeline works
end to end: monorepo, generation engine, undo, persistence, analytics, store
submission, and a build in players' hands. Judge it on whether the machine ran,
not on installs.

Reference on store: Get Color,
`play.google.com/store/apps/details?id=com.zm.watersort`

---

## 2. Core loop

Tap a source tube, tap a destination tube, liquid pours. Repeat until every
tube holds one color or is empty.

Session shape: 30 to 90 seconds per level, players chain 5 to 15 levels.

---

## 3. Rules

A tube holds up to `capacity` segments (default 4), stacked bottom to top.

A pour from tube A to tube B is legal when all of these hold:

- A is not empty
- B is not full
- B is empty, **or** the top segment of B matches the top segment of A

On a legal pour, move **all consecutive matching segments** from the top of A,
limited by free space in B. Moving one at a time feels sluggish and players
hate it.

The level is solved when every tube is either empty or contains `capacity`
segments of a single color.

There is no fail state and no timer. Players restart or undo. This matters: the
genre sells relaxation, and adding a timer breaks the entire proposition.

---

## 4. Data model

```ts
type Color = number; // index into theme.pieces

interface WaterState {
  tubes: Color[][]; // index 0 = bottom
  capacity: number;
  colorCount: number;
  extraTubes: number; // empty tubes beyond colorCount
}

interface PourMove {
  from: number;
  to: number;
  count: number; // segments actually moved
}
```

---

## 5. Generation

Reverse-generation. Start solved, un-pour repeatedly.

```ts
buildSolved(params, rng): WaterState {
  const tubes: Color[][] = [];
  for (let c = 0; c < params.colorCount; c++) {
    tubes.push(Array(params.capacity).fill(c));
  }
  for (let e = 0; e < params.extraTubes; e++) tubes.push([]);
  return { tubes: rng.shuffle(tubes), ...params };
}

inverseMoves(state): PourMove[] {
  // An inverse pour takes k segments off the top of a uniform-topped
  // tube and puts them on a tube that is empty or whose top matches.
  // Same legality test as a forward pour, applied backwards.
  const moves: PourMove[] = [];
  for (let from = 0; from < state.tubes.length; from++) {
    const src = state.tubes[from];
    if (src.length === 0) continue;
    const top = src[src.length - 1];
    let run = 0;
    for (let i = src.length - 1; i >= 0 && src[i] === top; i--) run++;

    for (let to = 0; to < state.tubes.length; to++) {
      if (to === from) continue;
      const dst = state.tubes[to];
      const space = state.capacity - dst.length;
      if (space === 0) continue;
      if (dst.length > 0 && dst[dst.length - 1] === top) continue; // no re-merge
      for (let k = 1; k <= Math.min(run, space); k++) {
        if (k === run && dst.length === 0 && src.length === run) continue; // no-op
        moves.push({ from, to, count: k });
      }
    }
  }
  return moves;
}
```

### Acceptance gate

Reject a generated board if any of these are true:

- Fewer than `minMoves` moves needed (estimate by counting non-uniform tubes)
- Any tube is already solved at start beyond one freebie
- The board is reachable in under 60% of the scramble steps applied

Run 200 boards through `tools/level-preview` and look at them before shipping.

### Difficulty curve

| Levels  | Colors | Capacity | Extra tubes | Scramble steps |
| ------- | ------ | -------- | ----------- | -------------- |
| 1–5     | 3      | 4        | 2           | 8              |
| 6–20    | 4      | 4        | 2           | 16             |
| 21–50   | 5      | 4        | 2           | 28             |
| 51–100  | 6      | 4        | 2           | 40             |
| 101–200 | 7      | 4        | 2           | 55             |
| 201–350 | 8      | 4        | 1           | 70             |
| 351–500 | 9      | 5        | 1           | 90             |
| 501+    | 10–12  | 5        | 1           | 110            |

The lever that actually controls difficulty is **extra tubes**, not color
count. Going from 2 spare tubes to 1 is a much bigger jump than adding a
color. Save it.

Every 10th level, drop back one row in this table.

---

## 6. Screens

**Board:** tubes laid out in two rows, centered. Level number top-left, move
counter top-right. Undo, hint, restart along the bottom.

Tube layout by count:

- 5 to 8 tubes: two rows
- 9 to 12 tubes: two rows, smaller
- 13+: three rows

Tap a tube to lift its top run slightly (selected state). Tap a second tube to
pour. Tap the same tube again to deselect.

**Complete:** liquid settles, tubes glow in sequence, move count and best
shown, Next button.

---

## 7. Feel

This game lives entirely on the pour animation. Get it right and the rest
follows.

- Liquid arcs from source to destination, it does not teleport. 350ms,
  ease-in-out.
- The receiving level rises as the arc lands, not before.
- Pour sound pitched by how full the destination is. Higher as it fills.
- Selected tube lifts 8px with a soft shadow.
- Illegal tap: tube shudders 3px horizontally, muted thud, no color change.
- Tube completing: brief ring of light, sparkle burst, distinct chime.
- Level completing: tubes chime left to right in sequence, then celebration.
- Haptic on every pour, heavier on tube completion.

Do not let the player queue taps during the pour animation. Lock input for the
350ms or you get double-pour bugs.

---

## 8. Ad slots (phase 2, stubbed now)

| Slot                          | Trigger                                  | Notes                                                                    |
| ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `interstitial_level_complete` | Every 4th completion                     | Never mid-level. Skip if under 90s since last.                           |
| `rewarded_extra_undo`         | After 3 free undos                       | Explicit button only                                                     |
| `rewarded_hint`               | Hint button, after 1 free hint per level |                                                                          |
| `rewarded_extra_tube`         | Player taps "add a tube"                 | Strongest slot in this genre. Adds one empty tube for the current level. |
| `banner_level_select`         | Menu only                                | Never on the board                                                       |

The extra-tube reward is the money slot. It converts because it solves the
exact frustration the player is feeling at that moment.

---

## 9. Theme: Apothecary Bench

Glass vials in a wooden rack on a workbench. Brass fittings, handwritten paper
labels, warm lamplight from the upper left.

```text
bg        #F4EBDC   aged parchment
surface   #E3D3B8   worn bench
board     #C9A227   brass rack
ink       #2E2419
inkMuted  #7A6A55
accent    #B5651D   copper
pieces    #7B2D26 (garnet)  #1F5673 (cobalt)  #386641 (verdigris)
          #A44A3F (rust)    #4A3F6B (iris)    #C77D02 (amber)
          #2A6F6B (teal)    #6B2D5C (plum)    #8A8D3B (olive)
          #3D3B4F (slate)   #A6543A (sienna)  #5C4033 (walnut)
```

Font: serif display (Lora, Crimson) for headings, humanist sans (Source Sans)
for body.

Liquids render with a subtle vertical gradient and a meniscus curve at the top.
Glass gets a thin specular highlight down the left edge. Skip real refraction,
it costs frames and nobody notices.

Colorblind mode: each color gets a small repeating symbol embossed on the
segment (dot, stripe, cross, wave, triangle, grid).

---

## 10. Store listing

**Title:** Decant: Water Sort Puzzle (25 chars, under the 30 cap)
**Short:** Pour, sort, and settle. No timers, no pressure.

Long description angles to use:

- Offline, plays anywhere
- No ads during puzzles, only between levels
- No move limits, no forced timers
- Thousands of generated levels, daily puzzle

Keywords worth targeting: water sort, color sort, liquid sort, pour puzzle,
tube puzzle, offline puzzle, relaxing puzzle.

The genre is crowded. Your listing differentiator is the ad promise, because
incumbent reviews are dominated by ad complaints. Say it plainly in the first
two lines.

---

## 11. Day plan

| Day | Work                                                                  |
| --- | --------------------------------------------------------------------- |
| 1   | `WaterGenerator`, `WaterCore`, unit tests on legality and solvability |
| 2   | Skia board render, tube layout, tap handling, selection state         |
| 3   | Pour animation, difficulty ramp, generate and review 200 levels       |
| 4   | Juice pass, sound, haptics, completion sequence                       |
| 5   | Theme, colorblind mode, icon, screenshots, listing                    |
| 6   | QA on three devices, offline test, build, submit                      |

---

## 12. Risks

| Risk                                | Mitigation                                            |
| ----------------------------------- | ----------------------------------------------------- |
| Pour animation feels cheap          | Budget the full of day 3 for it, it is the whole game |
| Generated boards trivially easy     | Tune `isAcceptable`, review 200 by hand               |
| Genre saturation buries the listing | Long-tail keywords, ad-promise positioning            |
| Input queueing causes double pours  | Lock input during animation                           |

---

## 13. Done when

- [ ] 200 levels reviewed, all solvable, difficulty rises smoothly
- [ ] Pour animation passes the feel checklist
- [ ] Colorblind mode ships
- [ ] Offline works, save survives force-quit
- [ ] Analytics firing, ad stubs logging
- [ ] Under 40MB, targets API 36
