# Store assets

Everything the store listings need, and nothing the app ships. Regenerate the
derived files with:

```bash
python3 script/make-store-graphics.py     # icon + feature graphic
python3 script/make-store-screenshots.py  # the eight framed screenshots
```

## What goes where

| File                              | Where it is filed                                | Spec                 |
| --------------------------------- | ------------------------------------------------ | -------------------- |
| `play/icon-512.png`               | Play Console → Main store listing → **App icon** | 512x512, ≤1MB        |
| `play/feature-1024x500.png`       | → **Feature graphic**                            | 1024x500, ≤15MB      |
| `play/screenshots/play-01…08.png` | → **Phone screenshots**                          | 1080x1920, ≤8MB each |
| `captures/*.png`                  | nothing — these are the masters                  | 1206x2622            |
| `feature-graphic.svg`             | nothing — the master the PNG renders from        | —                    |

Play wants two screenshots minimum and eight maximum. **Four or more at 1080px
or wider is what makes the listing eligible for promotion**, which is free
placement, so all eight are filed rather than the two that would pass.

The order in `script/make-store-screenshots.py` matters more than the captions
do: Play shows two or three plates before anyone scrolls, those drive the
listing's conversion rate, and conversion rate feeds ranking. The board is first
because it is the only plate that says what the game is.

## These are outside `assets/` on purpose

`assetBundlePatterns` is unset in `app.config.ts`, which means it defaults to
`**/*` — a PNG dropped in `assets/` is bundled into the app. A store graphic has
no business shipping inside the binary. Nothing in `src/` imports anything here
and nothing should.

The icon renders from `assets/icons/decant-icon.svg`, the same master the
launcher icon uses, so what the store shows and what the home screen shows
cannot drift apart.

## `captures/` is committed, and that is the odd one

Every other image in this repo is generated — icons, splash, Lottie, the feature
graphic — and the rule is that the generator is the source of truth. These are
the exception: they came off a booted simulator with the game actually being
played, so no script can rebuild them. Level 1 in `05-complete.png` was solved
in six moves, which is par, which is why it shows three stars.

They are ~7MB. That is real weight in a git history and it is accepted, because
the alternative is a listing asset that cannot be reproduced after the next UI
change without booting a device and playing again.

To retake them: boot a simulator, run the app, and capture with
`xcrun simctl io booted screenshot` — the framebuffer, not a window grab. A
macOS window capture includes the device bezel _and_ whatever is behind the
rounded corners, which on the first attempt was a code editor.

## Two known limitations

**The captions are not Poppins.** PIL resolves fonts from what the OS has
installed and Poppins is bundled in `assets/` rather than installed, so it falls
back to a system face. Close in character, not identical. Fixing it means
installing the family before rendering, or tracing the letterforms to paths.

**The palette is duplicated, not imported.** The generators are Python and
`src/theme/colors.ts` is TypeScript. Move a color there and it has to be moved
here by hand — no test catches this, because nothing in the app reads these
files.

## Still missing

- **Tablet screenshots.** Optional on Play, despite `supportsTablet: true` —
  that flag is Apple's rule, and App Store Connect _does_ make them mandatory.
  Worth adding for tablet search placement, not a launch blocker. Capture with
  `npm run ios:pad`.
- **App Store assets.** Apple requires its own sizes and will reject the Play
  set. Nothing here is filed with Apple yet.
