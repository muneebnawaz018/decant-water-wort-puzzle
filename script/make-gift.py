#!/usr/bin/env python3
"""Generate `assets/lottie/gift.json` — the mark on Home's daily reward chip.

What it is for
--------------
Home's two reward chips carried static glyphs from `Icon.tsx`: a gift box and a
play triangle, each on a coloured tile. They read as list bullets. Both chips are
offers rather than destinations — one pays coins today, the other pays coins for
a watch — and an offer that sits perfectly still is indistinguishable from a
label.

So: a box whose lid lifts, hangs, and drops back with a bounce, while a bow
squashes on the landing and three sparks pop above it.

Run it after changing any colour it reads. The JSON is written minified and the
commit gate checks formatting, so `npm run format` is the second half of the
command, not an optional tidy-up:

    python3 script/make-gift.py && npm run format

See `script/lottie_kit.py` for the schema rules every generator here follows.
"""

import json
import math
import pathlib

from lottie_kit import (
    composition,
    ellipse,
    fill,
    group,
    keyed,
    overshoot,
    rounded_rect,
    shape_layer,
    smoothstep,
    transform,
    value,
)

# --- The animation's own frame ----------------------------------------------

FPS = 60
# Three seconds, and two of them are the box sitting still. A chip mark that
# never rests is a chip mark the eye stops trusting — the pause is what makes the
# lift read as an event rather than as a fidget.
DURATION = 180
LIFT_START = 0
LIFT_PEAK = 26
DROP_END = 52

# Sampled every two frames through the move. It is over in under a second, so
# there is nothing to gain from a coarser step and a visible stagger to lose.
STEP = 2

# The tile renders at 36dp. The frame hugs the box, because `resizeMode`
# `contain` fits the whole composition into its box, empty air included.
SIZE = 100
CENTRE = SIZE / 2

# --- The box -----------------------------------------------------------------

BOX_W = 58
BOX_H = 40
BOX_R = 7
# The body sits below centre so the lid, the bow and the sparks have somewhere to
# go without the whole mark drifting downward in its tile.
BOX_TOP = 52

LID_W = 66
LID_H = 15
LID_R = 5
LID_REST_Y = BOX_TOP - LID_H / 2 + 1
LID_RISE = 15
LID_TILT = 7

RIBBON_W = 9
BOW_R = 9

SPARK_R = 3.4
SPARK_REACH = 26

# --- The palette -------------------------------------------------------------
#
# From `src/theme/colors.ts`. The chip's tile is already a mango gradient, so the
# mark is the ink printed on it — white for the box, pale gold for the ribbon and
# the sparks, which is the pairing the coin badge uses.

WHITE = "#FFFFFF"
GOLD_PALE = "#FFEFB4"


def sample(fn, start: int, end: int, step: int = STEP):
    """Sample a function of the move's own 0..1 progress into keyframes.

    Held at its end value for the rest of the loop, so the long pause needs no
    keys of its own — one flat segment rather than a second copy of the pose.
    """
    frames = [(f, fn(min(1.0, (f - start) / (end - start)))) for f in range(start, end + 1, step)]
    if frames[-1][0] != end:
        frames.append((end, fn(1.0)))
    frames.append((DURATION, fn(1.0)))
    return keyed(frames)


def lid_offset(t: float) -> float:
    """Up fast, hang, then down onto the box.

    Asymmetric on purpose: the rise is the part being read, the fall is gravity,
    and gravity is quicker than a hand. A symmetric lift reads as a hover.
    """
    up_ends = 0.42
    hang_ends = 0.58
    if t <= up_ends:
        return -LID_RISE * smoothstep(t / up_ends)
    if t <= hang_ends:
        return -LID_RISE
    fall = (t - hang_ends) / (1 - hang_ends)
    return -LID_RISE * (1 - fall * fall)


def box() -> dict:
    """The body, squashing when the lid lands.

    The squash is the whole reason the drop reads as weight. Width and height
    move opposite ways and the bottom edge stays put — a box that scaled evenly
    would shrink, not compress.
    """

    def squash(t: float):
        # Nothing until the lid arrives, then a quick compress and release.
        landing = 0.72
        if t < landing:
            return [100, 100]
        k = (t - landing) / (1 - landing)
        amount = math.sin(k * math.pi) * 6
        return [round(100 + amount, 1), round(100 - amount, 1)]

    def height(t: float):
        # The transform scales about the group's anchor, which is its centre, so
        # a squash alone would lift the base off the floor. Sliding the centre
        # down by half the loss pins the bottom edge.
        s = squash(t)[1] / 100
        return [CENTRE, round(BOX_TOP + BOX_H / 2 - (BOX_H * (1 - s)) / 2, 2), 0]

    return shape_layer(
        3,
        "box",
        [
            group([rounded_rect((BOX_W, BOX_H), BOX_R), fill(WHITE)]),
            # Ribbon both ways. One band down the front reads as a stripe; a
            # cross is what says wrapped.
            group([rounded_rect((BOX_W, RIBBON_W * 0.78), 0), fill(GOLD_PALE)]),
            group([rounded_rect((RIBBON_W, BOX_H), 0), fill(GOLD_PALE)]),
        ],
        transform(
            sample(height, LIFT_START, DROP_END),
            scale=sample(lambda t: squash(t) + [100], LIFT_START, DROP_END),
        ),
        DURATION,
    )


def lid() -> dict:
    """The lid and the bow, moving as one.

    One layer rather than two, because they never move independently and two
    layers would be two chances for them to drift apart by a pixel.
    """
    return shape_layer(
        2,
        "lid",
        [
            group([rounded_rect((LID_W, LID_H), LID_R), fill(WHITE)]),
            # The bow: two loops meeting over the ribbon.
            group([ellipse((BOW_R * 2, BOW_R * 1.5), (-BOW_R * 0.75, -LID_H)), fill(GOLD_PALE)]),
            group([ellipse((BOW_R * 2, BOW_R * 1.5), (BOW_R * 0.75, -LID_H)), fill(GOLD_PALE)]),
        ],
        transform(
            sample(lambda t: [CENTRE, round(LID_REST_Y + lid_offset(t), 2), 0], LIFT_START, DROP_END),
            # A slight tilt at the top of the lift, unwound by the time it lands.
            # A lid that rises perfectly square reads as a panel on a rail.
            rotation=sample(
                lambda t: [round(LID_TILT * math.sin(min(1.0, t / 0.58) * math.pi), 2)],
                LIFT_START,
                DROP_END,
            ),
        ),
        DURATION,
    )


def spark(index: int) -> dict:
    """One of three, thrown out of the box as the lid opens.

    Fanned rather than fired straight up, and each one leaves on its own beat —
    three sparks on the same frame is a shape, three staggered is a burst.
    """
    angle = math.radians(-90 + (index - 1) * 42)
    delay = index * 0.08

    def out(t: float):
        k = max(0.0, min(1.0, (t - delay) / (0.55 - delay * 0.5)))
        reach = SPARK_REACH * overshoot(k)
        return [
            round(CENTRE + math.cos(angle) * reach, 2),
            round(LID_REST_Y - 6 + math.sin(angle) * reach, 2),
            0,
        ]

    def alpha(t: float):
        k = max(0.0, min(1.0, (t - delay) / (0.55 - delay * 0.5)))
        # In fast, out slowly. A spark that fades symmetrically looks like it is
        # being dimmed rather than thrown.
        return [round(100 * min(1.0, k * 5) * (1 - k) ** 0.7, 1)]

    def size(t: float):
        k = max(0.0, min(1.0, (t - delay) / (0.55 - delay * 0.5)))
        d = SPARK_R * 2 * (1 - k * 0.45)
        return [round(d, 2), round(d, 2)]

    return shape_layer(
        4 + index,
        f"spark{index}",
        [group([ellipse(sample(size, LIFT_START, DROP_END)), fill(GOLD_PALE)])],
        transform(
            sample(out, LIFT_START, DROP_END),
            opacity=sample(alpha, LIFT_START, DROP_END),
        ),
        DURATION,
    )


def build() -> dict:
    return composition(
        "gift",
        SIZE,
        SIZE,
        FPS,
        DURATION,
        # Sparks in front, then the lid, then the body behind it — the lid has to
        # cover the top of the box or the seam shows when it lands.
        [spark(0), spark(1), spark(2), lid(), box()],
    )


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "gift.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
