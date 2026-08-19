# Store graphics

The Play Store listing's two required images, and the SVG one of them is
rendered from. Regenerate with:

```bash
python3 script/make-store-graphics.py
```

| File                        | Where it goes                   |
| --------------------------- | ------------------------------- |
| `play-icon-512.png`         | Play Console → App icon         |
| `play-feature-1024x500.png` | Play Console → Feature graphic  |
| `feature-graphic.svg`       | the master, generated not drawn |

**These are outside `assets/` on purpose.** `assetBundlePatterns` is unset in
`app.config.ts`, which means it defaults to `**/*` — a PNG dropped in `assets/`
is bundled into the app, and a store graphic has no business shipping inside
the binary. Nothing in `src/` imports these and nothing should.

The icon is rendered from `assets/icons/decant-icon.svg`, the same master the
app icon uses, so the launcher and the listing cannot drift apart.

## Two things to know before editing

**The palette is duplicated, not imported.** The generator is Python and
`src/theme/colors.ts` is TypeScript. Move a colour there and it has to be moved
here by hand — no test catches this, because nothing in the app reads these
files. That is the one cost of keeping the generator out of the app's own
toolchain, and it is why every constant in the script names where it came from.

**The wordmark is system-font text, not Poppins.** librsvg resolves fonts from
what the OS has installed, and Poppins is bundled in `assets/` rather than
installed, so it falls back — Helvetica on a Mac. Close in character and fine
at this size, but it is not literally the app's typeface. Fixing it properly
means installing the family before rendering, or tracing the letterforms to
paths.

## Still missing

Phone screenshots, which cannot be generated — they have to be captured from a
running build. Two minimum, four or more to be eligible for Play promotion, at
1080px or wider. Capture from a **release** build so no dev-client chrome is in
frame. The suggested order is in `docs/08-store-listing.md` §7.
