#!/usr/bin/env python3
"""Generate `assets/lottie/close.json` — the dismiss mark on the win card.

Why this is generated rather than authored
------------------------------------------
The same route the icons, the splash and the other marks take: a script that
draws the asset from the palette, so a colour moving in `src/theme/colors.ts`
cannot leave a committed binary behind. `script/make-coins.py` has the longer
version of this argument.

Gold, tilted, and no chip
-------------------------
Two versions were rejected before this and both are worth naming. A muted grey
cross read as browser chrome pasted onto the card — every other thing there is
gold, so the one thing that was not looked like it belonged to another app. A
translucent disc behind it fixed the weight and cost more than it bought: a
second bordered shape in a corner already holding three stars, competing with
them for the same glance.

What was actually wrong was the colour, not the missing body. In gold it is part
of the card's own family, and the tilt is what keeps it from reading as a
multiplication sign or a form-field clear button — an ✕ standing square is a
symbol, one at an angle is a mark.

Why it moves at all
-------------------
A dismiss control in the corner of a card full of gold competes with the stars
if it is loud and disappears if it is not. The motion is the compromise: a slow
breath and a couple of degrees of tilt, enough that peripheral vision catches
it, not enough to invite the one press on this card nobody should be encouraged
into. Findable, not tempting.

The loop exemption
------------------
`assets/lottie/README.md` says a mounted loop redraws forever and to avoid it.
This takes the same exemption the coin pill's sheen does, on the same grounds:
the frame is 40 units square and it is mounted only while the win card is up,
which is seconds at a time. Anything larger owes the usual argument.

Run after changing any colour it reads:

    python3 script/make-close.py
"""

import json
import pathlib

FPS = 60
# 2.4 seconds. Slow enough to read as breathing rather than blinking — a fast
# pulse on a dismiss control is a nag.
DURATION = 144
SIZE = 44
CENTRE = SIZE / 2

# `goldLight` from the palette rather than the full gold: this sits above three
# gold stars and a gold button, and matching their strength would make the way
# out compete with the reward.
GOLD = "#FFDE86"

# The arm's reach from centre, and its weight. Heavier than the grey cross was
# (2.6): gold on a purple panel needs less contrast help than a muted lilac did,
# but a thin stroke at this size reads as a hairline rather than as a mark.
ARM = 8.0
STROKE = 3.0

# The tilt, in degrees. Enough to be clearly deliberate — a couple of degrees
# looks like a rendering error — and short of 45, which is a plus sign.
TILT = 14


def rgba(hex_colour: str) -> list[float]:
    """Lottie wants normalised floats, not bytes."""
    h = hex_colour.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [1.0]


def value(v):
    """A static property."""
    return {"a": 0, "k": v}


def keyed(frames: list[tuple[int, list[float]]]):
    """An animated property, eased between samples.

    Smooth rather than linear here, unlike the ballistic animations: those
    sample a curve densely enough that linear segments are invisible, and this
    has four keyframes over two and a half seconds. Linear between them reads
    as a mechanism ticking.
    """
    return {
        "a": 1,
        "k": [
            {"t": t, "s": s, "i": {"x": [0.4], "y": [1]}, "o": {"x": [0.6], "y": [0]}}
            for t, s in frames
        ],
    }


def arm(name: str, x1: float, y1: float, x2: float, y2: float) -> dict:
    """One stroke of the cross."""
    return {
        "ty": "gr",
        "nm": name,
        "it": [
            {
                "ty": "sh",
                "d": 1,
                "ks": {
                    "a": 0,
                    "k": {
                        "c": False,
                        "v": [[x1, y1], [x2, y2]],
                        "i": [[0, 0], [0, 0]],
                        "o": [[0, 0], [0, 0]],
                    },
                },
            },
            {
                "ty": "st",
                "c": value(rgba(GOLD)),
                "o": value(100),
                "w": value(STROKE),
                # Round caps: every other stroke in this app's artwork is
                # rounded, and a butt-capped cross looks like a rejected form
                # field beside them.
                "lc": 2,
                "lj": 2,
            },
            {
                "ty": "tr",
                "p": value([0, 0]),
                "a": value([0, 0]),
                "s": value([100, 100]),
                "r": value(0),
                "o": value(100),
            },
        ],
    }


def build() -> dict:
    return {
        "v": "5.7.4",
        "fr": FPS,
        "ip": 0,
        "op": DURATION,
        "w": SIZE,
        "h": SIZE,
        "nm": "close",
        "ddd": 0,
        "assets": [],
        "layers": [
            {
                "ddd": 0,
                "ind": 1,
                "ty": 4,
                "nm": "cross",
                "sr": 1,
                "ks": {
                    # Held at full strength. The breath is in the size, not the
                    # opacity: a control that fades in and out looks disabled
                    # half the time.
                    "o": value(100),
                    # A couple of degrees each way. Enough that the eye catches
                    # it in peripheral vision, not enough to look like a
                    # spinner.
                    # Held at the tilt, breathing a couple of degrees around
                    # it. The tilt is the pose; the wobble is what stops a
                    # static mark in a corner disappearing from notice.
                    "r": keyed(
                        [
                            (0, [TILT - 2]),
                            (DURATION // 2, [TILT + 2]),
                            (DURATION, [TILT - 2]),
                        ]
                    ),
                    "p": value([CENTRE, CENTRE, 0]),
                    "a": value([0, 0, 0]),
                    "s": keyed(
                        [
                            (0, [100, 100]),
                            (DURATION // 2, [107, 107]),
                            (DURATION, [100, 100]),
                        ]
                    ),
                },
                "ao": 0,
                "shapes": [
                    arm("a", -ARM, -ARM, ARM, ARM),
                    arm("b", ARM, -ARM, -ARM, ARM),
                ],
                "ip": 0,
                "op": DURATION,
                "st": 0,
                "bm": 0,
            }
        ],
    }


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "close.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size / 1024:.1f} KB)")
