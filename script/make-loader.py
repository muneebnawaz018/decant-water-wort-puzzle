#!/usr/bin/env python3
"""Generate `assets/lottie/loader.json` — the mark shown while an ad loads.

What it is for
--------------
`AdVeil` covers the screen for the seconds between pressing a rewarded offer and
the advert appearing. On wifi that is invisible; on a weak connection it is long
enough that a still screen reads as a dead button, and a dead button gets pressed
again.

What it is, and what it stopped being
-------------------------------------
Two gold arcs turning against each other, with a lit bead on the outer one.

It was three vials filling in turn before this, on the reasoning that a loader
should speak the game's own vocabulary. On screen that was far too much: a wide
row of glassware two hundred pixels across, doing a full pour-and-drain cycle,
for a wait that is usually over in a second. A loader is chrome. It has to say
*hold on* and then get out of the way, and a spinner is the shape everyone
already reads without being taught.

The theme is carried by the palette and the motion instead of by the object —
gold on the app's own scrim, round caps, unhurried.

Why generated rather than authored
----------------------------------
The precedent is `script/make-lottie.py` and `script/make-brew.py`, and the
reason is theirs: no After Effects pipeline, no artist, and a committed binary
nobody can regenerate drifts from the palette the moment a colour moves. Every
colour below comes from `src/theme/colors.ts`.

Run it after changing any colour it reads. The JSON is written minified and the
commit gate checks formatting, so `npm run format` is the second half of the
command, not an optional tidy-up:

    python3 script/make-loader.py && npm run format

Lottie schema notes
-------------------
Shape layers only — no images, no expressions, no masks. Same subset the other
two stick to, and for the same reason: it is what every `lottie-react-native`
version renders identically on both platforms.

**No trim paths, though a spinner is the obvious place for one.** Trim is how
After Effects draws an arc, but its behaviour depends on where the modifier sits
in the group's item list, and lottie-android and lottie-ios resolve that
differently from lottie-web — a hand-written one is a coin toss on whether the
arc appears at all. The arcs here are plain bezier paths with the sweep baked in,
built by the standard cubic approximation. Nothing to resolve, and it renders the
same everywhere.

**Every rotation is a whole number of turns.** A loop that ends at 540 degrees
snaps back to 0 on the next pass, which is a visible stutter once a cycle and the
easiest thing in the format to ship without noticing.
"""

import json
import math
import pathlib

# --- The animation's own frame ----------------------------------------------

FPS = 60
# One and a bit seconds a turn. Slower than a system spinner on purpose: this
# app's whole register is unhurried, and a fast tick under "Loading ad" reads as
# impatience on the app's part.
DURATION = 96

# Square, and tight around the ring. `resizeMode="contain"` fits the whole
# composition into its box, empty air included — a generous margin here is how
# `brew.json` first shipped at 18dp tall.
SIZE = 120
CENTRE = SIZE / 2

# --- The rings ---------------------------------------------------------------

OUTER_R = 40
OUTER_W = 7
# Most of the way round, with a clear gap. A near-complete ring reads as a
# progress meter stuck at 95%; this has to read as motion, and the gap is what
# the eye tracks.
OUTER_SWEEP = 250

INNER_R = 23
INNER_W = 6
INNER_SWEEP = 130

# The bead riding the head of the outer arc. It is the one part that is not a
# stroke, and it is what stops the pair reading as a diagram — an arc has no
# front, so nothing says which way it is going until something leads it.
BEAD_D = 10

# --- The palette -------------------------------------------------------------
#
# From `src/theme/colors.ts`. Named here rather than parsed out of the TypeScript
# for the same reason `make-brew.py` names its own: which entries suit this mark
# is a choice, not the palette.

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

    Linear is exactly right for the two rotations — a spinner turning at a
    constant rate is what the shape means — and the bead's pulse is sampled off a
    cosine below rather than eased by tangents. Lottie's bezier handles are the
    fiddliest part of the format to hand-write and the easiest to get subtly
    wrong; `make-brew.py` makes the same trade.
    """
    return {
        "a": 1,
        "k": [
            {"t": t, "s": s, "i": {"x": [0.5], "y": [0.5]}, "o": {"x": [0.5], "y": [0.5]}}
            for t, s in frames
        ],
    }


def arc_path(radius: float, sweep_deg: float, start_deg: float = -90) -> dict:
    """An open arc as a bezier path, centred on the origin.

    The standard cubic approximation: split the sweep into segments of at most a
    quarter turn, and give each one handles of length `4/3 * tan(quarter of the
    segment) * r` along the tangent. Below 90 degrees a segment the error is far
    under a pixel at this size.

    Built around the origin rather than around the centre of the frame, so the
    layer's own rotation spins it in place — a path drawn at an offset rotates
    around the frame instead, which is an orbit, not a spin.
    """
    segments = max(1, math.ceil(abs(sweep_deg) / 90))
    step = math.radians(sweep_deg) / segments
    k = 4 / 3 * math.tan(step / 4)

    vertices = []
    in_tangents = []
    out_tangents = []

    for i in range(segments + 1):
        angle = math.radians(start_deg) + step * i
        point = [radius * math.cos(angle), radius * math.sin(angle)]
        # The tangent at this point, scaled to the handle length. Lottie stores
        # handles relative to their own vertex, so these are offsets and not
        # absolute points.
        tangent = [-radius * math.sin(angle) * k, radius * math.cos(angle) * k]

        vertices.append([round(point[0], 3), round(point[1], 3)])
        out_tangents.append([round(tangent[0], 3), round(tangent[1], 3)])
        in_tangents.append([round(-tangent[0], 3), round(-tangent[1], 3)])

    return {
        "ty": "sh",
        "d": 1,
        "ks": value({"i": in_tangents, "o": out_tangents, "v": vertices, "c": False}),
        "nm": "arc",
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
    """Round caps and round joins, per the app's look.

    A butt-capped arc ends in a flat chop that reads as a broken ring; rounded,
    the same arc reads as a stroke someone drew.
    """
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


def shape_layer(index: int, name: str, shapes: list, transform: dict) -> dict:
    """A shape layer with everything the renderers expect present.

    `ao`, `sr`, `st` and the rest are not optional in practice: several renderers
    read them without a default, and a missing one is a layer that silently does
    not draw.
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


def transform(rotation=0, opacity=100, scale=None) -> dict:
    """Everything here turns about the centre of the frame, so position is fixed.

    The anchor stays at the origin because the paths are already built around it
    — see `arc_path`.
    """
    return {
        "o": opacity if isinstance(opacity, dict) else value(opacity),
        "r": rotation if isinstance(rotation, dict) else value(rotation),
        "p": value([CENTRE, CENTRE, 0]),
        "a": value([0, 0, 0]),
        "s": scale if isinstance(scale, dict) else value(scale or [100, 100, 100]),
    }


def spin(turns: int) -> dict:
    """A whole number of turns across the loop, at a constant rate.

    Two keyframes is all a linear rotation needs, and a whole number of turns is
    what makes the last frame identical to the first.
    """
    return keyed([(0, [0]), (DURATION, [360 * turns])])


# --- The parts ---------------------------------------------------------------


def track() -> dict:
    """The full ring the outer arc runs on, dim and still.

    Without it the arc is a gold sliver drifting in empty space, and the eye has
    nothing to measure its progress against. It is also what gives the mark a
    footprint at rest, so the loader occupies the same area throughout rather
    than appearing to change size as the arc turns.
    """
    return shape_layer(
        4,
        "track",
        [group([ellipse((OUTER_R * 2, OUTER_R * 2)), stroke(GOLD, OUTER_W, 0.16)])],
        transform(),
    )


def outer() -> dict:
    """The main arc: one clockwise turn per loop."""
    return shape_layer(
        3,
        "outer",
        [group([arc_path(OUTER_R, OUTER_SWEEP), stroke(GOLD_LIGHT, OUTER_W, 0.95)])],
        transform(spin(1)),
    )


def inner() -> dict:
    """A shorter arc, turning the other way.

    Counter-rotation is the whole reason there are two. Two arcs going the same
    way read as one thick arc with a gap in it; going opposite ways, they read as
    a mechanism, and the moment they cross gives the loop a beat.
    """
    return shape_layer(
        2,
        "inner",
        [group([arc_path(INNER_R, INNER_SWEEP), stroke(GOLD, INNER_W, 0.7)])],
        transform(spin(-1)),
    )


def bead() -> dict:
    """The lit head of the outer arc.

    It shares the outer arc's rotation exactly, and sits at the arc's end angle
    in its own local frame, so the two cannot drift apart — one number drives
    both. `arc_path` starts at -90, which is why the offset is measured from
    there.

    Its size breathes twice a loop. That is the only thing in the composition
    moving at a different rate from everything else, and without it a mark whose
    every part turns in lockstep looks like a still image being rotated.
    """
    angle = math.radians(-90 + OUTER_SWEEP)
    position = [round(OUTER_R * math.cos(angle), 3), round(OUTER_R * math.sin(angle), 3)]

    # Sampled off a cosine rather than keyed at the turning points, so the pulse
    # eases without a hand-written tangent — and it closes exactly, because two
    # whole cycles land back where they started.
    scale = keyed(
        [
            (
                frame,
                [round(115 - 25 * math.cos(4 * math.pi * frame / DURATION), 1)] * 3,
            )
            for frame in range(0, DURATION + 1, 4)
        ]
    )

    return shape_layer(
        1,
        "bead",
        [group([ellipse((BEAD_D, BEAD_D), position), fill(GOLD_PALE)])],
        transform(spin(1), scale=scale),
    )


def build() -> dict:
    # Lottie draws the *first* layer on top, so the list runs front to back: the
    # bead over the arcs, the arcs over their track.
    return {
        "v": "5.7.4",
        "fr": FPS,
        "ip": 0,
        "op": DURATION,
        "w": SIZE,
        "h": SIZE,
        "nm": "loader",
        "ddd": 0,
        "assets": [],
        "layers": [bead(), inner(), outer(), track()],
    }


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "loader.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
