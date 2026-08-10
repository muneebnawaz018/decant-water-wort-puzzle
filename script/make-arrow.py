#!/usr/bin/env python3
"""Generate `assets/lottie/arrow.json` — the mark on Home's Continue chip.

What it is for
--------------
The green disc at the right of the Continue card. `HomeScreen.styles.ts` already
says what it is: a signpost pointing at the card, not a button competing with it,
because the whole card is the tap target. A signpost that never points is a
decoration, and that is exactly how a static glyph read there.

So it points, continuously: two chevrons pulse outward ahead of the arrow, the
arrow itself is drawn on and nudges after them, and a ring leaves the disc on the
beat. The order matters — the chevrons lead, so the eye is pulled rightward
*before* the arrow moves, which is what makes the mark read as direction rather
than as a wobble.

**An arrow, not a play triangle.** The card says Continue, and a media glyph
promises a start rather than a resume — the same note `HomeScreen` carries at the
icon it replaces.

Run it after changing any colour it reads. The JSON is written minified and the
commit gate checks formatting, so `npm run format` is the second half of the
command, not an optional tidy-up:

    python3 script/make-arrow.py && npm run format

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
    polygon,
    rounded_rect,
    shape_layer,
    smoothstep,
    stroke,
    transform,
)

# --- The animation's own frame ----------------------------------------------

FPS = 60
# 1.7 seconds. Prime-ish against the two chips below it (2s and 3s) on purpose:
# three marks on one screen that share a divisor eventually beat together, and a
# home screen pulsing in time reads as a loading state.
DURATION = 102
STEP = 2

SIZE = 100
CENTRE = SIZE / 2

# --- The beat ----------------------------------------------------------------

NUDGE_START = 0.16
NUDGE_LENGTH = 0.34
CHEVRON_LEAD = 0.10

# --- The arrow ---------------------------------------------------------------

SHAFT_LEN = 30
SHAFT_W = 7.5
HEAD_LEN = 15
HEAD_HALF = 12.5
# Pulled left of the frame's centre so the head, not the whole glyph, sits in the
# middle of the disc. An arrow centred on its bounding box always looks pushed
# right, because the head carries the visual weight.
ARROW_X = CENTRE - 5

NUDGE = 7

CHEVRON_W = 5.5
CHEVRON_HALF = 9
CHEVRON_GAP = 13

RING_START = 20
RING_END = 46

# --- The palette -------------------------------------------------------------
#
# From `src/theme/colors.ts`. The disc is a translucent accent wash, so the mark
# is `accentBright`, exactly what the static glyph used.
#
# **One colour, separated by alpha, not two greens.** A second pale green would
# be a palette entry invented in a build script — the thing `no-raw-colour` exists
# to stop on the TypeScript side, and no less wrong here. The trail and the ring
# read as lighter because they are thinner and more transparent, which is what
# light actually does.

ACCENT_BRIGHT = "#7BF0A6"


def sample(fn, step: int = STEP):
    return keyed([(f, fn(f / DURATION)) for f in range(0, DURATION + 1, step)])


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


def travel(t: float) -> float:
    """The nudge: out with a spring, back with a settle. Zero at both ends."""
    k = since(t, NUDGE_START, NUDGE_LENGTH)
    if k <= 0 or k >= 1:
        return 0.0
    # One push and one recovery, the push shaped by the overshoot so it arrives
    # early and drifts the last of the way.
    if k < 0.45:
        return overshoot(k / 0.45)
    return 1 - smoothstep((k - 0.45) / 0.55)


def chevron_points(width: float, half: float) -> list:
    """A `>` drawn as a closed sliver rather than a stroked polyline.

    A stroke with round caps would need three vertices and a join that renders
    slightly differently on each platform at 5dp. Six points is unambiguous.
    """
    return [
        (-width, -half),
        (0, 0),
        (-width, half),
        (-width + width * 0.62, half),
        (width * 0.62 - width + width * 0.62, 0),
        (-width + width * 0.62, -half),
    ]


def arrow() -> dict:
    """Shaft and head, moving as one and stretching into the push.

    The stretch is only on the shaft — the head keeps its shape, because a
    deforming arrowhead reads as a rendering error rather than as speed.
    """

    def slide(t: float):
        return [round(ARROW_X + NUDGE * travel(t), 2), CENTRE, 0]

    def stretch(t: float):
        # Wider and a touch shorter as it leaves, which is the oldest trick in
        # the book for making a small move read as a fast one.
        k = travel(t)
        return [round(100 + 9 * k, 2), round(100 - 5 * k, 2), 100]

    head = polygon(
        [
            (SHAFT_LEN / 2 - HEAD_LEN, -HEAD_HALF),
            (SHAFT_LEN / 2 + HEAD_LEN * 0.28, 0),
            (SHAFT_LEN / 2 - HEAD_LEN, HEAD_HALF),
        ]
    )

    return shape_layer(
        3,
        "arrow",
        [
            group([head, fill(ACCENT_BRIGHT)]),
            group(
                [
                    rounded_rect((SHAFT_LEN, SHAFT_W), SHAFT_W / 2, (-3, 0)),
                    fill(ACCENT_BRIGHT),
                ]
            ),
        ],
        transform(windowed(slide, NUDGE_START, NUDGE_LENGTH), scale=windowed(stretch, NUDGE_START, NUDGE_LENGTH)),
        DURATION,
    )


def chevron(index: int) -> dict:
    """One of two, thrown ahead of the arrow.

    They lead it by design: the second starts before the first has finished, so
    the pair reads as a wave running rightward rather than as two blinks. Each
    fades as it goes, since a chevron that arrives at full strength competes with
    the arrowhead it is supposed to be pointing away from.
    """
    start = NUDGE_START - CHEVRON_LEAD + index * 0.07
    length = 0.30
    base = ARROW_X + SHAFT_LEN / 2 + CHEVRON_GAP

    def out(t: float):
        k = since(t, start, length)
        return [round(base + 12 * smoothstep(k), 2), CENTRE, 0]

    def alpha(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0]
        # In quickly, out slowly, so the trail thins ahead of the arrow.
        return [round((72 - index * 26) * min(1.0, k * 5) * (1 - k) ** 1.2, 1)]

    return shape_layer(
        4 + index,
        f"chevron{index}",
        [group([polygon(chevron_points(CHEVRON_W, CHEVRON_HALF)), fill(ACCENT_BRIGHT)])],
        transform(windowed(out, start, length), opacity=windowed(alpha, start, length)),
        DURATION,
    )


def ring() -> dict:
    """A ring leaving the disc on the beat.

    It ends wider than the disc it sits in, which is the point: `styles.goChip`
    clips to a 46dp circle, so the last third of the ring's life is spent being
    cut off by the disc's own edge. That reads as light escaping the chip rather
    than as a circle stopping — and it costs nothing, because the clip was
    already there for the tap burst.
    """
    start = NUDGE_START - 0.02
    length = 0.40

    def size(t: float):
        k = since(t, start, length)
        d = (RING_START + (RING_END - RING_START) * smoothstep(k)) * 2
        return [round(d, 2), round(d, 2)]

    def alpha(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0]
        return [round(64 * (1 - k) ** 1.4, 1)]

    band = dict(
        stroke(ACCENT_BRIGHT, 1),
        w=windowed(lambda t: [round(4.5 - 3.0 * since(t, start, length), 2)], start, length),
    )

    return shape_layer(
        1,
        "ring",
        [group([ellipse(windowed(size, start, length)), band])],
        transform([CENTRE, CENTRE, 0], opacity=windowed(alpha, start, length)),
        DURATION,
    )


def glow() -> dict:
    """A soft disc breathing under everything, so the chip is never fully still.

    The one part that runs the whole loop rather than on the beat. Without it the
    mark is inert for two thirds of its cycle, and a signpost that is inert most
    of the time is a signpost you stop noticing.
    """

    def breathe(t: float):
        k = 26 + 3.5 * math.sin(2 * math.pi * t)
        return [round(k * 2, 2), round(k * 2, 2)]

    def alpha(t: float):
        return [round(15 + 7 * math.sin(2 * math.pi * t), 1)]

    return shape_layer(
        6,
        "glow",
        [group([ellipse(sample(breathe, 6)), fill(ACCENT_BRIGHT)])],
        transform([CENTRE, CENTRE, 0], opacity=sample(alpha, 6)),
        DURATION,
    )


def build() -> dict:
    return composition(
        "arrow",
        SIZE,
        SIZE,
        FPS,
        DURATION,
        # Front to back: the ring over everything, the chevrons ahead of the
        # arrow, and the glow behind all of it.
        [ring(), chevron(0), chevron(1), arrow(), glow()],
    )


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "arrow.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
