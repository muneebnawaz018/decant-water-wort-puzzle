#!/usr/bin/env python3
"""Generate `assets/lottie/shine.json` — the sheen that crosses the coin pill's plus.

What it is for
--------------
The plus is the only route to the shop from the chrome, and it is a 20dp disc at
the end of a balance most players read as a readout rather than a control. The
sheen is what says it is a thing you press: a specular band crossing it every few
seconds, the way light crosses a polished surface as it turns.

It carries no state and reports nothing. That is deliberate — a mark that only
appeared when something was purchasable would be a notification, and this is not
one. It is the button admitting it is a button.

Why it needs no mask
--------------------
The obvious way to keep a diagonal band inside a circle is to clip it, and masks
and track mattes are the least portable corner of the format — the same reason
`make-brew.py` sizes its liquid to fit rather than clipping it.

Nothing here clips. The band runs across a square frame and `styles.plus` does
the rest: that view already carries `borderRadius` and `overflow: 'hidden'`, for
its own gradient, and a Lottie laid into it is clipped by the same corner. The
animation's only job is to move a bright shape from one side to the other.

Why generated rather than authored
----------------------------------
The precedent is `script/make-lottie.py`, `make-brew.py` and `make-loader.py`,
and the reason is theirs: no After Effects pipeline, no artist, and a committed
binary nobody can regenerate drifts from the palette the moment a colour moves.

Run it after changing any colour it reads. The JSON is written minified and the
commit gate checks formatting, so `npm run format` is the second half of the
command, not an optional tidy-up:

    python3 script/make-shine.py && npm run format

Lottie schema notes
-------------------
Shape layers only — no images, no expressions, no masks, no trim paths. The
subset every `lottie-react-native` version renders identically on both platforms.

The two bands travel as one layer rather than as two, so their spacing cannot
drift: a wide band and a narrow one a fixed distance behind it is what reads as a
sheen rather than as a bar sliding past.
"""

import json
import pathlib

# --- The animation's own frame ----------------------------------------------

FPS = 60
# Under two seconds, and most of it is still the pause.
#
# **Tuned against the size it renders at, which is the thing that catches you
# out here.** The first version ran a half-second sweep every three seconds and
# was invisible on a device — not wrong, just unnoticeable, because a 20dp disc
# in the corner of the screen gets a fraction of a second of attention and the
# odds of that landing inside a one-in-six window are poor. At this cadence the
# sheen crosses about once per screen the player looks at.
DURATION = 108
SWEEP_FRAMES = 26

# Square, matching the disc it sits in. `resizeMode="contain"` fits the whole
# frame into its box, so a frame that is not square would inset the sheen and
# leave a gap at the edge of the circle — exactly where a specular highlight is
# most visible.
SIZE = 60
CENTRE = SIZE / 2

# --- The bands ---------------------------------------------------------------

# Long enough to cross the frame corner to corner while tilted. The frame's
# diagonal is about 85; the excess is what keeps the ends out of view, so the
# band reads as a slice of light rather than as a capsule.
BAND_H = 104
# A third of the frame wide. The disc renders at 20dp, so the band lands at about
# 5dp of it — wide enough to read as light, narrow enough that the plus glyph is
# never hidden behind it.
BAND_W = 17
# The narrow one, trailing. A single band reads as a wipe; two at different
# widths read as a reflection travelling across a curved face.
TRAIL_W = 7
TRAIL_GAP = 14

TILT = 24

# Where the pair starts and ends, in frame coordinates. Both are outside the
# frame, so the band is never seen appearing or stopping — it enters, crosses,
# and leaves.
START_X = -26
END_X = SIZE + 26

# --- The palette -------------------------------------------------------------
#
# From `src/theme/colors.ts`. White rather than gold: this crosses the one green
# face in the chrome, and a gold sheen on green goes muddy. A specular highlight
# is the light source's colour, not the surface's.

WHITE = "#FFFFFF"


def rgba(hex_colour: str, alpha: float = 1.0) -> list[float]:
    """Lottie wants normalised floats, not bytes."""
    h = hex_colour.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [alpha]


def value(v):
    """A static property."""
    return {"a": 0, "k": v}


def keyed(frames):
    """An animated property, linear between samples."""
    return {
        "a": 1,
        "k": [
            {"t": t, "s": s, "i": {"x": [0.5], "y": [0.5]}, "o": {"x": [0.5], "y": [0.5]}}
            for t, s in frames
        ],
    }


def smoothstep(t: float) -> float:
    """Ease in and out, without a tangent in sight.

    Sampling a curve is how this file gets easing at all — Lottie's bezier
    handles are hand-written here, and a subtly wrong one is far harder to spot
    than a slightly coarse sample. `make-loader.py` makes the same trade.
    """
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def rounded_rect(size, radius, position=(0, 0)) -> dict:
    return {
        "ty": "rc",
        "d": 1,
        "s": value(list(size)),
        "p": value(list(position)),
        "r": value(radius),
        "nm": "rect",
    }


def fill(colour: str, alpha: float = 1.0) -> dict:
    return {
        "ty": "fl",
        "c": value(rgba(colour, alpha)),
        "o": value(100),
        "r": 1,
        "nm": "fill",
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


def sheen() -> dict:
    """The pair of bands, crossing once per loop.

    Eased at both ends rather than run at a constant speed. A highlight on a
    curved face is not travelling — the face is turning under it — so it appears
    to gather pace across the middle and settle at the edges.

    Parked past the right edge for the rest of the cycle. That is the whole pause
    mechanism: no opacity keys, nothing to fade, just a shape outside the frame
    the view is already clipping to.
    """
    positions = [
        (
            frame,
            [round(START_X + (END_X - START_X) * smoothstep(frame / SWEEP_FRAMES), 2), CENTRE, 0],
        )
        for frame in range(0, SWEEP_FRAMES + 1, 2)
    ]
    positions.append((DURATION, [END_X, CENTRE, 0]))

    return shape_layer(
        1,
        "sheen",
        [
            group([rounded_rect((BAND_W, BAND_H), BAND_W / 2), fill(WHITE, 0.72)]),
            group(
                [
                    rounded_rect((TRAIL_W, BAND_H), TRAIL_W / 2, (-TRAIL_GAP, 0)),
                    fill(WHITE, 0.45),
                ]
            ),
        ],
        {
            "o": value(100),
            "r": value(TILT),
            "p": keyed(positions),
            "a": value([0, 0, 0]),
            "s": value([100, 100, 100]),
        },
    )


def build() -> dict:
    return {
        "v": "5.7.4",
        "fr": FPS,
        "ip": 0,
        "op": DURATION,
        "w": SIZE,
        "h": SIZE,
        "nm": "shine",
        "ddd": 0,
        "assets": [],
        "layers": [sheen()],
    }


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "shine.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
