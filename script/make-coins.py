#!/usr/bin/env python3
"""Generate `assets/lottie/coins.json` — the payout shower.

Where it plays
--------------
The Complete screen's `Make it 2X`, once the bonus is taken. The confetti in
`win.json` already fired for *finishing the level*; this fires for *being paid*,
and the two have to say different things or the second one reads as the first
one repeating. Confetti is celebration. Coins are money.

Why generated, not downloaded
-----------------------------
Same reason as `win.json` and `brew.json`, and the argument is in
`script/make-lottie.py` at length: a committed binary nobody can regenerate
drifts from the palette the moment a colour moves. The gold here is the gold in
`colors.ts`, and it stays that way for free.

A coin shower is also, like confetti, a shape that survives being generated —
many identical pieces under one physical rule. The only thing that makes a coin
a coin rather than a disc is the spin, and a spin is arithmetic: scale the
horizontal axis by |cos| and the circle reads as a disc turning edge-on.

**A licensed download can replace this file.** If you find a coin animation worth
buying, drop it over `assets/lottie/coins.json` and delete this script — check
its licence individually first, per the README. What this guarantees is that the
slot is never empty and never off-palette, not that it beats real artwork.

Run after changing any colour it reads:

    python3 script/make-coins.py

Lottie schema notes
-------------------
Shape layers only — the subset every `lottie-react-native` version renders
identically on both platforms. Positions are baked as linear keyframes sampled
along the path rather than written as beziers with spatial tangents, which are
the fiddliest part of the format to hand-write and the easiest to get subtly
wrong.
"""

import json
import math
import pathlib
import random

# --- The animation's own frame ----------------------------------------------

FPS = 60
# 1.5 seconds: long enough for a coin to fall the height of the frame and leave,
# short enough that it is over before the player reaches for a button. Nothing
# is gated behind it finishing.
DURATION = 90
SIZE = 600
CENTRE = SIZE / 2

COINS = 26

# --- The palette ------------------------------------------------------------
#
# From `src/theme/colors.ts`. Three golds rather than one: a shower of a single
# flat colour reads as a pattern, and the face, rim and shadow of a coin are
# never the same value anyway.
GOLD_FACE = "#FFDE86"  # goldLight
GOLD_RIM = "#FFC94B"  # gold
GOLD_DEEP = "#E0A32B"  # goldDark — the edge caught in shadow
INK = "#3a2306"  # onGold, for the mark stamped on the face


def rgba(hex_colour: str) -> list[float]:
    """Lottie wants normalised floats, not bytes."""
    h = hex_colour.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [1.0]


def value(v):
    """A static property."""
    return {"a": 0, "k": v}


def keyed(frames: list[tuple[int, list[float]]]):
    """An animated property, linear between samples.

    The final keyframe carries its own `s`. The spec's examples omit it and
    every renderer accepts it; leaving it out is a common source of a property
    snapping back on the last frame.
    """
    return {
        "a": 1,
        "k": [
            {"t": t, "s": s, "i": {"x": [0.5], "y": [0.5]}, "o": {"x": [0.5], "y": [0.5]}}
            for t, s in frames
        ],
    }


def coin(index: int, rng: random.Random) -> dict:
    """One coin, thrown up and falling back through the frame.

    Thrown rather than dropped. A coin that only falls is rain; the arc is what
    makes it read as a payout being handed over. They are launched from a wide
    band near the bottom so the shower fills the frame's width instead of
    fountaining from a point — a point source is an explosion, and this is
    money arriving.
    """
    # Up and slightly outward, spread across the frame. `-pi` to `0` is upward
    # in Lottie's coordinates, where y grows downward.
    angle = -math.pi / 2 + rng.uniform(-0.55, 0.55)
    speed = rng.uniform(7.5, 12.5)

    x0 = CENTRE + rng.uniform(-190, 190)
    y0 = SIZE + rng.uniform(10, 90)

    vx = math.cos(angle) * speed
    vy = math.sin(angle) * speed
    gravity = 0.30

    # Every six frames. Sixteen samples over the arc is past what the eye can
    # resolve at this size, and keeps the file small.
    step = 6
    positions = []
    for frame in range(0, DURATION + 1, step):
        x = x0 + vx * frame
        y = y0 + vy * frame + 0.5 * gravity * frame * frame
        positions.append((frame, [round(x, 1), round(y, 1)]))

    # The spin, and the only thing that makes this a coin rather than a disc.
    #
    # Squashing the horizontal axis by |cos| turns the circle edge-on twice per
    # revolution, which is what a tumbling coin does. The vertical axis is left
    # alone: a coin flipping about its own diameter keeps its height.
    #
    # Sampled rather than expressed, because Lottie expressions are not
    # supported by `lottie-react-native` on either platform.
    spin_rate = rng.uniform(0.055, 0.115)
    phase = rng.uniform(0, math.pi)
    spins = []
    for frame in range(0, DURATION + 1, 3):
        squash = abs(math.cos(phase + spin_rate * frame))
        # Floored at 14 rather than 0: a coin that reaches literal zero width
        # disappears for a frame and flickers.
        spins.append((frame, [round(14 + 86 * squash, 1), 100]))

    # Staggered over the first third of a second. Released together they move as
    # a curtain rather than as separate coins.
    delay = rng.randint(0, 20)

    # Full opacity while it is in the air, out over the last quarter. A coin
    # that fades from the start never looks thrown, only imagined.
    fade_from = int(DURATION * 0.72)

    size = rng.uniform(34, 58)

    return {
        "ddd": 0,
        "ind": index + 1,
        "ty": 4,
        "nm": f"coin-{index}",
        "sr": 1,
        "ks": {
            "o": keyed(
                [(delay, [0]), (delay + 2, [100]), (fade_from, [100]), (DURATION, [0])]
            ),
            # A slow tilt of the whole coin, independent of the flip. Without it
            # every coin flips about the same axis and the shower looks stamped.
            "r": keyed([(delay, [rng.uniform(0, 360)]), (DURATION, [rng.uniform(0, 360)])]),
            "p": keyed([(delay + f, p) for f, p in positions]),
            "a": value([0, 0, 0]),
            "s": keyed([(delay + f, s) for f, s in spins]),
        },
        "ao": 0,
        "shapes": [
            {
                "ty": "gr",
                "nm": "g",
                "it": [
                    # The body: a filled disc with a darker rim, so the coin has
                    # an edge rather than being a flat dot.
                    {"ty": "el", "d": 1, "s": value([size, size]), "p": value([0, 0])},
                    {"ty": "fl", "c": value(rgba(GOLD_FACE)), "o": value(100), "r": 1},
                    {
                        "ty": "st",
                        "c": value(rgba(GOLD_DEEP)),
                        "o": value(100),
                        "w": value(round(size * 0.09, 1)),
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
            },
            {
                "ty": "gr",
                "nm": "mark",
                "it": [
                    # The inner ring. A coin with a plain face reads as a
                    # counter; one mark is the difference between a disc and
                    # currency, and a ring survives being 20dp tall where an
                    # engraved figure would not.
                    {
                        "ty": "el",
                        "d": 1,
                        "s": value([round(size * 0.46, 1), round(size * 0.46, 1)]),
                        "p": value([0, 0]),
                    },
                    {
                        "ty": "st",
                        "c": value(rgba(GOLD_RIM)),
                        "o": value(100),
                        "w": value(round(size * 0.10, 1)),
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
            },
        ],
        "ip": 0,
        "op": DURATION,
        "st": 0,
        "bm": 0,
    }


def sparkle(index: int, rng: random.Random) -> dict:
    """A small four-point glint, thrown with the coins.

    Cheap, and it does the work a still frame cannot: gold reads as gold because
    it catches light, and a matte disc reads as plastic however well it is
    coloured.
    """
    delay = rng.randint(4, 46)
    life = 14
    x = CENTRE + rng.uniform(-210, 210)
    y = rng.uniform(120, 460)
    size = rng.uniform(16, 30)

    return {
        "ddd": 0,
        "ind": index,
        "ty": 4,
        "nm": f"glint-{index}",
        "sr": 1,
        "ks": {
            "o": keyed(
                [
                    (delay, [0]),
                    (delay + 4, [95]),
                    (delay + life, [0]),
                    (DURATION, [0]),
                ]
            ),
            "r": value(rng.choice([0, 45])),
            "p": value([round(x, 1), round(y, 1)]),
            "a": value([0, 0, 0]),
            "s": keyed([(delay, [30, 30]), (delay + 4, [100, 100]), (delay + life, [40, 40])]),
        },
        "ao": 0,
        "shapes": [
            {
                "ty": "gr",
                "nm": "g",
                "it": [
                    # Two crossed bars rather than a star path: a plus sign at
                    # this size *is* a glint, and it costs two rectangles.
                    {
                        "ty": "rc",
                        "d": 1,
                        "s": value([round(size, 1), round(size * 0.16, 1)]),
                        "p": value([0, 0]),
                        "r": value(round(size * 0.08, 1)),
                    },
                    {
                        "ty": "rc",
                        "d": 1,
                        "s": value([round(size * 0.16, 1), round(size, 1)]),
                        "p": value([0, 0]),
                        "r": value(round(size * 0.08, 1)),
                    },
                    {"ty": "fl", "c": value(rgba("#FFEFB4")), "o": value(100), "r": 1},
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
    # Fixed seed, so a rerun is byte-identical. A regenerated file that differs
    # every time is a diff nobody can review — the same rule the icons and the
    # splash follow.
    rng = random.Random(20260808)

    layers = [coin(i, rng) for i in range(COINS)]
    # Glints last in the list, which puts them in front: a glint behind a coin
    # is a glint nobody sees.
    layers += [sparkle(COINS + i, rng) for i in range(10)]

    return {
        "v": "5.7.4",
        "fr": FPS,
        "ip": 0,
        "op": DURATION,
        "w": SIZE,
        "h": SIZE,
        "nm": "coins",
        "ddd": 0,
        "assets": [],
        "layers": layers,
    }


def main() -> None:
    out = pathlib.Path(__file__).resolve().parent.parent / "assets/lottie/coins.json"
    out.write_text(json.dumps(build(), separators=(",", ":")) + "\n")
    print(f"wrote {out.relative_to(pathlib.Path.cwd())} ({out.stat().st_size // 1024}KB)")


if __name__ == "__main__":
    main()
