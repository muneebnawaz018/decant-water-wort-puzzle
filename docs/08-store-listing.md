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
Do that before reserving either listing — the bundle id `com.walqalum.decant`
is derived from it and is permanent.

---

## 2. Short description

Play only, 80 characters. It is the line under the icon in search results and
does more work than anything else here.

> A calm water sort puzzle. Pour color liquid between vials. No timers, no fails.

79 characters. It leads with the genre because that is the query people type,
and closes on the differentiator — the genre sells relaxation, so "no timers,
no fails" is the promise rather than a caveat.

An earlier version read "Sort coloured liquid into matching vials. No timers, no
fails. Just calm." It was better prose and worse ASO: it never said "water sort
puzzle" at all, in the highest-weighted field after the title.

Alternatives, if the first tests badly:

- `Color water sort puzzle. Pour liquid into matching vials. No timers, no fails.`
- `Water sort puzzle — pour color liquid into vials. No timer, no fail, no stress.`

## 3. Full description

Both stores, 4000 characters. This one is ~2100 — long enough to index, short
enough that nobody hits a wall, and the first two lines are all most people see
before "more".

```text
Decant is a relaxing water sort puzzle. Pour colored liquid between glass vials
until each vial holds a single color. That is the whole game. No timer, no
lives, no way to fail.

A color sort puzzle built for the ten minutes before sleep, or the queue at the
post office, or whenever you want something to do with your hands that is not
the news.

HOW TO PLAY THE WATER SORT PUZZLE
Tap a vial to lift it, tap another to pour. Liquid only moves onto its own
color, or into empty space. Keep sorting until every vial holds one color and
the board is solved. Simple to learn, and the later boards will make you think.

TAKE YOUR TIME
There is no clock and no fail state in this puzzle. Undo any move. Restart
whenever. A hint will show you the next pour if a board stops making sense, and
it is always the shortest way home — never a detour that costs you stars.

THOUSANDS OF LIQUID SORT PUZZLES
Every level is generated and checked to be solvable before you ever see it, so
you will never be stuck on an impossible board. Three difficulty modes, each
with its own ladder of levels:

- Gentle — room to breathe, always
- Classic — the water sort curve most people want
- Fiendish — twelve colors and one spare vial

STARS WORTH EARNING
Levels are rated on how efficiently you solved the puzzle, not on a stopwatch.
Three stars means you played it well.

A NEW BREW EVERY DAY
One fresh daily puzzle, tuned to how far you have come. Come back for the
streak and earn coins.

A RELAXING PUZZLE GAME, MADE WITH CARE
- Colorblind marks — every color carries its own symbol
- Play offline anywhere, no internet needed
- No account, no sign-up, no login
- Your progress is saved on your device, not on a server
- Calm sound and gentle haptics you can switch off

WHY PLAYERS LIKE WATER SORT PUZZLES
Sorting colored water is a quiet kind of problem solving. There is nothing
chasing you, nothing to lose, and every board has an answer. It is a brain
puzzle you can play one-handed while your mind unwinds.

Free to play, supported by ads. Rewarded ads are always your choice — watch one
for a spare vial when you are stuck, or skip it and keep playing.

Download Decant and start sorting.
```

### It is written in American English, deliberately

`color`, not `colour`. `colorblind`, not `colourblind`. This is the one
editorial decision in the listing that is made against house style rather than
with it, and it is worth the note so nobody "fixes" it back.

Play does stemming, not cross-spelling normalization: `color` and `colour` are
separate index terms. The US spelling carries several times the search volume,
and `color sort puzzle` is one of the highest-volume queries in this genre. The
original draft spelled it the British way three times and the American way
never, so it competed for neither term well and for that query not at all.

**The app's own UI still says "Colourblind marks",** which is a visible
inconsistency between listing and product. Changing the label is a one-line
edit in `src/ui/chrome/SettingsDrawer.tsx`; the `colourblind` settings **key**
must not be renamed with it, since it is persisted in `settings.v3` and a
rename would silently reset the toggle for anyone who had it on.

### Two things this copy is careful about

- **It does not promise a level count.** Levels are generated, so the number is
  effectively unbounded, and a specific figure in a listing is a promise that
  ages badly.
- **It says ads are how it is free, in the app's own voice.** A player who
  finds out from an interstitial rather than the listing leaves a one-star
  review about it.

### And two lines it deliberately does not cross

- **No keyword stuffing.** Play's metadata policy rejects repetitive or
  irrelevant keywords and the enforcement is real. Every repetition above sits
  inside a sentence that says something; pushing `water sort` to fifteen
  mentions would put the listing at risk for a marginal ranking gain.
- **No invented genres.** "Ball sort" and "hoop sort" are adjacent high-volume
  queries and this game answers neither. Ranking for them buys installs that
  leave one-star reviews, which costs more than the installs are worth.

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

## 9. Settled, and still missing

Settled 19 Aug 2026:

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| Publisher          | Walqalum Games                                   |
| Support email      | `games.walqalum@gmail.com`                       |
| Website            | `https://decant-website-rho.vercel.app/`         |
| Privacy policy URL | `https://decant-website-rho.vercel.app/privacy/` |

The website is the game's own site, not `walqalum.com` — that one is the
company's and says nothing about this game, which is not what either store's
website field is asking for.

Still missing:

- `app-ads.txt`, which needs an AdMob publisher ID that does not exist yet. It
  goes in `decant-web`'s `public/`, served at the domain's root. **Do not ship
  a placeholder** — a file naming the wrong publisher is worse than a 404.
- Whether the store listing name survives the trademark check. Still unrun:
  USPTO classes 9 and 41, WIPO, EUIPO, IPO Pakistan.
- Phone screenshots. Two minimum, four or more for promotion eligibility, at
  1080px or wider, captured from a **release** build so no dev-client chrome is
  in frame. The icon and feature graphic are done and live in `store/`,
  generated by `script/make-store-graphics.py`.
- Tablet screenshots are **optional** on Play, despite `supportsTablet: true`
  — that flag is Apple's rule, and App Store Connect does make them mandatory.
  Play marks the tablet section without an asterisk. Worth adding later for
  tablet search placement, not a launch blocker.
