# Skins — design materials

The reference pack for the skin catalogue: what the genre's best-looking games
do visually, what Decant will do in its own identity, and every number the
implementation needs. Written from direct study of competitor store screenshots
(saved to the session scratchpad, not committed — they are their marketing
assets, our reference only) plus market research summarised in the appendix.

**The one rule above all of it, restated from `src/theme/skins.ts`:** a skin
never touches the liquid palette. Colours are pinned by accessibility tests —
ΔE separation between every pair, glyph contrast per fill — and no cosmetic is
allowed to trade against that. Everything below skins the _glass_, the _scene_,
or a hue-free _finish_.

---

## 1. What the study of competitors showed

Eight screenshots across five titles (IEC Water Sort, Woody Sort, Water Sort
Offline, Ball Sort Color Game, Get Color). Patterns, most useful first:

1. **Silhouette is the skin.** The games that sell "bottle sets" change the
   vessel dramatically — milk bottles with caps and straws, lava-lamp curves,
   cone-bottomed tubes. A recolour is invisible; a new outline reads from
   across the room.
2. **Glass is an outline, not a texture.** Every title draws the vessel as a
   light 2–3px stroke with a transparent interior — the backdrop shows through
   empty glass. Decant already does exactly this. Premium treatments add a rim
   ellipse at the mouth and a vertical edge highlight, not opacity.
3. **The scene is half the skin.** The best-looking boards put a vertical
   gradient sky behind the rack and a dark silhouette landscape strip along
   the bottom (IEC's castle, Get Color's mountains), with drifting particles.
   Decant's backdrop already has the gradient and the motes; the silhouette
   strip is the missing element, and it is what makes a "set" feel like a
   place rather than a wallpaper.
4. **The premium liquid finish is glitter, not colour.** Water Sort Offline's
   richest-looking board scatters tiny sparkles _inside_ the liquid — hue
   untouched, pure white twinkle overlay. That is a premium marker this
   project can adopt without touching a single accessibility guarantee, and it
   is the best single finding in the pack.
5. **Woody Sort's richness is framing.** Seasonal garlands around the board,
   glass with feet and stands, a golden glow burst on a completed tube. The
   glow celebration Decant already has; the takeaway is that _seasonal_ reads
   as decoration layers, not as new geometry.
6. **Flat liquid everywhere.** No shipped game gradients its liquid. Decant's
   cartoon-flat rule matches the entire genre.

## 2. The catalogue

Seven skins, three tiers. Free ones unlock by progression (the genre's
retention pattern); paid ones are the coin sink the economy audit called for.
No per-skin real-money purchase — the genre has no precedent for one; the
eventual money SKU is a single "unlock everything" bundle when the store SDK
lands (phase 2).

| #   | Skin              | Tier              | Unlock          | Vessel geometry (`shoulder/base/mouth/neck`) |
| --- | ----------------- | ----------------- | --------------- | -------------------------------------------- |
| 1   | Apothecary vial   | default           | ships equipped  | `0 / 0.5 / 1 / 0` (existing)                 |
| 2   | Lab beaker        | free, earned      | reach level 50  | `0.3 / 0.12 / 1 / 0`                         |
| 3   | Round flask       | free, earned      | reach level 150 | `0.16 / 0.5 / 0.5 / 0.12`                    |
| 4   | Potion bottle     | free, earned      | reach level 300 | `0.45 / 0.5 / 0.55 / 0.16`                   |
| 5   | Sealed ampoule    | paid, 1,500 coins | shop            | `0.5 / 0.5 / 0.42 / 0.2`                     |
| 6   | Gilded alembic    | paid, 3,000 coins | shop            | `0.2 / 0.5 / 0.5 / 0.14` + gold glass        |
| 7   | The Nightfall Set | paid, 6,000 coins | shop            | `0.35 / 0.4 / 0.6 / 0.22` + scene + sparkle  |

Geometry notes:

- Beaker and flask are the shapes the shop originally shipped, recovered from
  git history. The ampoule's mouth is widened from its historical `0.34` to
  `0.42`: tubes render **29dp wide on a 13-tube board**, and at `0.34` the
  mouth collapsed to a ~10dp sliver exactly where long-term players live. Any
  future skin obeys the same rule — **`mouth ≥ 0.42`, and every candidate is
  eyeballed at 29dp before it ships.**
- Prices are quoted here for context but **live in `SKIN_PRICES` in
  `src/game/economy.ts`**, the only file allowed to hold a coin figure. At the
  rebalanced ~300/day engaged income they sit a few days, a week and a few
  weeks out — the ladder the original shop was priced around, rescaled.
- Level unlocks read the player's furthest level across modes (same source the
  daily brew uses). An unlocked skin toasts once, on the level that unlocked
  it — a reward nobody notices is not a reward.

## 3. Glass treatment — the `Skin` extension

Two new optional fields on `Skin`, both defaulted so existing skins are
untouched:

```ts
interface GlassSpec {
  /** Stroke colour, a `colours` name. Default: white. */
  stroke?: string;
  /** Resting stroke opacity. Default 0.32, the shipped look. */
  strokeOpacity?: number;
  /** Highlight stripe colour. Default: white at 0.5. */
  highlight?: string;
}
```

The gilded alembic sets `stroke: gold, strokeOpacity: 0.85, highlight:
goldPale`. Selection and hint strokes keep their existing colours on every
skin — those are game signals, not decoration, and a skin that repainted them
would trade legibility for looks.

## 4. The liquid finish — sparkle without colour

A per-skin `finish: 'plain' | 'sparkle'`. Sparkle scatters 3–4 tiny white
points per segment (`glyphOn`-style contrast handling is unnecessary — white
at 0.35–0.55 opacity reads on every fill in the palette because it is a
point, not a glyph). Points twinkle by phasing their opacity off the
backdrop's existing clock — one shared value, no new subscriptions, honouring
the one-reaction-per-element rule.

Positions are hashed per tube and segment index (the pour animation's
deterministic-hash pattern), so a board renders identically every time and
nothing allocates per frame. Static points go in the tube's recorded picture;
only opacity animates.

This is the Nightfall Set's liquid. It changes no hue, so
`colors.test.ts` needs no new exemption — but a test should still pin that
`finish` never reaches the palette.

## 5. The scene — what makes the top skin a _set_

`Backdrop` grows an optional `scene` prop (default: today's exact look):

```ts
interface Scene {
  /** Ground gradient stops, replacing the default pair. */
  ground: [string, string];
  /** Mote colour. Default: the warm lamp motes. */
  mote?: string;
  /** A silhouette strip along the bottom, drawn once, behind the rack. */
  silhouette?: 'skyline' | null;
}
```

The Nightfall Set: deeper indigo ground ramp, cool blue-white motes
(slower, star-like), and a silhouette strip — **an apothecary skyline**:
rooftops, a retort, a crooked chimney, drawn as one Skia path in our own
identity (competitors use castles and mountains; we are not copying either).
The silhouette is static art on an animated canvas, so it goes in the
gradient's own once-rasterised layer, per the render rules in `AGENTS.md`.

Every scene's ground colours must keep the liquid-vs-background guarantee:
extend `colors.test.ts` so the ΔE > 40 check runs against **every** scene
ground, not just `colours.night`. A scene that fails the check does not ship.

## 6. Motion

- **Shop preview:** paid cards get a single gold shimmer sweep on mount
  (350ms, Reanimated, UI thread) — the genre's "premium" cue, used once, not
  looped. Free cards stay still.
- **Equip:** the board already rebuilds vessel paths when `skin` changes; add
  a 250ms crossfade on the preview so equipping feels like a change of glass
  rather than a redraw.
- **No Lottie for any of this.** Board and shop are Skia; the Lottie pipeline
  stays where it is (the win screen). Competitor "animated backgrounds" are
  matched by the mote layer we already run.

## 7. Build order

1. **Shapes + unlocks** — pure data plus an unlock check: skins 2–5, prices
   into `economy.ts`, shop shows locked-with-level rows. Smallest slice that
   makes the shop real.
2. **Glass treatment** — `GlassSpec`, the gilded alembic.
3. **Finish + scene** — sparkle, `Backdrop.scene`, the Nightfall Set, the
   extended contrast test.
4. **Seasonal sets later** — the `Scene` machinery is what makes a
   Halloween/winter set a data entry rather than a project.

Storage note for every step: skin ids are save format (`skins.test.ts` pins
them). New ids append; nothing renames. `economyStore.owned` records
purchases; level-unlocked skins are _not_ written to `owned` — they derive
from progress, so a fresh device with restored progress keeps them without a
migration.

---

## Appendix: market research summary (Aug 2026)

- Genre skins vessel shape and backgrounds; **no shipped title skins liquid
  colour**. Unlocks: coins, level milestones, quests, rewarded ads.
- Per-skin real-money SKUs effectively do not exist; cosmetic money appears
  only as "Unlock All" bundles or VIP subscriptions. The subgenre's top
  grosser sells no cosmetics at all — skins are a coin sink and retention
  layer, and the genre's loudest complaint is coins with nothing to buy.
- Collections and seasonal sets are the shipped pattern, and the one on-topic
  player review asks for "more seasonal ones".
- Sources: App Store / Play listings and reviews for IEC Water Sort Puzzle,
  Woody Sort, SortPuz, Tatem Ball Sort, Water Sort Offline, Ball Sort Color
  Game; Maf.ad and Gamigion analyses of Hexa Sort; Deconstructor of Fun on
  the sort-puzzle subgenre.
