#!/usr/bin/env python3
"""Generate `assets/lottie/win.json` — the celebration burst.

Why this is generated rather than authored
------------------------------------------
`win.json` shipped as a hand-written stand-in: three gold dots that expand and
fade. It existed so the integration compiled, not because it looked like
anything, and on a device the reward dialog read as a plain modal — which is
what it was. The honest fix is real artwork, and this project has no After
Effects pipeline and no artist.

So the same route the app icons and the splash already take: a script that
draws the asset from the palette. `script/make-icons.sh` and
`script/make-splash.py` are the precedent. The point is not that generated art
beats authored art — it does not — but that a committed binary nobody can
regenerate drifts from the palette the moment a color moves, and this one
cannot.

Confetti is also the one celebration shape that survives being generated. It is
many simple pieces under one physical rule, so the work is arithmetic rather
than draughtsmanship; a drawn character or a bespoke flourish would need a hand.

Run it after changing any color it reads:

    python3 script/make-lottie.py

Lottie schema notes
-------------------
Shape layers only, no images, no expressions — the subset every
`lottie-react-native` version renders identically on both platforms.

Positions are baked as linear keyframes sampled along a ballistic path rather
than as two keyframes with bezier easing. Lottie's spatial tangents are the
fiddliest part of the format to write by hand and the easiest to get subtly
wrong; sampling is exact, and at 60fps the segments are invisible.
"""

import json
import math
import pathlib
import random

# --- The animation's own frame ----------------------------------------------

FPS = 60
# 1.6 seconds. Long enough for a piece to arc up and fall back out of frame,
# short enough that the dialog is not waiting on it — nothing is gated behind
# this finishing, but a celebration still on screen when the player reaches for
# the button reads as lag.
DURATION = 96
# A square viewport, scaled to whatever box it is dropped into. 600 rather than
# 300 so the pieces stay whole numbers at sensible sizes.
SIZE = 600
CENTER = SIZE / 2

PIECES = 46

# --- The palette ------------------------------------------------------------
#
# From `src/theme/colors.ts`. Kept as a list here rather than parsed out of the
# TypeScript: this is a *choice* of which palette entries look like confetti,
# not the palette itself, and six of the twelve board colors would be wrong.
CONFETTI = [
    "#FFC94B",  # gold
    "#FFDE86",  # goldLight
    "#FFEFB4",  # goldPale
    "#FF8A1E",  # mango
    "#A24DFF",  # plum
    "#A6E82A",  # lime
    "#22C9EC",  # aqua
    "#5AA9FF",  # blueberryLight
]


def rgba(hex_color: str) -> list[float]:
    """Lottie wants normalised floats, not bytes."""
    h = hex_color.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [1.0]


def value(v):
    """A static property."""
    return {"a": 0, "k": v}


def keyed(frames: list[tuple[int, list[float]]]):
    """An animated property, linear between samples.

    The last keyframe carries no `s` in the spec's own examples, but every
    renderer accepts one and omitting it is a common source of a property
    snapping back on the final frame. It is written.
    """
    return {
        "a": 1,
        "k": [
            {"t": t, "s": s, "i": {"x": [0.5], "y": [0.5]}, "o": {"x": [0.5], "y": [0.5]}}
            for t, s in frames
        ],
    }


def piece(index: int, rng: random.Random) -> dict:
    """One scrap of confetti, on a ballistic arc.

    Launched from a spread near the center rather than from a single point: a
    true point source reads as an explosion, and what this wants to look like is
    a handful thrown upward.
    """
    # Aim across the upper half, biased outward. `-pi` to `0` is up in Lottie's
    # coordinates, where y grows downward.
    angle = math.pi * (-0.95 + 0.9 * (index / PIECES)) + rng.uniform(-0.18, 0.18)
    speed = rng.uniform(4.4, 9.2)

    x0 = CENTER + rng.uniform(-70, 70)
    y0 = CENTER + rng.uniform(-20, 30)

    vx = math.cos(angle) * speed
    vy = math.sin(angle) * speed
    gravity = 0.135

    # Sampled every eight frames. Thirteen points over the arc is more than the
    # eye can resolve at this size and keeps the file small.
    step = 8
    positions = []
    for frame in range(0, DURATION + 1, step):
        x = x0 + vx * frame
        y = y0 + vy * frame + 0.5 * gravity * frame * frame
        positions.append((frame, [round(x, 1), round(y, 1)]))

    # Each piece spins at its own rate and starts at its own angle, so no two
    # ever line up. Uniform rotation is the tell that a burst was generated.
    spin = rng.uniform(-540, 540)
    tilt = rng.uniform(0, 360)

    # Staggered starts across the first fifth of a second. Released together
    # they move as a sheet rather than as separate scraps.
    delay = rng.randint(0, 10)

    # Held at full opacity, then out over the last third. A piece that fades
    # from the start never looks thrown, only dropped.
    fade_from = int(DURATION * 0.62)

    width = rng.uniform(9, 17)
    height = width * rng.uniform(0.42, 0.72)

    return {
        "ddd": 0,
        "ind": index + 1,
        "ty": 4,
        "nm": f"confetti-{index}",
        "sr": 1,
        "ks": {
            "o": keyed([(delay, [0]), (delay + 3, [100]), (fade_from, [100]), (DURATION, [0])]),
            "r": keyed([(delay, [tilt]), (DURATION, [tilt + spin])]),
            "p": keyed([(delay + f, p) for f, p in positions]),
            "a": value([0, 0, 0]),
            # A slight squash on the way out, so the scraps read as flat card
            # tumbling rather than as solid chips.
            "s": keyed([(delay, [100, 100]), (DURATION, [88, 108])]),
        },
        "ao": 0,
        "shapes": [
            {
                "ty": "gr",
                "nm": "g",
                "it": [
                    {
                        "ty": "rc",
                        "d": 1,
                        "s": value([round(width, 1), round(height, 1)]),
                        "p": value([0, 0]),
                        "r": value(2),
                    },
                    {
                        "ty": "fl",
                        "c": value(rgba(rng.choice(CONFETTI))),
                        "o": value(100),
                        "r": 1,
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
        ],
        "ip": 0,
        "op": DURATION,
        "st": 0,
        "bm": 0,
    }


def flash(index: int) -> dict:
    """A single gold ring pushing out of the center.

    The confetti says "something good happened"; this says *where*. Without it
    the pieces appear to come from nowhere in particular, which is the same
    reason a firework has a shell burst and not only sparks.
    """
    return {
        "ddd": 0,
        "ind": index,
        "ty": 4,
        "nm": "flash",
        "sr": 1,
        "ks": {
            "o": keyed([(0, [0]), (4, [70]), (26, [0])]),
            "r": value(0),
            "p": value([CENTER, CENTER]),
            "a": value([0, 0, 0]),
            "s": keyed([(0, [10, 10]), (26, [150, 150])]),
        },
        "ao": 0,
        "shapes": [
            {
                "ty": "gr",
                "nm": "g",
                "it": [
                    {"ty": "el", "d": 1, "s": value([220, 220]), "p": value([0, 0])},
                    {
                        "ty": "st",
                        "c": value(rgba("#FFEFB4")),
                        "o": value(100),
                        "w": value(14),
                        "lc": 1,
                        "lj": 1,
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
        ],
        "ip": 0,
        "op": DURATION,
        "st": 0,
        "bm": 0,
    }


def build() -> dict:
    # Seeded, so the file is byte-identical on every run. A generated asset that
    # changes every time it is regenerated is a diff nobody can review, and this
    # one is committed.
    rng = random.Random(7)

    return {
        "v": "5.7.4",
        "fr": FPS,
        "ip": 0,
        "op": DURATION,
        "w": SIZE,
        "h": SIZE,
        "nm": "win",
        "ddd": 0,
        "assets": [],
        # The ring is drawn last so it sits behind the confetti — Lottie paints
        # the first layer on top.
        "layers": [piece(i, rng) for i in range(PIECES)] + [flash(PIECES + 1)],
    }


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "win.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size / 1024:.1f} KB)")
