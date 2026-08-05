# App icons

Vector masters. **These are the source** — the PNGs beside them in `assets/`
are generated and should never be edited by hand.

Edit an SVG, then:

```bash
./script/make-icons.sh
npm run prebuild:clean   # push the new PNGs into android/ and ios/
```

## Files

| File                            | Renders to                         | Notes                                                   |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| `decant-icon.svg`               | `icon.png` 1024, `favicon.png` 512 | Master. iOS, web, general. Opaque — iOS rejects alpha.  |
| `decant-android-foreground.svg` | `android-icon-foreground.png` 1024 | Adaptive foreground. Transparent, padded to safe zone.  |
| `decant-android-background.svg` | `android-icon-background.png` 1024 | Adaptive background, the purple gradient.               |
| `decant-icon-mono.svg`          | `android-icon-monochrome.png` 1024 | Android 13+ themed icon. White silhouette, transparent. |

**One icon design, four files.** The single-vial mark is the app's icon
everywhere; the other three are the layers Android needs to render that same
mark, not alternative artwork. Adding a second design is how an app ends up
with one icon on the launcher and a different one in the store.

The delivered set had two extras, both gone. `decant-icon-web.svg` was
byte-identical to `decant-icon.svg`, so the favicon renders from the master —
a second copy of one drawing is a thing to forget to update.
`decant-icon-trio.svg` was a three-vial alternative that nothing rendered.

## Things that will bite

Alpha is load-bearing on two of these. The adaptive foreground and the
monochrome layer must stay transparent; flatten them and the launcher shows a
white square. macOS `qlmanage` does exactly that while looking fine in a file
browser, which is why `make-icons.sh` uses `sharp-cli` instead.

The Android adaptive foreground keeps its padding. Launchers crop the outer
~18% to whatever mask shape they use — circle, squircle, rounded square — so
the art sits in the centre safe zone.

The sizes above are the only ones anyone makes by hand. `expo prebuild` and EAS
Build expand them into every size each platform wants.

## Palette

Background gradient `#2E1A5E → #140A32`, warm glow `#FFBE64`, magenta wash
`#A24DFF`, gold `#FFEFB4 → #FFCF6A → #C58A22`. Liquids match the game (aqua
`#22C9EC`, plum `#A24DFF`, coral `#FF4242`, mango `#FF8A1E`).

The adaptive icon's `backgroundColor` in `app.config.ts` is `colours.nightDeep`
(`#150A34`), not the `#140A32` above — a shade apart, and the palette in
`src/theme/colors.ts` wins so there is one source for it.

Everything here is original vector art, consistent with the project's
no-third-party-asset rule.
