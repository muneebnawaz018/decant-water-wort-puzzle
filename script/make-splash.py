"""Regenerate assets/splash-icon.png — the native launch mark.

    python3 script/make-splash.py

This draws the **empty** vial, pixel-for-pixel the same shape the in-app splash
renders in React Native, so the handoff between them is invisible: the OS shows
this image, React mounts, and the animated splash continues from the identical
frame by pouring liquid into it. Any drift between the two — a different radius,
a different stroke, a different size — shows up as a jump at launch.

Everything here is a fraction of the vial's width so it can be read against
`src/ui/styles/SplashScreen.styles.ts`, which is the source of truth:

    width 54, height 150      -> ASPECT
    borderWidth 3             -> STROKE
    borderTopRadius 12        -> R_TOP
    borderBottomRadius 26     -> R_BOTTOM
    shine  left 8, top 10, 9x90

The canvas is cropped tight to the vial, so `imageWidth` in app.config.ts is the
vial's width in dp — 54, matching the stylesheet exactly.

Python + Pillow, deliberately: this runs once at design time, never at build or
run time, so it is not worth a Node image dependency in package.json.
"""

from pathlib import Path

from PIL import Image, ImageDraw

# Vial metrics, as fractions of its width (see the stylesheet quoted above).
ASPECT = 150 / 54
STROKE = 3 / 54
R_TOP = 12 / 54
R_BOTTOM = 26 / 54
SHINE_X, SHINE_Y, SHINE_W, SHINE_H = 8 / 54, 10 / 150, 9 / 54, 90 / 150

# 10x the dp size, drawn supersampled — PIL has no antialiased shape drawing.
VIAL_W = 540
SS = 4

W = VIAL_W * SS
H = round(W * ASPECT)

stroke = round(W * STROKE)
r_top = round(W * R_TOP)
r_bottom = round(W * R_BOTTOM)

# Straight from `ui.glassEdge` / `ui.glassFill` / `ui.glassShine` in colors.ts.
EDGE = (255, 255, 255, round(255 * 0.32))
FILL = (255, 255, 255, round(255 * 0.08))
SHINE = (255, 255, 255, round(255 * 0.75))

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)


def vial_shape(d, inset, fill):
    """Square shoulders at the mouth, deeply rounded base.

    Two rectangles rather than one: the top and bottom radii differ, and a tube
    rounded equally at both ends reads as a pill rather than as glassware.
    """
    a, b, c, e = inset, inset, W - inset, H - inset
    mid = b + (e - b) * 0.5
    d.rounded_rectangle(
        [a, b, c, mid], radius=r_top, fill=fill, corners=(True, True, False, False)
    )
    d.rounded_rectangle(
        [a, mid - r_bottom, c, e],
        radius=r_bottom,
        fill=fill,
        corners=(False, False, True, True),
    )


# Glass: the outer shape, then the interior punched back out of it. What is left
# between the two is the stroke.
vial_shape(draw, 0, EDGE)
vial_shape(draw, stroke, (0, 0, 0, 0))

# The empty interior. Faint, but not nothing — it is what makes the glass read
# as a container rather than as an outline.
interior = Image.new("RGBA", (W, H), (0, 0, 0, 0))
vial_shape(ImageDraw.Draw(interior), stroke, FILL)
img.paste(interior, (0, 0), interior.split()[3])

# One bright stripe down the left shoulder — the highlight, not a sheen.
shine = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sx, sy = round(W * SHINE_X), round(H * SHINE_Y)
sw, sh = round(W * SHINE_W), round(H * SHINE_H)
ImageDraw.Draw(shine).rounded_rectangle(
    [sx, sy, sx + sw, sy + sh], radius=sw // 2, fill=SHINE
)
img.paste(shine, (0, 0), shine.split()[3])

OUT = Path(__file__).resolve().parent.parent / "assets" / "splash-icon.png"
img.resize((VIAL_W, round(VIAL_W * ASPECT)), Image.LANCZOS).save(OUT)
print(f"wrote {OUT} ({VIAL_W}x{round(VIAL_W * ASPECT)})")
