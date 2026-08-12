# 08 — Store listing

Everything both consoles ask for, written before either account exists so the
listing is not drafted in a text box at the moment of submitting.

Nothing here needs an account. Screenshots can be captured today, on simulators
this project already builds for.

**Character limits are from memory of the current console forms and should be
re-checked in the console itself** — both platforms move them. Every string
below is written short enough to have room.

---

## 1. Names

Fixed by `AGENTS.md` and by the bundle id, which cannot change after
publication.

| Field                       | Value                       | Limit |
| --------------------------- | --------------------------- | ----- |
| Play title                  | `Decant: Water Sort Puzzle` | 30    |
| App Store name              | `Decant: Water Sort Puzzle` | 30    |
| App Store subtitle          | `Pour, sort, unwind`        | 30    |
| Launcher name (`expo.name`) | `Decant`                    | —     |

**The name has never been checked for availability or trademark conflict.**
Do that before reserving either listing — the bundle id `com.decant.watersort`
is derived from it and is permanent.

---

## 2. Short description

Play only, 80 characters. It is the line under the icon in search results and
does more work than anything else here.

> Sort coloured liquid into matching vials. No timers, no fails. Just calm.

74 characters. The three sentences are deliberate: what you do, what the game
will not do to you, and the promise. The genre sells relaxation, so "no timers,
no fails" is the differentiator rather than a caveat.

Alternatives, if the first tests badly:

- `Pour, sort and match coloured liquids. A calm puzzle with no timer.`
- `Relaxing water sort puzzles. Take your time — there is no way to lose.`

---

## 3. Full description

Both stores, 4000 characters. This one is ~1400, which is deliberate: nobody
reads a wall, and the first two lines are all most people see before "more".

```text
Pour coloured liquid between glass vials until each one holds a single colour.
That is the whole game. No timer, no lives, no way to fail.

Decant is a water sort puzzle built for the ten minutes before sleep, or the
queue at the post office, or whenever you want something to do with your hands
that is not the news.

WHAT YOU DO
Tap a vial to lift it, tap another to pour. Liquid only moves onto its own
colour, or into empty space. Keep going until every vial is sorted.

TAKE YOUR TIME
There is no clock and no fail state. Undo any move. Restart whenever. A hint
will show you the next pour if a board stops making sense, and it is always the
shortest way home — never a detour that costs you stars.

THOUSANDS OF PUZZLES
Every level is generated and checked to be solvable before you ever see it.
Three difficulties, each with its own ladder:

- Gentle — room to breathe, always
- Classic — the curve most people want
- Fiendish — twelve colours and one spare vial

STARS WORTH EARNING
Levels are rated on how efficiently you solved them, not on a stopwatch. Three
stars means you played it well.

A NEW BREW EVERY DAY
One fresh puzzle daily, tuned to how far you have come. Come back for the
streak.

MADE WITH CARE
- Colourblind marks — every colour carries its own symbol
- Works completely offline
- No account, no sign-up, no login
- Your progress is saved on your device, not on a server

Free to play, supported by ads. Rewarded ads are always your choice — watch one
for a spare vial when you are stuck, or skip it and keep playing.
```

Two things that copy is careful about:

- **It does not promise a level count.** Levels are generated, so the number is
  effectively unbounded, and a specific figure in a listing is a promise that
  ages badly.
- **It says ads are how it is free, in the app's own voice.** A player who
  finds out from an interstitial rather than the listing leaves a one-star
  review about it.

---

## 4. Keywords

App Store only, 100 characters, comma-separated, no spaces after commas. Do not
repeat words already in the name or subtitle — Apple indexes those separately
and a repeat wastes the budget.

```text
water,sort,liquid,color,colour,vial,tube,relax,calm,offline,brain,logic,zen,sortpuzzle
```

85 characters. Both spellings of colour are there on purpose; they are separate
search terms.

Play has no keyword field. It indexes the descriptions, which is why the full
description above says "water sort puzzle" in plain words early.

---

## 5. Promotional text

App Store only, 170 characters, and the one field that can be changed **without
a review**. Use it for whatever is current.

> New: a daily brew that scales to your progress, and colourblind marks on
> every vial. Still no timers. Still no way to lose.

---

## 6. What's New

First release, so it has nowhere to point yet:

> First release. Thousands of generated puzzles, three difficulties, a daily
> brew, and no timer anywhere in sight.

After that, keep it specific. "Bug fixes and improvements" is what every
abandoned app says.

---

## 7. Screenshots

Capture from a release build so nothing carries a dev banner. `npm run ios:pad`
is the tablet layout, which cannot be checked by resizing a phone simulator.

**Verify the required device sizes in App Store Connect at submission time.**
Apple changes which sizes are mandatory, and `supportsTablet: true` is set here,
which makes iPad screenshots required rather than optional.

Play needs phone screenshots plus 7-inch and 10-inch tablet sets, minimum two
each, and a 1024×500 feature graphic.

Suggested order — the first two are what most people see:

| #   | Screen                       | Why it is here                          |
| --- | ---------------------------- | --------------------------------------- |
| 1   | Board, mid-pour              | The game, in motion, in one frame       |
| 2   | Board, nearly solved         | Shows the goal without needing words    |
| 3   | Stages grid                  | Signals volume — there is a lot of this |
| 4   | Complete screen, three stars | The reward loop                         |
| 5   | Daily brew                   | A reason to come back                   |
| 6   | Shop / skins                 | Progression worth playing toward        |
| 7   | Board with colourblind marks | The accessibility story, shown          |

Captions should say what the screen does, not name it. "No timer. No way to
lose." beats "Game Screen".

### Feature graphic brief

1024×500, Play only, shown at the top of the listing. It is cropped
aggressively on some surfaces, so nothing important goes near an edge.

Deep purple ground from the palette, three or four vials with the game's own
saturated liquids, warm lamp glow from the upper left, wordmark in gold. It
should look like the splash screen, because that is what someone sees one tap
later.

---

## 8. Console answers

Recorded so the two stores are answered the same way.

| Question              | Answer                                                 |
| --------------------- | ------------------------------------------------------ |
| Category              | **Game → Puzzle** — not App. OEM game modes read this  |
| Contains ads          | Yes                                                    |
| In-app purchases      | No, not at launch                                      |
| Target audience       | General. **Not** child-directed                        |
| Content rating (IARC) | Everyone / 3+. No violence, no chance, no user content |
| Data safety           | Advertising ID only — see `docs/07-privacy-policy.md`  |
| Privacy policy URL    | Required by both, because of AdMob                     |
| Support URL and email | Required. Must still work in two years                 |

**Play Console category is a separate setting from the manifest.** This project
already declares `android:appCategory="game"` and
`LSApplicationCategoryType`, but several Android skins classify from the store
category instead, so a listing filed under "App" undoes both.

---

## 9. Still missing

- The publisher's legal name and a support email
- The privacy policy URL, once hosted
- A support page or site to point at
- Whether the store listing name survives the trademark check
