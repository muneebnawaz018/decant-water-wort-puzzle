"""Shared Lottie primitives for the generator scripts beside this file.

Four scripts had grown their own copies of `rgba`, `value`, `keyed`, `group` and
`shape_layer` — identical bodies, drifting docstrings, and a fix to one that
never reached the others. The chip marks made it six, which is where a copied
helper stops being cheaper than an import.

What stays in the individual scripts is everything that is a *choice*: the frame,
the timing, which palette entries suit that mark, and the shapes themselves. This
file holds only the parts of the format that are the same wherever they appear.

Schema notes that apply to everything built here
------------------------------------------------
Shape layers only — no images, no expressions, no masks, no trim paths. That is
the subset every `lottie-react-native` version renders identically across
lottie-android, lottie-ios and lottie-web. Trim in particular resolves
differently depending on where the modifier sits in a group's item list, so a
hand-written one is a coin toss on whether the shape draws at all.

`ao`, `sr`, `st`, `bm` and the rest on a layer are not optional in practice:
several renderers read them without a default, and a missing one is a layer that
silently does not draw.
"""


def rgba(hex_colour: str, alpha: float = 1.0) -> list[float]:
    """Lottie wants normalised floats, not bytes."""
    h = hex_colour.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [alpha]


def value(v):
    """A static property."""
    return {"a": 0, "k": v}


def keyed(frames):
    """An animated property, linear between samples.

    Linear rather than eased, and sampled where a curve is wanted. Lottie's
    tangents are the fiddliest part of the format to hand-write and the easiest
    to get subtly wrong; a slightly coarse sample is far easier to spot than a
    handle pointing the wrong way.
    """
    return {
        "a": 1,
        "k": [
            {"t": t, "s": s, "i": {"x": [0.5], "y": [0.5]}, "o": {"x": [0.5], "y": [0.5]}}
            for t, s in frames
        ],
    }


def smoothstep(t: float) -> float:
    """Ease in and out, without a tangent in sight."""
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def overshoot(t: float) -> float:
    """Ease out past 1 and settle back — the spring every UI pop wants.

    Cheap and closed-form rather than a real spring solve, because what is needed
    here is the *shape*: reach the target early, go a little past it, come back.
    A linear arrival is the single clearest tell that an animation was generated.
    """
    t = min(1.0, max(0.0, t))
    return 1 + (t - 1) ** 2 * (2.6 * (t - 1) + 1.6)


def rounded_rect(size, radius, position=(0, 0)) -> dict:
    return {
        "ty": "rc",
        "d": 1,
        "s": size if isinstance(size, dict) else value(list(size)),
        "p": position if isinstance(position, dict) else value(list(position)),
        "r": value(radius),
        "nm": "rect",
    }


def ellipse(size, position=(0, 0)) -> dict:
    return {
        "ty": "el",
        "s": size if isinstance(size, dict) else value(list(size)),
        "p": position if isinstance(position, dict) else value(list(position)),
        "nm": "el",
    }


def polygon(points, closed: bool = True) -> dict:
    """A straight-edged path. Corners only — every tangent is zero."""
    zeros = [[0, 0] for _ in points]
    return {
        "ty": "sh",
        "d": 1,
        "ks": value({"i": zeros, "o": list(zeros), "v": [list(p) for p in points], "c": closed}),
        "nm": "poly",
    }


def star(points: int, outer: float, inner: float, rotation: float = 0) -> dict:
    """A pointed sparkle, as an explicit path.

    Lottie has a star primitive (`ty: "sr"`), and it is not used here: it is one
    of the shapes the three renderers disagree about most — lottie-web honours
    `is` / `os` inner-roundness, the mobile ones vary — and a sparkle is eight
    points of trivial trigonometry. An explicit path renders identically
    everywhere, which is the rule the whole `script/` directory follows.
    """
    import math

    verts = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        a = math.radians(rotation - 90 + i * 180 / points)
        verts.append([round(r * math.cos(a), 3), round(r * math.sin(a), 3)])
    return polygon(verts)


def fill(colour: str, alpha: float = 1.0, opacity=100) -> dict:
    return {
        "ty": "fl",
        "c": value(rgba(colour, alpha)),
        "o": opacity if isinstance(opacity, dict) else value(opacity),
        "r": 1,
        "nm": "fill",
    }


def stroke(colour: str, width: float, alpha: float = 1.0, opacity=100) -> dict:
    """Round caps and round joins, per the app's look.

    A butt-capped stroke ends in a flat chop that reads as broken; rounded, the
    same stroke reads as something someone drew.
    """
    return {
        "ty": "st",
        "c": value(rgba(colour, alpha)),
        "o": opacity if isinstance(opacity, dict) else value(opacity),
        "w": value(width),
        "lc": 2,
        "lj": 2,
        "nm": "stroke",
    }


def group(items: list, position=(0, 0), scale=None, rotation=0, opacity=100) -> dict:
    """Shapes need a group with its own transform or nothing positions.

    The group transform is the one to reach for when a *part* has to move
    independently of its layer — a lid lifting off a box, say. Anything that
    moves as a whole belongs on the layer instead, where it costs one transform
    rather than one per shape.
    """
    return {
        "ty": "gr",
        "it": items
        + [
            {
                "ty": "tr",
                "p": position if isinstance(position, dict) else value(list(position)),
                "a": value([0, 0]),
                "s": scale if isinstance(scale, dict) else value(list(scale or [100, 100])),
                "r": rotation if isinstance(rotation, dict) else value(rotation),
                "o": opacity if isinstance(opacity, dict) else value(opacity),
                "sk": value(0),
                "sa": value(0),
            }
        ],
        "nm": "group",
    }


def transform(position, rotation=0, opacity=100, scale=None, anchor=(0, 0, 0)) -> dict:
    return {
        "o": opacity if isinstance(opacity, dict) else value(opacity),
        "r": rotation if isinstance(rotation, dict) else value(rotation),
        "p": position if isinstance(position, dict) else value(list(position)),
        "a": value(list(anchor)),
        "s": scale if isinstance(scale, dict) else value(list(scale or [100, 100, 100])),
    }


def shape_layer(index: int, name: str, shapes: list, ks: dict, duration: int) -> dict:
    return {
        "ddd": 0,
        "ind": index,
        "ty": 4,
        "nm": name,
        "sr": 1,
        "ks": ks,
        "ao": 0,
        "shapes": shapes,
        "ip": 0,
        "op": duration + 1,
        "st": 0,
        "bm": 0,
    }


def composition(name: str, width: int, height: int, fps: int, duration: int, layers: list) -> dict:
    """Lottie draws the *first* layer on top, so `layers` runs front to back."""
    return {
        "v": "5.7.4",
        "fr": fps,
        "ip": 0,
        "op": duration,
        "w": width,
        "h": height,
        "nm": name,
        "ddd": 0,
        "assets": [],
        "layers": layers,
    }
