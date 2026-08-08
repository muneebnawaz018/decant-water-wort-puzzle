# Lottie animations

Vector animations authored in After Effects and exported as JSON. Played by
`lottie-react-native`, which is a **native module** — adding or upgrading it
needs `npm run prebuild` and a fresh `npm run ios` / `npm run android`. A Metro
reload will not pick it up.

## Files

| File            | Where it plays                      | Notes                    |
| --------------- | ----------------------------------- | ------------------------ |
| `win.json`      | The win card, and the reward dialog | Generated — see below.   |
| `tap.json`      | Press burst, on dark buttons        | Placeholder.             |
| `tap-dark.json` | The same, on lit gold faces         | Placeholder.             |
| `clock.json`    | Daily's countdown button            | LottieFiles, recoloured. |

`clock.json` came from LottieFiles as a black-and-white dial and was recoloured
to the palette before being committed — gold edge and ticks, pale gold hands, a
dark face. The recolour is baked into the file rather than applied at runtime
through `colorFilters`, which matches layers by name and is not equally
supported on both platforms.

`win.json` is **generated**, not authored: run `python3 script/make-lottie.py`
to rebuild it, and commit both the script and the JSON. It draws 46 confetti
scraps on ballistic arcs plus a gold ring pushing out of the centre, in the
palette's own colours.

It replaced a hand-written stand-in — three gold dots that expanded and faded —
which existed so the integration compiled, not because it looked like anything.
On a device the reward dialog read as a plain modal, because it was one.

Generated for the same reason the app icons and the splash are: a committed
binary nobody can regenerate drifts from the palette the moment a colour moves.
The seed is fixed, so a rerun is byte-identical and a regenerated file is not a
diff nobody can review. Confetti is also the one celebration shape that survives
being generated — many simple pieces under one physical rule, so it is
arithmetic rather than draughtsmanship. A drawn flourish would still need a
hand, and a real export can still be dropped over this.

## Before you commit a downloaded file

**Check its licence individually.** LottieFiles' free section mixes several:

- **Lottie Simple License** — commercial use, no attribution. What you want.
- **CC-BY** — usable, but you owe a credit somewhere in the app.
- **Preview only** — part of a paid pack. Not usable.

The licence is on each animation's own page, not on the site as a whole. This
is the same trap the audio work fell into: "free to download" is not "free to
ship".

## Fitting one to this app

Most free confetti and star animations are bright flat cartoon drawn for a white
background. This app is deep purple and gold, so a file that looks superb in the
preview can land on the win card looking borrowed.

Two things help:

- Prefer animations that are mostly white or monochrome. `LottieView` takes a
  `colorFilters` prop, so a single-colour animation can be tinted from
  `src/theme/colors.ts` rather than fighting the palette.
- Judge it on the card, not in the preview. The scrim, the gold buttons and the
  panel gloss are all competing for the same attention.

## Keep them one-shot

`loop={false}`. A looping animation on a mounted screen redraws forever, which
is the cost this project has already paid once on Home's rack — see the
`createPicture` note in `AGENTS.md`.
