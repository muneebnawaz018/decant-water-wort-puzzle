#!/usr/bin/env python3
"""
Render the Play Store graphics from the app's own palette.

Two files, neither of which ships inside the binary — they live in `store/`
rather than `assets/` for exactly that reason. `assetBundlePatterns` is unset
in `app.config.ts`, which means it defaults to `**/*`, so a PNG dropped in
`assets/` would be bundled into the app for no reason.

    python3 script/make-store-graphics.py

Writes `store/feature-graphic.svg` and renders both PNGs beside it. Same
sharp-cli trick as `make-icons.sh`: it writes PNG bytes under the *source*
basename, extension and all, so the file it leaves behind is called `<name>.svg`
and is a PNG. Hence the rename.

The colours below are copied from `src/theme/colors.ts` rather than imported —
this is Python and that is TypeScript. **If the palette moves, move them here
too**; there is no test that catches the drift, because nothing in the app reads
these files.
"""

import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'store'

W, H = 1024, 500

# From `colours` in src/theme/colors.ts.
NIGHT, NIGHT_DEEP = '#2E1A5E', '#140A32'
LAMP, PLUM, INK_MUTED, INK = '#FFBE64', '#A24DFF', '#B7A6E6', '#F4ECFF'
EMBOSS = '#5A3200'

# Board liquids, in the `pieces` separation order.
LIQ = ['#22C9EC', '#FF8A1E', '#FF4FA6', '#A24DFF', '#A6E82A']

# Glass geometry, proportional to the app icon's 300x540 vial.
VW, VH, GAP, COUNT = 74.0, 190.0, 26.0, 4
BLOCK = COUNT * VW + (COUNT - 1) * GAP
X0 = W - 104 - BLOCK          # right edge inside Play's 10% safe zone
VY = 146.0

# The icon uses 0.46 of the width for the shoulder. At this size that reads as a
# capsule rather than a tube, so the feature graphic narrows it.
SHOULDER = 0.34

# Part-sorted, not solved. A finished board does not show what the game is.
BOARDS = [
    [LIQ[0], LIQ[0], LIQ[1]],
    [LIQ[2], LIQ[3], LIQ[3]],
    [LIQ[1], LIQ[1], LIQ[2], LIQ[2]],
    [LIQ[3], LIQ[4]],
]

# Placed rather than random, so a rerun produces an identical file.
MOTES = [(148, 96, 2.6, .34), (318, 402, 2.1, .26), (86, 352, 1.9, .3),
         (470, 120, 2.3, .22), (596, 424, 2.0, .24), (930, 96, 2.4, .3),
         (700, 74, 1.8, .2), (250, 458, 1.7, .2)]


def vial(i, x, y, w, h, fills):
    """One glass: clipped liquid, gloss, seams, then the outline over the top."""
    rt, rb = w * SHOULDER, w * 0.44
    d = (f'M{x} {y+rt} Q{x} {y} {x+rt} {y} L{x+w-rt} {y} Q{x+w} {y} {x+w} {y+rt} '
         f'L{x+w} {y+h-rb} Q{x+w} {y+h} {x+w-rb} {y+h} '
         f'L{x+rb} {y+h} Q{x} {y+h} {x} {y+h-rb} Z')
    seg = h / 4.0
    o = [f'<clipPath id="c{i}"><path d="{d}"/></clipPath>',
         f'<path d="{d}" fill="#ffffff" fill-opacity="0.07"/>',
         f'<g clip-path="url(#c{i})">']

    for n, fill in enumerate(fills):
        sy = y + h - (n + 1) * seg
        o.append(f'<rect x="{x-2}" y="{sy}" width="{w+4}" height="{seg+1}" fill="{fill}"/>')
        o.append(f'<rect x="{x-2}" y="{sy}" width="{w+4}" height="{seg+1}" fill="url(#gloss)"/>')
        # The seam. Without it two same-colour segments read as one tall band,
        # and the vial stops looking like four units — which is the thing that
        # tells a player what the game is.
        if n:
            o.append(f'<rect x="{x-2}" y="{sy+seg-0.9}" width="{w+4}" height="1.8" fill="#000" opacity="0.14"/>')
            o.append(f'<rect x="{x-2}" y="{sy+seg-2.3}" width="{w+4}" height="1.1" fill="#fff" opacity="0.2"/>')

    if fills:
        o.append(f'<rect x="{x-2}" y="{y+h-len(fills)*seg}" width="{w+4}" '
                 f'height="2.3" fill="#fff" opacity="0.42"/>')
    o.append(f'<rect x="{x+w*0.16}" y="{y+h*0.10}" width="{w*0.082}" height="{h*0.44}" '
             f'rx="{w*0.041}" fill="#fff" opacity="0.3"/>')
    o.append('</g>')
    o.append(f'<path d="{d}" fill="none" stroke="#CBC5E4" stroke-opacity="0.55" stroke-width="3.6"/>')
    return '\n'.join(o)


def build_svg():
    vials = '\n'.join(
        vial(i, X0 + i * (VW + GAP), VY, VW, VH, BOARDS[i]) for i in range(COUNT)
    )
    motes = '\n'.join(
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#FFEFB4" opacity="{op}"/>'
        for cx, cy, r, op in MOTES
    )
    sx, sw, sy = X0 - 18, BLOCK + 36, VY + VH + 8

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
  <linearGradient id="ground" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="{NIGHT}"/><stop offset="1" stop-color="{NIGHT_DEEP}"/></linearGradient>
  <radialGradient id="lamp" cx="0.16" cy="0.02" r="0.9">
    <stop offset="0" stop-color="{LAMP}" stop-opacity="0.28"/>
    <stop offset="0.62" stop-color="{LAMP}" stop-opacity="0"/></radialGradient>
  <radialGradient id="wash" cx="0.9" cy="1.02" r="0.8">
    <stop offset="0" stop-color="{PLUM}" stop-opacity="0.32"/>
    <stop offset="0.6" stop-color="{PLUM}" stop-opacity="0"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFEFB4"/><stop offset="0.48" stop-color="#FFD170"/>
    <stop offset="1" stop-color="#E7A32E"/></linearGradient>
  <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.02"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.10"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#ground)"/>
<rect width="{W}" height="{H}" fill="url(#wash)"/>
<rect width="{W}" height="{H}" fill="url(#lamp)"/>
{motes}
{vials}
<rect x="{sx}" y="{sy}" width="{sw}" height="18" rx="9" fill="url(#gold)"/>
<rect x="{sx+6}" y="{sy+2.5}" width="{sw-12}" height="5" rx="2.5" fill="#fff" opacity="0.4"/>
<g font-family="Poppins, Avenir Next, Helvetica Neue, Helvetica, Arial, sans-serif">
  <text x="104" y="238" font-size="94" font-weight="700" letter-spacing="1" fill="{EMBOSS}" opacity="0.9">DECANT</text>
  <text x="104" y="234" font-size="94" font-weight="700" letter-spacing="1" fill="url(#gold)">DECANT</text>
  <text x="107" y="285" font-size="27" font-weight="600" letter-spacing="6.5" fill="{INK_MUTED}">WATER SORT PUZZLE</text>
  <text x="107" y="346" font-size="28" font-weight="500" fill="{INK}" opacity="0.84">No timers. No fails. Just calm.</text>
</g>
</svg>'''


def render(svg_path, png_path, w, h):
    """sharp-cli, fetched by npx — same reasoning as make-icons.sh."""
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ['npx', '--yes', 'sharp-cli', '--input', str(svg_path),
             '--output', tmp, 'resize', str(w), str(h)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        # It keeps the source basename, extension included.
        shutil.move(str(pathlib.Path(tmp) / svg_path.name), str(png_path))
    print(f'  {png_path.relative_to(ROOT)}  ({w}x{h})')


def main():
    OUT.mkdir(exist_ok=True)
    svg = OUT / 'feature-graphic.svg'
    svg.write_text(build_svg())
    print(f'Wrote {svg.relative_to(ROOT)}')

    render(svg, OUT / 'play-feature-1024x500.png', 1024, 500)
    # The store icon comes from the same master the app icon does.
    render(ROOT / 'assets' / 'icons' / 'decant-icon.svg',
           OUT / 'play-icon-512.png', 512, 512)


if __name__ == '__main__':
    main()
