#!/usr/bin/env python3
"""Generate `assets/lottie/brew.json` — the "still brewing" mark.

What it is for
--------------
The daily reward's waiting state. That control used to read `Next in 23:58:10`
on one line: a two-word caption dwarfed by a clock, with the caption too short
to balance it and no room to grow. Making the words bigger was the wrong lever —
the countdown is the value and should stay the loudest thing there — so the
words came out of the line and a mark took their place.

The mark has to say *waiting* without saying it in English, and it has to say it
in this game's own vocabulary. So: a vial, filling a drop at a time. It is the
same object the whole game is played with, and a drip is the one image of
elapsed time that needs no clock face.

Why generated rather than authored
----------------------------------
The precedent is `script/make-lottie.py`, and the reasoning is the same one it
records: this project has no After Effects pipeline and no artist, and a
committed binary nobody can regenerate drifts from the palette the moment a
colour moves. Every value below that has a colour in it comes from
`src/theme/colors.ts`.

A dripping vial also survives being generated in the way a drawn character would
not — it is three primitives under one rule, so the work is arithmetic.

Run it after changing any colour it reads:

    python3 script/make-brew.py

Lottie schema notes
-------------------
Shape layers only, no images, no expressions, no masks — the subset every
`lottie-react-native` version renders identically on both platforms. Masks are
the notable omission: the obvious way to draw liquid inside glass is to clip a
rectangle to the vial, and track mattes are the least portable corner of the
format. The liquid is drawn as its own rounded rectangle sized to sit inside the
glass instead, which needs no clipping to stay put.
"""

import json
import pathlib

# --- The animation's own frame ----------------------------------------------

FPS = 60
# Four seconds, and it loops. Slow on purpose: this sits under a countdown that
# is already ticking once a second, and a second rhythm running faster than that
# turns a calm card into a busy one.
DURATION = 240
# A *tall* viewport, not a square one, and that is a sizing fix rather than a
# taste one.
#
# The first version drew a 62×108 vial inside a 200×200 frame — nearly two
# thirds of the composition was empty air above and below it. `resizeMode`
# `contain` fits the whole frame into its box, empty air included, so a mark
# given a 34dp box rendered a vial about 18dp tall: a gold pill with a dot over
# it, unreadable as glassware.
#
# The frame now hugs the vial, so the box the component gives it is very nearly
# the vial's own size. Anything left over is the drop's runway above the glass.
WIDTH = 110
HEIGHT = 200
CENTRE = WIDTH / 2

# --- The vial ---------------------------------------------------------------

VIAL_W = 76
VIAL_H = 148
# Pushed to the bottom of the frame. What is above it is the drop's fall, which
# needs somewhere to start from — and a vial floating in the middle of its own
# frame is how the empty air got there the first time.
VIAL_TOP = HEIGHT - VIAL_H - 6
VIAL_BOTTOM = VIAL_TOP + VIAL_H
# Square shoulders, deeply rounded base is the app's own vial (see
# `theme/skins.ts`), but Lottie's rounded-rectangle primitive carries one radius
# for all four corners. A middling radius reads closer to the real thing at this
# size than a fully rounded pill does.
VIAL_R = 26

WALL = 7

# How full the glass gets, as a fraction of its inside height. It never fills:
# a vial that reaches the brim looks finished, and the whole point is that the
# reward is not ready yet.
FILL_LOW = 0.30
FILL_HIGH = 0.52

# --- The palette ------------------------------------------------------------
#
# From `src/theme/colors.ts`. Named here rather than parsed out of the
# TypeScript for the same reason `make-lottie.py` names its confetti: which
# entries suit this mark is a choice, not the palette.

GOLD = "#FFC94B"
GOLD_LIGHT = "#FFDE86"
GOLD_PALE = "#FFEFB4"


def rgba(hex_colour: str, alpha: float = 1.0) -> list[float]:
    """Lottie wants normalised floats, not bytes."""
    h = hex_colour.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [alpha]


def value(v):
    """A static property."""
    return {"a": 0, "k": v}


def keyed(frames):
    """An animated property, linear between samples.

    Linear rather than eased, and sampled where a curve is wanted — the same
    choice `make-lottie.py` makes. Lottie's tangents are the fiddliest part of
    the format to hand-write and the easiest to get subtly wrong.
    """
    return {
        "a": 1,
        "k": [
            {"t": t, "s": s, "i": {"x": [0.5], "y": [0.5]}, "o": {"x": [0.5], "y": [0.5]}}
            for t, s in frames
        ],
    }


def shape_layer(index: int, name: str, shapes: list, transform: dict) -> dict:
    """A shape layer with everything the renderers expect present.

    `ao`, `sr`, `st` and the rest are not optional in practice: several
    renderers read them without a default, and a missing one is a layer that
    silently does not draw.
    """
    return {
        "ddd": 0,
        "ind": index,
        "ty": 4,
        "nm": name,
        "sr": 1,
        "ks": transform,
        "ao": 0,
        "shapes": shapes,
        "ip": 0,
        "op": DURATION + 1,
        "st": 0,
        "bm": 0,
    }


def transform(position, opacity=100, scale=None) -> dict:
    return {
        "o": opacity if isinstance(opacity, dict) else value(opacity),
        "r": value(0),
        "p": position if isinstance(position, dict) else value(position),
        "a": value([0, 0, 0]),
        "s": value(scale or [100, 100, 100]),
    }


def rounded_rect(size, radius, position=(0, 0)) -> dict:
    return {
        "ty": "rc",
        "d": 1,
        "s": value(list(size)),
        "p": value(list(position)),
        "r": value(radius),
        "nm": "rect",
    }


def ellipse(size, position=(0, 0)) -> dict:
    return {"ty": "el", "s": value(list(size)), "p": value(list(position)), "nm": "el"}


def fill(colour: str, alpha: float = 1.0, opacity=100) -> dict:
    return {
        "ty": "fl",
        "c": value(rgba(colour, alpha)),
        "o": opacity if isinstance(opacity, dict) else value(opacity),
        "r": 1,
        "nm": "fill",
    }


def stroke(colour: str, width: float, alpha: float = 1.0) -> dict:
    return {
        "ty": "st",
        "c": value(rgba(colour, alpha)),
        "o": value(100),
        "w": value(width),
        "lc": 2,
        "lj": 2,
        "nm": "stroke",
    }


def group(items: list) -> dict:
    """Shapes need a group with its own transform or nothing positions."""
    return {
        "ty": "gr",
        "it": items
        + [
            {
                "ty": "tr",
                "p": value([0, 0]),
                "a": value([0, 0]),
                "s": value([100, 100]),
                "r": value(0),
                "o": value(100),
                "sk": value(0),
                "sa": value(0),
            }
        ],
        "nm": "group",
    }


# --- The parts --------------------------------------------------------------


def glass() -> dict:
    """The empty vial: a stroked outline, no fill.

    Bold rather than a hairline, per the app's own look rule — a thin grey
    outline reads as a chart, a heavy one reads as drawn.
    """
    return shape_layer(
        1,
        "glass",
        [group([rounded_rect((VIAL_W, VIAL_H), VIAL_R), stroke(GOLD, WALL, 0.85)])],
        transform([CENTRE, (VIAL_TOP + VIAL_BOTTOM) / 2, 0]),
    )


def liquid() -> dict:
    """The level, rising and falling on the loop.

    Both the height and the centre are animated, and they have to move together:
    a rectangle grows from its middle, so raising the level means growing it
    *and* sliding its centre down by half of what it grew.

    Sampled every twelve frames. The level moves a few pixels over four seconds
    — the segments are far below what the eye resolves at this size.
    """
    inside_h = VIAL_H - WALL * 2
    inside_w = VIAL_W - WALL * 2
    bottom = VIAL_BOTTOM - WALL

    sizes = []
    centres = []
    for frame in range(0, DURATION + 1, 12):
        # One full rise and fall across the loop, so the first and last frames
        # agree and the seam is invisible.
        t = frame / DURATION
        eased = t * 2 if t <= 0.5 else (1 - t) * 2
        height = inside_h * (FILL_LOW + (FILL_HIGH - FILL_LOW) * eased)

        sizes.append((frame, [inside_w, round(height, 1)]))
        centres.append((frame, [CENTRE, round(bottom - height / 2, 1), 0]))

    body = {
        "ty": "rc",
        "d": 1,
        "s": keyed(sizes),
        "p": value([0, 0]),
        # Rounded at the base to sit inside the glass, which means the top
        # corners round too — invisible under the meniscus drawn over them.
        "r": value(VIAL_R - WALL),
        "nm": "level",
    }

    return shape_layer(
        2,
        "liquid",
        [group([body, fill(GOLD_LIGHT, 0.9)])],
        transform(keyed(centres)),
    )


def drop() -> dict:
    """One drop, falling into the glass and landing on the loop's midpoint.

    It falls under gravity rather than at a constant speed — a drop that
    descends linearly reads as a dot being moved, which is most of what makes a
    generated animation look generated.
    """
    start_y = 10
    end_y = VIAL_BOTTOM - 30

    fall_start = 0
    fall_end = DURATION // 2

    positions = []
    span = fall_end - fall_start
    for frame in range(fall_start, fall_end + 1, 6):
        t = (frame - fall_start) / span
        y = start_y + (end_y - start_y) * (t * t)
        positions.append((frame, [CENTRE, round(y, 1), 0]))
    # Held off-screen for the rest of the loop, so it is not seen resetting.
    positions.append((fall_end + 1, [CENTRE, start_y, 0]))
    positions.append((DURATION, [CENTRE, start_y, 0]))

    # Visible only while falling. The gap is what makes it read as one drop
    # every few seconds rather than a stream.
    opacity = keyed(
        [
            (0, [0]),
            (8, [100]),
            (fall_end - 6, [100]),
            (fall_end, [0]),
            (DURATION, [0]),
        ]
    )

    return shape_layer(
        3,
        "drop",
        [group([ellipse((15, 19)), fill(GOLD_PALE)])],
        transform(keyed(positions), opacity),
    )


def ripple() -> dict:
    """The ring where the drop lands, expanding and fading once per loop.

    Timed to the drop's arrival rather than to the loop, which is the whole
    reason the drop's fall is exactly half the duration: two animations that
    have to agree are easier to keep in step when one number sets both.
    """
    land = DURATION // 2

    sizes = [
        (land, [6, 4]),
        (land + 26, [58, 16]),
        (DURATION, [58, 16]),
    ]
    opacity = keyed(
        [
            (0, [0]),
            (land, [70]),
            (land + 26, [0]),
            (DURATION, [0]),
        ]
    )

    ring = {"ty": "el", "s": keyed(sizes), "p": value([0, 0]), "nm": "ring"}

    return shape_layer(
        4,
        "ripple",
        [group([ring, stroke(GOLD_PALE, 4)])],
        transform([CENTRE, VIAL_BOTTOM - 34, 0], opacity),
    )


def build() -> dict:
    return {
        "v": "5.7.4",
        "fr": FPS,
        "ip": 0,
        "op": DURATION,
        "w": WIDTH,
        "h": HEIGHT,
        "nm": "brew",
        "ddd": 0,
        "assets": [],
        # Painted back to front: glass, then the level inside it, then the drop
        # and its ripple over both. Lottie draws the *first* layer on top, so
        # the list is reversed.
        "layers": [ripple(), drop(), liquid(), glass()],
    }


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "brew.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
