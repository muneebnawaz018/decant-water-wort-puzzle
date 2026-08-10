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
GOLD_FACE = "#FFC94B"  # gold — the bright face inside the rim
GOLD_BRONZE = "#E7A32E"  # goldBronze — the rim, the ring and the mark
GOLD_DEEP = "#B7801C"  # goldDark — the notches cut into the rim
# The struck mark, matching `ui.onGold` — the same near-black the gold buttons
# put their labels in. A gold-on-gold mark vanishes at the size these render.
MARK_INK = "#3A2306"  # ui.onGold — the ink the gold buttons use
GOLD_SHINE = "#FFEFB4"  # goldPale — the lit edge
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


def face_layers(size: float) -> list[dict]:
    """The coin's face — the same drawing as `src/ui/chrome/Coin.tsx`.

    Flat two-tone gold with a milled edge: notches cut around a bronze rim, a
    bright face inside it, a hairline ring, and a `$` in the rim's own gold. No
    outline and no shading; both were tried and are described in the component.

    Unit for unit with the component — both scale a 60-unit design box by the
    coin's diameter — so a coin raining down the screen and the one on the
    balance pill are the same object. There is no shared source the two can be
    generated from, which is why the numbers are written the same way in both.

    **Topmost first.** Lottie paints the FIRST shape in the list on top, the
    opposite of SVG and of every drawing API this project otherwise uses. Listed
    face-first, the inset disc covered the mark and the whole shower rendered as
    plain gold blobs. Rebuild a frame as SVG after any change in here.
    """
    k = size / 60.0

    def pt(x: float, y: float) -> list[float]:
        return [round(x * k, 2), round(y * k, 2)]

    def stroked(name: str, shapes: list[dict], colour: str, width: float) -> dict:
        return {
            "ty": "gr",
            "nm": name,
            "it": shapes
            + [
                {
                    "ty": "st",
                    "c": value(rgba(colour)),
                    "o": value(100),
                    "w": value(round(width * k, 2)),
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

    def disc(name: str, radius: float, colour: str) -> dict:
        return {
            "ty": "gr",
            "nm": name,
            "it": [
                {
                    "ty": "el",
                    "d": 1,
                    "s": value([round(radius * 2 * k, 2), round(radius * 2 * k, 2)]),
                    "p": value([0, 0]),
                },
                {"ty": "fl", "c": value(rgba(colour)), "o": value(100), "r": 1},
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

    def line(a: tuple[float, float], b: tuple[float, float]) -> dict:
        return {
            "ty": "sh",
            "d": 1,
            "ks": {
                "a": 0,
                "k": {
                    "c": False,
                    "v": [pt(*a), pt(*b)],
                    "i": [pt(0, 0), pt(0, 0)],
                    "o": [pt(0, 0), pt(0, 0)],
                },
            },
        }

    # The S, three cubics. Tangents are relative to their vertex, which is the
    # one thing Lottie's shape format does differently from SVG.
    s_curve = {
        "ty": "sh",
        "d": 1,
        "ks": {
            "a": 0,
            "k": {
                "c": False,
                "v": [pt(7.5, -9), pt(-8.5, -8), pt(8.5, 6.5), pt(-7.5, 8)],
                "i": [pt(0, 0), pt(0, -7.5), pt(0, -7), pt(0, 5.5)],
                "o": [pt(0, -5.5), pt(0, 6.5), pt(0, 7.5), pt(0, 0)],
            },
        },
    }

    # A step darker than the rim, matching the component: at bronze the mark
    # sat too close to the face and read as faded rather than struck.
    mark = stroked("mark", [s_curve, line((0, -16.5), (0, 15.5))], GOLD_DEEP, 4.8)

    # The hairline ring inside the face.
    ring = {
        "ty": "gr",
        "nm": "ring",
        "it": [
            {
                "ty": "el",
                "d": 1,
                "s": value([round(41 * k, 2), round(41 * k, 2)]),
                "p": value([0, 0]),
            },
            {
                "ty": "st",
                "c": value(rgba(GOLD_BRONZE)),
                "o": value(100),
                "w": value(round(1.6 * k, 2)),
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

    # Notches around the rim. A count rather than a spacing: they have to close
    # the circle exactly, or the last gap is wider than the rest.
    #
    # Eighteen here against the component's twenty-eight, and the difference is
    # size on disk. Every notch is a separate path in the file, times a coin,
    # times twenty-six coins: at 28 the shower was 264KB, and these render at a
    # fraction of the frame's own scale where the extra ones are not resolvable.
    notches = [
        line(
            (math.cos(2 * math.pi * i / 18) * 25.5, math.sin(2 * math.pi * i / 18) * 25.5),
            (math.cos(2 * math.pi * i / 18) * 30.0, math.sin(2 * math.pi * i / 18) * 30.0),
        )
        for i in range(18)
    ]

    return [
        mark,
        ring,
        disc("face", 25.5, GOLD_FACE),
        stroked("milling", notches, GOLD_DEEP, 2.6),
    ]


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
    # Higher than it was (7.5-12.5). Apex is speed squared over twice gravity,
    # so at the old top end a coin reached about a third of the frame and the
    # shower stayed in the bottom band — it read as coins nudged rather than
    # thrown. At 15.5 the fastest reach roughly two thirds of the way up, which
    # is where the eye already is when a payout is announced.
    speed = rng.uniform(10.5, 15.5)

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

    # Against a 600-unit frame that is scaled to fill the screen, so these are
    # a fraction of the device's width rather than points. Was 34-58 and read
    # as saucers: a payout is a lot of coins, not a few big ones, and the size
    # is what says which. The face keeps every detail at this scale.
    size = rng.uniform(18, 31)

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
        # Painted back to front: Lottie draws the LAST shape in the list
        # underneath, so the body has to come after the face that sits on it.
        "shapes": face_layers(size)
        + [
            {
                "ty": "gr",
                "nm": "body",
                "it": [
                    # Gold, with the same near-black outline the UI coin carries.
                    # A darker gold rim was here and it disappeared against the
                    # face at these sizes — spec §9 asks for bold dark outlines
                    # for exactly this reason.
                    {"ty": "el", "d": 1, "s": value([size, size]), "p": value([0, 0])},
                    {"ty": "fl", "c": value(rgba(GOLD_BRONZE)), "o": value(100), "r": 1},
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
