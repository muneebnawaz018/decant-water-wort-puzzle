#!/usr/bin/env python3
"""Generate `assets/lottie/advert.json` — the mark on Home's rewarded-ad chip.

What it is for
--------------
The other half of the pair `make-gift.py` explains: Home's two reward chips both
carried static glyphs, and both are offers rather than destinations.

This one is a screen with a play head in it, and it is the loudest mark in the
app. It has to be — it is the only control on Home that asks the player to give
something (a minute of attention) rather than offering something they have
already earned, so it is the one that has to catch an eye that was on its way
past.

**A screen, not a bare triangle.** `Icon.tsx` makes the same point about the
static glyph it replaces: a lone play head promises the app is about to play
something of its own, and what is on offer here is somebody's advert.

The beat
--------
Everything is timed off one cycle so the parts read as cause and effect rather
than as four things that happen to be moving:

| Phase          | What moves                                              |
| -------------- | ------------------------------------------------------- |
| anticipation   | the screen squashes, the head shrinks into it           |
| the hit        | screen stretches and kicks over, head punches out       |
| the wake       | two rings leave, four sparks fan out                    |
| the settle     | the screen wobbles down, the head rides it              |
| the sweep      | a highlight crosses the glass                           |

The first version had none of this — a two percent breathe and one small pop —
and on a device it read as a still image. **Subtlety is the wrong instinct at
36dp.** A mark this size gets a fraction of a second of peripheral attention, and
anything under about ten percent of its own width simply is not seen.

Run it after changing any color it reads. The JSON is written minified and the
commit gate checks formatting, so `npm run format` is the second half of the
command, not an optional tidy-up:

    python3 script/make-advert.py && npm run format

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
# Two seconds. Shorter than the gift beside it on purpose, and not a divisor of
# it — 120 against 180 means the two marks drift in and out of step over six
# seconds and never settle into a shared rhythm. A row that pulses in unison
# reads as a loading state rather than as two separate things worth pressing.
DURATION = 120
# Every other frame. The hit is over in a fifth of a second, so this is six
# samples through the overshoot — enough that the snap does not visibly step, and
# half the keyframes of sampling every frame. See `windowed` for the rest of that
# argument.
STEP = 2

SIZE = 100
CENTER = SIZE / 2

# --- The beat, as fractions of the loop --------------------------------------

CROUCH = 0.10
HIT = 0.20
WAKE_END = 0.62
SWEEP_START = 0.60
SWEEP_END = 0.86

# --- The screen --------------------------------------------------------------

SCREEN_W = 62
SCREEN_H = 46
SCREEN_R = 9
SCREEN_STROKE = 6

# How hard the screen kicks. Ten percent is the floor for being seen at this
# size; the squash before it is what stops that reading as a glitch.
SQUASH = 0.11
KICK_DEG = 7

HEAD_R = 12.5
HEAD_POP = 0.34

# --- The wake ----------------------------------------------------------------

RING_START = 22
RING_END = 52
RING_COUNT = 2
RING_STAGGER = 0.10

SPARK_COUNT = 4
SPARK_R = 3.2
SPARK_REACH = 40

# The highlight crossing the glass. Same idea as `make-shine.py`, but there is no
# React view to clip it here, so it is sized to stay inside the screen instead.
BAND_W = 8
BAND_TILT = 22
BAND_FRACTION = 0.6

# --- The palette -------------------------------------------------------------
#
# From `src/theme/colors.ts`. The chip's tile is a blueberry gradient, so the
# mark is the ink on it: white for the screen and the head, pale gold for the
# rings and the sparks — the accent this app uses whenever something is offered.

WHITE = "#FFFFFF"
GOLD_PALE = "#FFEFB4"


def sample(fn, step: int = STEP):
    """Sample a function of the loop's own 0..1 progress into keyframes."""
    return keyed([(f, fn(f / DURATION)) for f in range(0, DURATION + 1, step)])


def windowed(fn, start: float, length: float, step: int = STEP):
    """Sample only where the part is actually moving, and hold it flat outside.

    **This is a bundle-size fix, and a large one.** Sampling nine layers every
    frame for a whole loop put this file at 244KB — for a 36dp chip icon, which
    is more than the win card's confetti. Rings and sparks are visible for about
    a third of the cycle and identical for the rest, and a flat stretch needs two
    keyframes rather than eighty.

    Every function this is used on is clamped at both ends of its window, so the
    held values match what the curve would have produced anyway.
    """
    first = max(0, int(start * DURATION) - 1)
    last = min(DURATION, int((start + length) * DURATION) + 2)

    frames = [(0, fn(0.0))]
    frames += [(f, fn(f / DURATION)) for f in range(first, last + 1, step)]
    frames.append((DURATION, fn(1.0)))
    # Ascending and unique — a duplicate `t` is a keyframe Lottie skips silently.
    seen: dict[int, list] = {}
    for t, v in frames:
        seen[t] = v
    return keyed(sorted(seen.items()))


def since(t: float, start: float, length: float) -> float:
    """Progress through a window, clamped to 0 before it and 1 after."""
    return max(0.0, min(1.0, (t - start) / length))


def hit_curve(t: float) -> float:
    """The screen's compression, -1 crouched through +1 stretched.

    Zero at both ends of the loop, so the cycle closes without a keyframe having
    to say so.
    """
    if t < CROUCH:
        # Winding up: a slow sink, which is what makes the kick land.
        return -smoothstep(t / CROUCH)
    if t < HIT:
        # The snap through neutral and out the other side.
        return -1 + 2.1 * overshoot(since(t, CROUCH, HIT - CROUCH))
    # Ringing down. Two swings, decaying, back to rest by the end of the wake.
    k = since(t, HIT, WAKE_END - HIT)
    return 1.1 * math.cos(k * math.pi * 2.4) * (1 - k) ** 1.5


def screen() -> dict:
    """The outline: squash, stretch, kick over, wobble back.

    Width and height move opposite ways. A mark that scaled evenly would grow and
    shrink, which reads as a zoom; opposing them is what reads as something being
    struck.
    """

    def scale(t: float):
        c = hit_curve(t)
        return [round(100 - SQUASH * 100 * c, 2), round(100 + SQUASH * 100 * c, 2), 100]

    def kick(t: float):
        # The tilt trails the squash by a beat, so the screen leans *after* it is
        # hit rather than at the same instant.
        c = hit_curve(max(0.0, t - 0.04))
        return [round(KICK_DEG * c, 2)]

    def bob(t: float):
        # Barely there, and doing real work: without it the mark pivots on a
        # fixed point and looks pinned to the tile.
        return [CENTER, round(CENTER - 2.2 * hit_curve(t), 2), 0]

    return shape_layer(
        6,
        "screen",
        [
            group(
                [
                    rounded_rect((SCREEN_W, SCREEN_H), SCREEN_R),
                    stroke(WHITE, SCREEN_STROKE),
                ]
            )
        ],
        transform(sample(bob), rotation=sample(kick), scale=sample(scale)),
        DURATION,
    )


def head() -> dict:
    """The play triangle: shrinks into the crouch, punches out of the hit.

    Drawn as a polygon rather than taken from `Icon.tsx`'s SVG path — that path
    is a 960-unit Material glyph with rounding built into its curves, and
    reproducing it would mean an SVG parser in a build script. Three points read
    as a play head at 36dp; the rounding would not survive the size anyway.

    The right-hand vertex sits left of the true centroid, so the triangle looks
    centered in the screen. A play head balanced on its bounding box always looks
    pushed left, which is why every icon set nudges it.
    """
    points = [
        (-HEAD_R * 0.62, -HEAD_R * 0.86),
        (-HEAD_R * 0.62, HEAD_R * 0.86),
        (HEAD_R * 0.92, 0),
    ]

    def pop(t: float):
        # The head leads the screen out of the crouch — it is the thing being
        # played, so it arrives first and the screen answers.
        c = hit_curve(max(0.0, t - 0.02))
        k = 100 + HEAD_POP * 100 * max(0.0, c) + 14 * min(0.0, c)
        return [round(k, 2), round(k, 2), 100]

    def nudge(t: float):
        # Slides right on the hit, the direction it points, and rides the
        # screen's bob. A play head that grows in place is a badge; one that
        # moves is a button.
        return [
            round(CENTER + 1 + 3.2 * max(0.0, hit_curve(t)), 2),
            round(CENTER - 2.2 * hit_curve(t), 2),
            0,
        ]

    def spin(t: float):
        """Leans **with** the screen, a couple of degrees further.

        It was counter-rotating, and that was the single thing making the mark
        look broken: the screen kicked one way and the triangle the other, so at
        the peak the two read as separate objects that happened to overlap.
        Turning together with the head slightly ahead reads as one thing being
        struck — which is the whole conceit.
        """
        return [round((KICK_DEG + 2.5) * hit_curve(max(0.0, t - 0.02)), 2)]

    return shape_layer(
        3,
        "head",
        [group([polygon(points), fill(WHITE)])],
        transform(sample(nudge), rotation=sample(spin), scale=sample(pop)),
        DURATION,
    )


def ring(index: int) -> dict:
    """One of two rings leaving on the hit, staggered.

    They start inside the screen and end outside it, which is deliberate: the
    mark sits on a colored tile with room around it, and a ring confined to the
    screen would read as something happening *in* the advert rather than as the
    chip reaching out.

    The stroke thins as the ring grows, because that is what a ring of light does
    and what a ring of paint does not.
    """
    start = HIT - 0.03 + index * RING_STAGGER
    length = 0.42

    def size(t: float):
        k = since(t, start, length)
        d = (RING_START + (RING_END - RING_START) * smoothstep(k)) * 2
        return [round(d, 2), round(d, 2)]

    def alpha(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0]
        return [round((78 - index * 22) * (1 - k) ** 1.3, 1)]

    band = dict(
        stroke(GOLD_PALE, 1),
        w=windowed(lambda t: [round(4.5 - 3.0 * since(t, start, length), 2)], start, length),
    )

    return shape_layer(
        1 + index,
        f"ring{index}",
        [group([ellipse(windowed(size, start, length)), band])],
        transform([CENTER, CENTER, 0], opacity=windowed(alpha, start, length)),
        DURATION,
    )


def spark(index: int) -> dict:
    """One of four thrown out of the screen on the hit.

    Fanned around the head rather than fired straight out, and each leaves on its
    own beat — four sparks on one frame is a shape, four staggered is a burst.
    """
    angle = math.radians(-58 + index * 41)
    start = HIT - 0.02 + index * 0.035
    length = 0.4

    def out(t: float):
        k = since(t, start, length)
        reach = SPARK_REACH * overshoot(k)
        return [
            round(CENTER + math.cos(angle) * reach, 2),
            round(CENTER + math.sin(angle) * reach, 2),
            0,
        ]

    def alpha(t: float):
        k = since(t, start, length)
        if k <= 0 or k >= 1:
            return [0]
        # In fast, out slowly. A spark that fades symmetrically looks dimmed
        # rather than thrown.
        return [round(100 * min(1.0, k * 6) * (1 - k) ** 0.8, 1)]

    def size(t: float):
        k = since(t, start, length)
        d = SPARK_R * 2 * (1 - k * 0.55)
        return [round(d, 2), round(d, 2)]

    return shape_layer(
        7 + index,
        f"spark{index}",
        [group([ellipse(windowed(size, start, length)), fill(GOLD_PALE)])],
        transform(windowed(out, start, length), opacity=windowed(alpha, start, length)),
        DURATION,
    )


def glint() -> dict:
    """The highlight crossing the glass, once the screen has settled.

    **The tilt is what sets the travel, and it is easy to forget.** A band 22
    degrees off vertical reaches further sideways than half its own width — the
    height contributes `sin(tilt)`, which at this size is more than the width
    does. The first version travelled 42% of the screen and crossed the border at
    both ends.
    """
    reach = (BAND_W / 2) * math.cos(math.radians(BAND_TILT)) + (
        SCREEN_H * BAND_FRACTION / 2
    ) * math.sin(math.radians(BAND_TILT))
    travel = SCREEN_W / 2 - SCREEN_STROKE / 2 - reach
    length = SWEEP_END - SWEEP_START

    def across(t: float):
        k = since(t, SWEEP_START, length)
        return [round(CENTER - travel + travel * 2 * smoothstep(k), 2), CENTER, 0]

    def alpha(t: float):
        k = since(t, SWEEP_START, length)
        if k <= 0 or k >= 1:
            return [0]
        return [round(58 * math.sin(k * math.pi), 1)]

    return shape_layer(
        5,
        "glint",
        [
            group(
                [
                    rounded_rect((BAND_W, SCREEN_H * BAND_FRACTION), BAND_W / 2),
                    fill(GOLD_PALE, 0.85),
                ]
            )
        ],
        transform(
            windowed(across, SWEEP_START, length),
            rotation=BAND_TILT,
            opacity=windowed(alpha, SWEEP_START, length),
        ),
        DURATION,
    )


def build() -> dict:
    return composition(
        "advert",
        SIZE,
        SIZE,
        FPS,
        DURATION,
        # Front to back: the wake over everything, then the head, the glint on
        # the glass, and the screen outline behind all of it.
        [*[ring(i) for i in range(RING_COUNT)], head(), *[spark(i) for i in range(SPARK_COUNT)], glint(), screen()],
    )


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "lottie" / "advert.json"
    out.write_text(json.dumps(build(), separators=(",", ":")))
    print(f"wrote {out} ({out.stat().st_size} bytes)")
