#!/usr/bin/env python3
"""Generate `assets/lottie/gleam.json` — the glint that crosses a gold button.

What it is for
--------------
`badge.json`'s treatment, moved onto the app's primary buttons: Home's Play, the
win card's `Level N`, and any dialog's confirm. Same idea, same reason — gold in
this app means *reward* or *press me*, and gold that sits perfectly still reads as
neither.

Why this is not `badge.json` with a different box
-------------------------------------------------
**A square composition cannot be stretched onto a button.** `resizeMode` fits a
frame into whatever it is given, and Home's Play button is roughly 300x60 against
the badge's 100x100. `cover` scales by the long side, so a 3x blow-up would leave
only the middle fifth of the badge visible — its sparkles sit at y=22 and y=78 and
would both be outside the button entirely, and the sweep would arrive three times
too wide.

So the frame is wide to begin with, and the sparkles are spread along it rather
than parked in corners. A wide frame also degrades gracefully in the other
direction: dropped into a 140x40 dialog button, `cover` scales by height and trims
the ends, which costs a sparkle rather than the whole composition.

**It needs no mask.** `GlossButton`'s `styles.face` already carries
`borderRadius` and `overflow: 'hidden'`, so the button clips the sweep. Same trick
as `make-shine.py` and `make-badge.py`, and the same reason: masks and track
mattes are where the three Lottie renderers stop agreeing.

Run it after changing any colour it reads. The JSON is written minified and the
commit gate checks formatting, so `npm run format` is the second half of the
command, not an optional tidy-up:

    python3 script/make-gleam.py && npm run format

See `script/lottie_kit.py` for the schema rules every generator here follows.
"""

import json
import pathlib

from lottie_kit import (
    composition,
    fill,
    group,
    keyed,
    overshoot,
    rounded_rect,
    shape_layer,
    smoothstep,
    star,
    transform,
)

# --- The animation's own frame ----------------------------------------------

FPS = 60
# 3.4 seconds, and none of Home's other marks divide into it — 102, 120, 156, 180
# and 204 share no useful factor, so nothing on the screen ever falls into step.
# A screen pulsing in time reads as a loading state.
#
# The longest cycle of the five on purpose: this is the largest object of them,
# and a big surface glinting as often as a 20dp chip is a surface that flickers.
DURATION = 204
STEP = 2

WIDTH = 300
HEIGHT = 64
MIDDLE = HEIGHT / 2

SWEEP_START = 0.04
SWEEP_LENGTH = 0.26
# A second, fainter pass later in the loop — the same two-glint rhythm
# `make-badge.py` settled on after a breathing bloom showed its own circular edge
# on a square tile.
ECHO_START = 0.50
ECHO_LENGTH = 0.30

# --- The sweep ---------------------------------------------------------------

# Tall enough to cross a tilted button corner to corner, and let the button's own
# rounded corner do the cutting.
BAND_H = 150
BAND_W = 26
TRAIL_W = 10
TRAIL_GAP = 22
BAND_TILT = 24
START_X = -60
END_X = WIDTH + 60

# --- The sparkles ------------------------------------------------------------
#
# Spread along the frame and kept off its vertical centre line, which is where
# the label sits. A sparkle behind a word is a smudge on the word.

SPARK_SPOTS = [(48, 17), (112, 47), (196, 16), (256, 46)]
SPARK_OUTER = 13
SPARK_INNER = 4

# --- The palette -------------------------------------------------------------
#
# From `src/theme/colors.ts`. The face is a gold gradient, so the mark is white:
# a highlight is the light source's colour, not the surface's, and a gold sheen on
# gold goes muddy — the finding `make-shine.py` records for the green disc and
# `make-badge.py` repeats for the gold tile.

WHITE = "#FFFFFF"


def windowed(fn, start: float, length: float, step: int = STEP):
    """Sample only where the part moves, holding flat outside — see
    `make-advert.py`, where this earned its keep by cutting a file to a third."""
    first = max(0, int(start * DURATION) - 1)
    last = min(DURATION, int((start + length) * DURATION) + 2)
    frames = {0: fn(0.0), DURATION: fn(1.0)}
    for f in range(first, last + 1, step):
        frames[f] = fn(f / DURATION)
    return keyed(sorted(frames.items()))


def since(t: float, start: float, length: float) -> float:
    return max(0.0, min(1.0, (t - start) / length))


def sweep(index: int, start: float, length: float, strength: float) -> dict:
    """A wide band with a narrow one trailing it, crossing the face.

    Parked outside the frame for the rest of the cycle rather than faded out.
    That is the whole pause mechanism: no opacity keys, nothing to interpolate,
    just a shape the button is already clipping away.
    """

    def across(t: float):
        k = since(t, start, length)
        return [round(START_X + (END_X - START_X) * smoothstep(k), 2), MIDDLE, 0]

    return shape_layer(
        1 + index * 6,
        f"sweep{index}",
        [
            group([rounded_rect((BAND_W, BAND_H), BAND_W / 2), fill(WHITE, 0.42 * strength)]),
            group(
                [
                    rounded_rect((TRAIL_W, BAND_H), TRAIL_W / 2, (-TRAIL_GAP, 0)),
                    fill(WHITE, 0.26 * strength),
                ]
            ),
        ],
        transform(windowed(across, start, length), rotation=BAND_TILT),
        DURATION,
    )


def sparkle(index: int) -> dict:
    """A four-point star, popping in the sweep's wake.

    Timed *behind* the band rather than with it — the sweep is the light passing
    over, and these are what it catches. Staggered left to right so the four
    follow it across rather than firing together, and each holds its own angle so
    they do not read as one shape repeated.
    """
    spot = SPARK_SPOTS[index]
    # Keyed off where it sits, so a sparkle always lights just after the band has
    # reached it. Moving a spot moves its timing with it.
    start = SWEEP_START + 0.02 + (spot[0] / WIDTH) * SWEEP_LENGTH
    length = 0.26
    tilt = index * 27

    def size(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0, 0, 100]
        # Up fast past full, then away. `overshoot` on the way in is what makes a
        # sparkle read as a spark rather than as a dot being faded up.
        grow = overshoot(min(1.0, k * 2.6)) if k < 0.38 else 1 - smoothstep((k - 0.38) / 0.62)
        return [round(100 * grow, 2), round(100 * grow, 2), 100]

    def spin(t: float):
        return [round(tilt + 32 * since(t, start, length), 2)]

    def alpha(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0]
        return [round(88 * min(1.0, k * 6) * (1 - k) ** 0.6, 1)]

    return shape_layer(
        2 + index,
        f"sparkle{index}",
        [group([star(4, SPARK_OUTER, SPARK_INNER), fill(WHITE)])],
        transform(
            [spot[0], spot[1], 0],
            rotation=windowed(spin, start, length),
            opacity=windowed(alpha, start, length),
            scale=windowed(size, start, length),
        ),
        DURATION,
    )


def build() -> dict:
    return composition(
        "gleam",
        WIDTH,
        HEIGHT,
        FPS,
        DURATION,
        [
            sweep(0, SWEEP_START, SWEEP_LENGTH, 1.0),
            *[sparkle(i) for i in range(len(SPARK_SPOTS))],
            sweep(1, ECHO_START, ECHO_LENGTH, 0.55),
        ],
    )


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "gleam.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
