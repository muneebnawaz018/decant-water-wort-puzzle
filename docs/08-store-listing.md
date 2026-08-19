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

| Field                       | Value                        | Limit |
| --------------------------- | ---------------------------- | ----- |
| Play title                  | `Decant: Water Sort Puzzle`  | 30    |
| App Store name              | `Decant: Water Sort Puzzle`  | 30    |
| App Store subtitle          | `Relaxing color sort puzzle` | 30    |
| Launcher name (`expo.name`) | `Decant`                     | —     |

**The title stays at 25 of 30 characters, deliberately.** Appending `Game` to
reach the cap was considered and rejected: Play shows roughly 20-25 characters
of a title in phone search results, so the extra word indexes but is never
read, and `game` is the weakest available modifier in a store where `puzzle`
and `puzzle game` return near-identical results. Free characters in the
strongest field are only worth taking if the word pulls its weight.

The name has been checked for store availability (see `docs/11-deployment-steps.md`
stage 0) but **not for trademark conflict** — USPTO classes 9 and 41, WIPO,
EUIPO and IPO Pakistan are all still unrun. The bundle id `com.walqalum.decant`
is derived from the name and is permanent once published.

**A same-genre competitor holds the bare name.** `Decant: Color Sort Puzzle`
(com.stackforgestudios.decant, JMB Assets LLC) shipped the day before the check
was run. Nothing blocks this listing — different bundle id, different title —
but it has an ASO consequence worth stating plainly: nobody searches "Decant"
for this game, and the few who do now find two. **Discovery is therefore
entirely generic-keyword driven**, which is why every field below is written
for search rather than for brand.

---

## 2. Short description

Play only, 80 characters. It is the line under the icon in search results and
does more work than anything else here.

> A calm water sort puzzle. Pour color liquid between vials. No timers, no fails.

79 characters. It leads with the genre because that is the query people type,
and closes on the differentiator — the genre sells relaxation, so "no timers,
no fails" is the promise rather than a caveat.

An earlier version read "Sort colored liquid into matching vials. No timers, no
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

### American English, everywhere, and it started here

The listing is written in American English, and the decision spread from it to
the app, the marketing site and these docs. `color`, never the British form;
`colorblind`, likewise.

**It is an ASO decision, not a style one.** Play does stemming, not
cross-spelling normalization, so the two spellings are separate index terms.
The US form carries several times the search volume, and `color sort puzzle` is
one of the highest-volume queries in this genre. The original draft used the
British spelling three times and the American never — competing for neither
term well, and for that query not at all.

Once the listing said one thing and the app said another, the split was worth
closing rather than living with: the settings drawer read "Colourblind marks"
while the store page promised colorblind support. So the rename went through
everything — `src/`, `script/`, `modules/`, the config, the marketing site, and
this documentation. `ColourMark.tsx` became `ColorMark.tsx`; the local eslint
rule `local/no-raw-colour` became `local/no-raw-color`.

**One spelling survived on purpose, and it is load-bearing.** The settings
field was `colourblind`, and a field name _is_ the serialised key. Renaming it
alone would read as a missing field on every existing install and silently
switch the marks off for anyone who had them on — an accessibility feature
disappearing on update, with nothing erroring and only the affected player
noticing. So `load()` in `src/state/settingsStore.ts` reads
`stored.colorblind ?? stored.colourblind`, additive against the same
`settings.v3` key. It can be dropped once no device still holds a record
written by a pre-rename build.

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

App Store only, 100 characters, comma-separated, no spaces after commas.

```text
liquid,vial,tube,pour,match,relax,calm,zen,offline,brain,logic,mind,hue,tricky,unwind,easy
```

90 characters. Three rules decided it, and the previous version broke all
three:

- **Nothing already in the name or subtitle.** Apple indexes those separately,
  so `water`, `sort` and `puzzle` are covered by `Decant: Water Sort Puzzle`
  and `color` by the subtitle. Repeating them is dead weight — the old set
  spent 15 characters on `water,sort` alone.
- **One spelling.** `color` was in the old set beside `color`; its US volume
  is negligible and the field is too small to hedge.
- **Single words only.** Apple permutes keywords into phrases itself, so a
  hand-concatenated `sortpuzzle` — also in the old set — buys nothing that
  `sort` and `puzzle` did not already.

Play has no keyword field. It indexes the title and both descriptions, which is
why the full description says "water sort puzzle" in plain words in its first
line.

### Play tags — a separate surface from search

`Grow -> Store presence -> Store settings -> Tags`. Up to five, from a fixed
vocabulary Google supplies; they drive category browse and "similar games"
placement, which search does not touch.

Set: **Brain teaser, Casual, Logic puzzle, Puzzle**. Four of five, and the
fifth is left empty unless something genuinely fits — a wrong tag places the
game in browse surfaces where it converts badly, which is worse than an empty
slot.

## 5. Promotional text

App Store only, 170 characters, and the one field that can be changed **without
a review**. Use it for whatever is current.

> New: a daily brew that scales to your progress, and colorblind marks on
> every vial. Still no timers. Still no way to lose.

It does **not** index, so do not spend it on keywords — it is the one field
that changes without a review, which makes it the place for whatever is
current.

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
| 7   | Board with colorblind marks  | The accessibility story, shown          |

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

## 9. ASO, and what is actually filed

The two stores are optimized differently and the difference is structural, not
stylistic: **Apple has a keyword field and Play does not**, so Play's keywords
have to live inside prose a human will read, while Apple's sit in a field
nobody sees. Writing one set of copy for both is how a listing ends up mediocre
at each.

### Filed on Play

| Field             | Value                                       |
| ----------------- | ------------------------------------------- |
| Title             | `Decant: Water Sort Puzzle` (25/30, see §1) |
| Short description | §2, 79/80                                   |
| Full description  | §3, ~2180/4000                              |
| Tags              | Brain teaser, Casual, Logic puzzle, Puzzle  |
| Category          | Game -> Puzzle                              |

### To file on the App Store, when that account exists

| Field            | Value                                |
| ---------------- | ------------------------------------ |
| Name             | `Decant: Water Sort Puzzle` (25/30)  |
| Subtitle         | `Relaxing color sort puzzle` (26/30) |
| Keywords         | §4, 90/100                           |
| Promotional text | §5                                   |
| Description      | §3, the same copy                    |

The subtitle changed from `Pour, sort, unwind`, which was brand voice in a
field Apple indexes nearly as heavily as the name. Three low-volume words and
twelve characters unused.

### American English is an ASO decision, not a style one

See §3. It also governs the **app itself** and the **marketing site**, both of
which were converted in the same piece of work — the app's toggle now reads
`Colorblind marks` and its how-to-play text says `color`. Two rules came out of
that and both matter:

- **The `colorblind` settings key was not renamed.** It is persisted in
  `settings.v3`; renaming it reads as a missing field on every existing install
  and silently switches the accessibility feature off for anyone who had it on.
  Labels are user-visible, keys are save format.
- **Code, tests and comments stay British.** `colors.ts`, `ColorMark.tsx`,
  the `color vision` test. None of it ships to a player. The split is: **what
  a player reads is American, what a developer reads is British.**

### What text cannot do

Copy is roughly a third of Play's ranking. The rest is install velocity, D1/D7
retention, rating, listing conversion rate and crash/ANR rate — all zero or
unknown before launch. A perfect listing can rank nowhere for a month and
nothing is wrong.

**The highest-leverage asset left is the first two screenshots**, because they
drive conversion rate and conversion rate feeds ranking directly. They are
worth more attention than any remaining word in this file.

### The numbers behind the keyword picks are not measured

The term choices here come from genre knowledge, not from a volume tool.
"`water sort` outranks `color sort` in volume" is a belief, not a figure anyone
checked. AppTweak, Sensor Tower and App Radar all have free tiers that would
settle it in an hour, and that hour is worth spending before the App Store
keyword field is filled — it is the one field where a wrong guess is invisible
and costs the whole slot.

## 10. Settled, and still missing

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
