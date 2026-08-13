#!/usr/bin/env bash
#
# Render the app icons from their SVG masters.
#
# The masters live in `assets/icons/`; everything under `assets/*.png` that an
# icon field in `app.config.ts` points at is generated from them by this script.
# Edit the SVG, run this, commit both.
#
# Uses sharp-cli, which is librsvg-backed, fetched on demand by npx rather than
# added as a dependency — icons change once a year and nothing at build or run
# time needs it.
#
# Do not reach for macOS `qlmanage` here. It renders these SVGs correctly but
# flattens alpha onto white, which silently turns the adaptive foreground and
# the monochrome layer into white squares. Both must stay transparent.

set -euo pipefail

cd "$(dirname "$0")/.."

SRC=assets/icons
OUT=assets

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

render() {
  local svg="$1" png="$2" size="$3"
  echo "  $svg  ->  $png  (${size}px)"
  npx --yes sharp-cli --input "$SRC/$svg" --output "$TMP" \
    resize "$size" "$size" >/dev/null
  # sharp-cli writes PNG bytes but keeps the source basename, extension and
  # all — the file it leaves behind is called `<name>.svg` and is a PNG.
  mv "$TMP/$svg" "$OUT/$png"
}

echo "Rendering icons from $SRC"

# iOS, and the general-purpose icon. Opaque by design: iOS applies its own
# rounding and rejects alpha in an app icon.
render decant-icon.svg icon.png 1024

# Android adaptive layers. The foreground keeps its transparency and its
# padding — launchers crop the outer ~18% to whatever mask shape they use.
render decant-android-foreground.svg android-icon-foreground.png 1024
render decant-android-background.svg android-icon-background.png 1024

# Android 13+ themed icon, and the notification small icon. White silhouette,
# transparent everywhere else — Android keeps only the alpha and refills it with
# a tint, so this file must say everything through shape. See the comment at the
# top of `decant-icon-mono.svg`; judge it at 24dp, never at 1024.
render decant-icon-mono.svg android-icon-monochrome.png 1024

# The notification LARGE icon — the square on the right of a notification, and
# the one place Android draws the app icon in full colour. `plugins/
# withNotificationLargeIcon.js` puts it in the manifest.
#
# 256px because the slot is 64dp: xxxhdpi is 4x, so 256 is exactly enough and
# anything larger is bytes in the APK that no screen resolves. The 1024 master
# would be eight times the size for the same pixels.
render decant-icon.svg notification-large-icon.png 256

echo "Done. Run 'npm run prebuild:clean' to push these into android/ and ios/."
