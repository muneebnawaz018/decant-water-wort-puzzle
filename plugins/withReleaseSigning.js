/*
 * CommonJS, and the lint rule is disabled rather than satisfied — same
 * constraint `withGameCategory.js` records: Expo loads config plugins with
 * plain Node at prebuild, before any transform runs.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs release builds with the upload key instead of the debug key.
 *
 * **The Expo template ships `signingConfig signingConfigs.debug` under
 * `release`**, with a comment telling you to fix it. Play rejects a
 * debug-signed upload outright, so this is a hard blocker rather than a
 * hardening step — and it is the kind that is only discovered at the upload,
 * because every local build works fine.
 *
 * A plugin rather than an edit to `android/app/build.gradle`: prebuild
 * regenerates that file, so the edit survives until the next config change and
 * then silently disappears. `withGameCategory.js` exists for the same reason.
 *
 * ## No secret is written anywhere
 *
 * The generated gradle reads `System.getenv` at **build** time rather than
 * having values baked into it at prebuild time. So the keystore password never
 * enters a file — not the repo, not the gitignored `android/` tree, not a
 * build artefact someone might attach to a bug report. It also means changing
 * the key needs no prebuild.
 *
 * Four variables, all required together:
 *
 * ```sh
 * DECANT_UPLOAD_STORE_FILE=/absolute/path/to/upload.keystore
 * DECANT_UPLOAD_STORE_PASSWORD=…
 * DECANT_UPLOAD_KEY_ALIAS=upload
 * DECANT_UPLOAD_KEY_PASSWORD=…
 * ```
 *
 * **The keystore itself lives outside the repo and is never committed.** It is
 * generated once and cannot be regenerated: lose it and, without Play App
 * Signing enrolled, the listing can never be updated again.
 *
 * ```sh
 * keytool -genkeypair -v -keystore upload.keystore \
 *   -alias upload -keyalg RSA -keysize 2048 -validity 10000
 * ```
 *
 * ## Missing configuration falls back, loudly
 *
 * Unset variables leave release builds on the debug key, because that is what
 * every APK handed to a tester is built with and failing the build would stop
 * work that has nothing to do with publishing. The fallback announces itself in
 * the build output instead — the failure this whole plugin exists to prevent is
 * a debug-signed build reaching an upload form unnoticed, and a line in the log
 * at the moment of building is where that is cheapest to catch.
 *
 * The branch is evaluated by gradle, not here, so one prebuild serves both a
 * tester APK and a store bundle.
 */
const SIGNING_CONFIG = `
        upload {
            def uploadStoreFile = System.getenv("DECANT_UPLOAD_STORE_FILE")
            if (uploadStoreFile) {
                storeFile file(uploadStoreFile)
                storePassword System.getenv("DECANT_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("DECANT_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("DECANT_UPLOAD_KEY_PASSWORD")
            }
        }`;

/**
 * Replaces the template's `signingConfig signingConfigs.debug` under `release`.
 *
 * A partially set environment is treated as an error rather than as absent. A
 * keystore path with no password is not someone choosing to build unsigned, it
 * is a typo or a half-finished CI secret, and quietly signing with the debug
 * key would hide exactly the mistake worth surfacing.
 */
const RELEASE_SIGNING = `signingConfig System.getenv("DECANT_UPLOAD_STORE_FILE") ? signingConfigs.upload : signingConfigs.debug
            if (System.getenv("DECANT_UPLOAD_STORE_FILE")) {
                if (!System.getenv("DECANT_UPLOAD_STORE_PASSWORD") || !System.getenv("DECANT_UPLOAD_KEY_ALIAS") || !System.getenv("DECANT_UPLOAD_KEY_PASSWORD")) {
                    throw new GradleException("DECANT_UPLOAD_STORE_FILE is set but the password or alias variables are not. Set all four, or none.")
                }
                println("Decant: release builds signed with the upload key.")
            } else {
                println("Decant: WARNING - release builds signed with the DEBUG key. Play will reject this upload. Set DECANT_UPLOAD_* to sign for release.")
            }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error(
        `withReleaseSigning expected a Groovy build.gradle, got ${mod.modResults.language}.`
      );
    }

    let contents = mod.modResults.contents;

    // Both anchors are template text. If either stops matching the template has
    // changed under us, and silently doing nothing would leave a debug-signed
    // release — the exact outcome this plugin exists to prevent. So it throws.
    const debugConfigAnchor = /(signingConfigs \{\n\s*debug \{[\s\S]*?\n {8}\})/;
    if (!debugConfigAnchor.test(contents)) {
      throw new Error(
        'withReleaseSigning could not find the debug signingConfig block in build.gradle.'
      );
    }
    contents = contents.replace(debugConfigAnchor, `$1${SIGNING_CONFIG}`);

    const releaseAnchor =
      /release \{\n(\s*)\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/;
    if (!releaseAnchor.test(contents)) {
      throw new Error(
        'withReleaseSigning could not find the release signingConfig in build.gradle.'
      );
    }
    contents = contents.replace(releaseAnchor, `release {\n$1${RELEASE_SIGNING}`);

    mod.modResults.contents = contents;
    return mod;
  });
};
