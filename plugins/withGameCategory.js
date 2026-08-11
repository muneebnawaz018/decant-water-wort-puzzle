/*
 * CommonJS, and the lint rule is disabled rather than satisfied.
 *
 * Expo loads config plugins with plain Node at prebuild — before any transform
 * runs — so a plugin has to be a `require`-able CJS module. The same constraint
 * `script/eslint-rules/*.cjs` lives under.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Declares this app a game to the operating system.
 *
 * Adds `android:appCategory="game"` to `<application>`. **This is the platform's
 * own standard, not any one vendor's**: it is a framework attribute from API 26,
 * and every skin that ships a game mode reads this same value rather than
 * inventing its own signal. Xiaomi's HyperOS Game Turbo, Samsung's Game Booster,
 * OnePlus and OPPO's Game Space, Vivo's Ultra Game Mode, and Android's own
 * Settings — which groups battery and data usage under "Games" — all key off it.
 * Declaring it once covers every phone, including skins that do not exist yet.
 *
 * Without it the app is an ordinary app to the launcher, whatever it looks like.
 * It replaces `android:isGame`, deprecated in API 26 in favour of this more
 * general attribute.
 *
 * **A plugin rather than an edit to `AndroidManifest.xml`.** Prebuild
 * regenerates that file, so an edit there survives until the next config change
 * and then disappears — the worst failure mode for a build setting, because
 * nothing tells you it is gone. `allowBackup` is set through the config for the
 * same reason; `AGENTS.md` records it.
 *
 * It is not an Expo config key, which is why this plugin exists at all: there is
 * no `android.appCategory` in the SDK 57 schema, so the manifest has to be
 * reached directly. iOS's half of the same declaration *is* expressible in the
 * config and lives there — `LSApplicationCategoryType` under `ios.infoPlist`.
 *
 * **This is half the answer, and the store listing is the other half.** Several
 * skins classify from the Play Store's own category rather than from the
 * manifest — which a sideloaded APK has neither of — so a build handed round on
 * a link may still not be picked up. Publishing under the Games category is what
 * makes it reliable everywhere. Until then a tester can add the app to their
 * phone's game mode by hand.
 *
 * Takes effect at `npm run prebuild`, not at build time: the attribute is baked
 * into the generated manifest.
 */
module.exports = function withGameCategory(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) return mod;

    application.$['android:appCategory'] = 'game';
    return mod;
  });
};
