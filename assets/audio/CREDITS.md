# Audio credits and licences

Every shipped sound and where it came from. **A file with no entry here does not
ship** — a licence nobody can produce is a licence the app does not have, and an
audio asset is the one thing in this repo that is not ours by default.

The `.wav` and `.m4a` files beside this one are generated, not edited: drop a
source recording in `source/` and run `python3 script/prepare-sounds.py`, which
cuts the `.wav` master and encodes the `.m4a` the app ships in one step.

**Everything is committed, including `source/`.** Three tiers, and only one of
them ships:

| Tier           | What it is                               | In the app?          |
| -------------- | ---------------------------------------- | -------------------- |
| `source/*.wav` | The original takes, uncut                | No                   |
| `*.wav`        | Cut, levelled masters                    | No                   |
| `*.m4a`        | AAC, decoded natively on iOS and Android | **Yes — these only** |

The sources used to be gitignored and are not any more. They are CC0 files
from third-party sites, and "download them again" stops being a plan the first
time a link rots or a pack is re-uploaded with different mastering — at which
point no cue can be re-levelled and no marimba arrangement re-voiced. 1.7MB in
git buys a rebuild of the entire audio layer from one command. It costs the
app nothing: Metro bundles only what `src/audio/sounds.ts` requires, which was
verified against a production export — six `.m4a`, no `.wav`.

## Shipped one-shots

| File           | Source                                            | Licence | Attribution  |
| -------------- | ------------------------------------------------- | ------- | ------------ |
| `tap.wav`      | Kenney — Interface Sounds (`glass_002`)           | CC0 1.0 | not required |
| `click.wav`    | Kenney — Interface Sounds (`click_002`)           | CC0 1.0 | not required |
| `pour.wav`     | Freesound — "Water pouring into glass", carroll27 | CC0 1.0 | not required |
| `complete.wav` | VSCO 2 CE marimba, arranged (see below)           | CC0 1.0 | not required |
| `level.wav`    | VSCO 2 CE marimba, arranged (see below)           | CC0 1.0 | not required |
| `illegal.wav`  | VSCO 2 CE marimba, arranged (see below)           | CC0 1.0 | not required |

### Kenney (kenney.nl)

Creative Commons Zero (CC0 1.0), quoting the pack's own `License.txt`: "This
content is free to use in personal, educational and commercial projects.
Support us by crediting Kenney or <https://kenney.nl> (this is not mandatory)."

Credited here anyway. CC0 asks nothing, and a one-line thank-you to whoever made
a commercial release possible for nothing costs a row in a table.

Pack used: Interface Sounds, from `kenney.nl/assets/interface-sounds` — two
cues, split on purpose. `tap` is `glass_002`, the board's own tick, because
vials are glass; `click` is `click_002`, a 12ms UI click for every chrome
button, so the menus do not sound like the game. Both sit under the "Taps &
buttons" toggle. Impact Sounds and Digital Audio were used for `complete` and
`level` and are no longer shipped — see the marimba section for why.

### Versilian Studios Chamber Orchestra 2: Community Edition

CC0 1.0, by sgossner — a 3,000-sample public-domain orchestral library. Two
marimba one-shots are used, both recorded in a large auditorium in Durham CT
with a spaced pair of Rode NT1-As, played by Justin B. Belanger:

| Note       | Freesound                                      |
| ---------- | ---------------------------------------------- |
| C5 (523Hz) | `freesound.org/people/sgossner/sounds/373580/` |
| C3 (131Hz) | `freesound.org/people/sgossner/sounds/373579/` |

`ARRANGEMENTS` in `script/prepare-sounds.py` plays them: a rising fifth for a
finished vial, a major arpeggio to the octave for a solved board, and a low
falling fifth — damped above 900Hz — for a refused pour. Pitches other than the
two recorded ones are resampled from these, which moves pitch and length
together the way a struck bar really does ring shorter the higher it is played.

**Why these replaced Kenney's `complete` and `level`.** Those were a struck
bell and a chiptune cue, and the chiptune one landed exactly where its era
did: it was described on hearing it as "some Nokia mobile msg ring". A digital
arpeggio is the sound of a 1999 feature phone. Modern casual games reach for
tuned acoustic percussion instead — marimba, kalimba, glass — because a wooden
bar has a soft attack, warm overtones and a decay that gets out of the way.

**This is arrangement, not synthesis**, and the distinction is the one
`AGENTS.md` insists on. A chime for finishing a vial cannot be recorded, since
no object in the world makes the sound of a puzzle going right — so the notes
are chosen here, but every sample is a real bar struck by a real player. The
audio layer that was built and deleted failed because sine waves and filtered
noise do not sound like anything; a marimba recording sounds like a marimba.

The three now share one instrument, which is the part that makes a sound set
feel designed rather than assembled: the refusal is the same voice as the
reward, an octave down and dampened, so it reads as part of the game rather
than as an error arriving from somewhere else.

### Freesound — "Water pouring into glass" by carroll27

CC0 1.0, from `freesound.org/people/carroll27/sounds/151895/` — water poured
into a 12oz glass **that already holds water**, which is what a pour into a
part-filled vial is. The shipped cut is the busiest 1.35s of the take, found by
the script's energy window.

Two sources were rejected getting here, and both failures are worth recording
because they are about the sound's _subject_, not its quality:

- A 0.23s bubble glug (OpenGameArt, `bubble_02` from "40 CC0 water / splash /
  slime SFX") could not cover the animation once the pour grew to 1850ms. A
  single glug against a second of visible stream reads as a blip, not a pour.
- A bottle-neck pour (Freesound 817350, Frontmusic) covered the time but
  **sounded like someone drinking** — the deep periodic blub of a narrow neck
  glugging is the same sound a throat makes. Water landing in water has no
  neck resonance and no periodicity, so it cannot be mistaken for swallowing.

The rule that picked the original bubble still governs: **§7 pitches the pour
by how full the destination is, and pitch is only audible on a source that has
some.** This take measures 77% of its energy below 2kHz — enough tone for the
rise as a vial fills to be heard, without the broadband hiss of a splash that
sounds identical at every pitch.

## The ladder

The set is deliberately unequal in both level and brightness, because a player
should be able to tell from sound alone whether what just happened mattered.
Measured on the shipped files:

| Cue        | Length | Centre pitch | Brightness | What it is               |
| ---------- | ------ | ------------ | ---------- | ------------------------ |
| `illegal`  | 0.60s  | 197Hz        | 644Hz      | refusal, damped, dark    |
| `click`    | 0.01s  | 1120Hz       | 1494Hz     | any button in the chrome |
| `tap`      | 0.09s  | 1978Hz       | 1935Hz     | glass, touching a vial   |
| `pour`     | 1.35s  | 839Hz        | 3941Hz     | water into water         |
| `complete` | 1.10s  | 525Hz        | 2314Hz     | rising fifth             |
| `level`    | 1.75s  | 262Hz        | 3726Hz     | arpeggio to a rung chord |

Two relationships in there are load-bearing rather than incidental. The refusal
is the darkest and quietest thing in the game, four times lower than the tap —
a refused pour is a mis-tap, not a mistake, and §7 asks for a shrug. And the
two rewards climb: the vial chime is bright, the solved board brighter and
longer, so finishing a level cannot be mistaken for finishing a vial.

Runtime loudness is a separate dial — `VOLUME` in `src/audio/sounds.ts` scales
every cue together, so this ladder survives any change to how loud the game is.
Peaks here stay at the ceiling on purpose: a quiet master throws away
resolution and cannot be raised later without re-encoding.

**Nobody had heard the first set in the game**, and playing it found what
measurement could not: the pour sounded like drinking, and the fanfare like a
Nokia message tone. Both notes are recorded above with what replaced them. The
current set has been played, but only on a simulator — check `complete` and
`level` on a real phone speaker, which is where a bright chime is most likely
to turn shrill.
