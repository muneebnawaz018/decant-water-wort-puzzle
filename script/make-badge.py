#!/usr/bin/env python3
"""Generate `assets/lottie/badge.json` — what plays behind Home's level number.

What it is for
--------------
The gold tile at the left of the Continue card, holding the level number. It is
the brightest object on the screen and it was the only bright object doing
nothing, which reads oddly: everything gold in this app is either a reward or a
button, and this is neither until the card is pressed.

So it glints. A highlight sweeps the tile corner to corner, four sparkles pop in
its wake, and a fainter second pass crosses in the back half of the loop.

**It goes behind the number, not over it.** The number is the information; the
mark is atmosphere. `HomeScreen` renders it under the `Text`, and everything here
is sized to leave the middle of the tile alone — the sparkles sit in the corners
and the sweep is a band, not a wash.

**It needs no mask.** `styles.badge` already carries `borderRadius` and
`overflow: 'hidden'`, for its own gradient, so the tile clips the sweep. Same
trick as `make-shine.py`, and the same reason: masks and track mattes are where
the three Lottie renderers stop agreeing.

Run it after changing any colour it reads. The JSON is written minified and the
commit gate checks formatting, so `npm run format` is the second half of the
command, not an optional tidy-up:

    python3 script/make-badge.py && npm run format

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
# 2.6 seconds, and none of the other marks on Home divide into it — 102, 120, 156
# and 180 frames share no useful factor, so the four never fall into step. A home
# screen pulsing in time reads as a loading state.
DURATION = 156
STEP = 2

SIZE = 100
CENTRE = SIZE / 2

SWEEP_START = 0.06
SWEEP_LENGTH = 0.26
# A second, fainter pass in the back half of the loop.
#
# It replaced a breathing bloom — a soft white disc under everything, which is a
# standard way to keep a mark alive and is wrong here for a reason worth
# recording: **a circle on a square tile shows its own edge.** At any opacity
# strong enough to notice, what you saw was not a glow but a disc, and enlarging
# it past the corners just made the whole tile uniformly paler.
#
# Two glints leave less dead air than one anyway, and neither invents a shape
# the tile does not have.
ECHO_START = 0.52
ECHO_LENGTH = 0.30

# --- The sweep ---------------------------------------------------------------

# Tall enough to cross the tile corner to corner while tilted, and let the tile's
# own rounded corner do the cutting.
BAND_H = 150
BAND_W = 20
TRAIL_W = 8
TRAIL_GAP = 17
BAND_TILT = 24
START_X = -40
END_X = SIZE + 40

# --- The sparkles ------------------------------------------------------------
#
# Placed in the corners, well clear of the numeral. Two digits at 18dp fill most
# of the middle of a 46dp tile, and a sparkle behind a `4` is a smudge on a `4`.

SPARK_SPOTS = [(20, 22), (79, 26), (26, 78), (76, 74)]
SPARK_OUTER = 11
SPARK_INNER = 3.4

# --- The palette -------------------------------------------------------------
#
# From `src/theme/colors.ts`. The tile is a gold gradient, so the mark is white:
# a highlight is the light source's colour, not the surface's, and a gold sheen
# on gold goes muddy — the exact finding `make-shine.py` records for the green
# disc.

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
    """A wide band with a narrow one trailing it, crossing the tile.

    Parked outside the frame for the rest of the cycle rather than faded out.
    That is the whole pause mechanism: no opacity keys, nothing to interpolate,
    just a shape the tile is already clipping away.
    """

    def across(t: float):
        k = since(t, start, length)
        return [round(START_X + (END_X - START_X) * smoothstep(k), 2), CENTRE, 0]

    return shape_layer(
        1 + index * 6,
        f"sweep{index}",
        [
            group([rounded_rect((BAND_W, BAND_H), BAND_W / 2), fill(WHITE, 0.5 * strength)]),
            group(
                [
                    rounded_rect((TRAIL_W, BAND_H), TRAIL_W / 2, (-TRAIL_GAP, 0)),
                    fill(WHITE, 0.3 * strength),
                ]
            ),
        ],
        transform(windowed(across, start, length), rotation=BAND_TILT),
        DURATION,
    )


def sparkle(index: int) -> dict:
    """A four-point star, popping in the sweep's wake.

    Timed *behind* the band rather than with it — the sweep is the light passing
    over, and these are what it catches. Each holds its own angle so the four do
    not read as one shape repeated.
    """
    spot = SPARK_SPOTS[index]
    start = SWEEP_START + 0.05 + index * 0.045
    length = 0.30
    tilt = index * 23

    def size(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0, 0, 100]
        # Up fast past full, then away. `overshoot` on the way in is what makes a
        # sparkle read as a spark rather than as a dot being faded up.
        grow = overshoot(min(1.0, k * 2.6)) if k < 0.38 else 1 - smoothstep((k - 0.38) / 0.62)
        return [round(100 * grow, 2), round(100 * grow, 2), 100]

    def spin(t: float):
        k = since(t, start, length)
        return [round(tilt + 34 * k, 2)]

    def alpha(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0]
        return [round(92 * min(1.0, k * 6) * (1 - k) ** 0.6, 1)]

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
        "badge",
        SIZE,
        SIZE,
        FPS,
        DURATION,
        [
            sweep(0, SWEEP_START, SWEEP_LENGTH, 1.0),
            *[sparkle(i) for i in range(len(SPARK_SPOTS))],
            sweep(1, ECHO_START, ECHO_LENGTH, 0.55),
        ],
    )


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "badge.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
