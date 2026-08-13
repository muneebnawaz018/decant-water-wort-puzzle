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
 * ## Where the keystore is found
 *
 * `decant-playstore.keystore` in the **project root** is picked up
 * automatically, so a normal build needs no path configured at all. The name
 * says which app and which store it belongs to: a folder of `upload.keystore`
 * files from four projects is a mistake waiting to be made, and picking the
 * wrong one is only discovered at an upload form.
 *
 * `DECANT_UPLOAD_STORE_FILE` overrides the lookup when the key lives elsewhere
 * — a CI runner, or a machine that keeps it outside the checkout.
 *
 * ```sh
 * DECANT_UPLOAD_STORE_PASSWORD=…      # required
 * DECANT_UPLOAD_KEY_PASSWORD=…        # required
 * DECANT_UPLOAD_KEY_ALIAS=upload      # optional, defaults to `upload`
 * DECANT_UPLOAD_STORE_FILE=/path/…    # optional, overrides the root lookup
 * ```
 *
 * **A stale `DECANT_UPLOAD_STORE_FILE` is ignored rather than obeyed**, and
 * that rule was written after one broke a build. An exported variable outlives
 * the shell config that set it — a long-lived process keeps the environment it
 * started with, so an editor or a terminal opened last week can still be
 * carrying a path that has since been renamed. Gradle's own error for it names
 * a file nothing on disk mentions any more:
 *
 * ```text
 * Keystore file '/Users/…/upload.keystore' not found for signing config 'upload'.
 * ```
 *
 * A variable pointing at a file that is not there is not an instruction, it is
 * a leftover. The override therefore only wins when the path exists; otherwise
 * the build says so and uses the key in the project root, which is the one the
 * developer is looking at.
 *
 * **The passwords stay in the environment even when the keystore does not.**
 * A key file sitting in an ignored path is one mistake from being committed;
 * a key file *and* its password would be one mistake from being usable. Keeping
 * them apart means a leaked repo still cannot sign anything.
 *
 * **`/decant-playstore.keystore` must stay gitignored.** It is generated once
 * and cannot be regenerated: lose it and, without Play App Signing enrolled,
 * the listing can never be updated again — and publish it and anyone can ship
 * an update to your users.
 *
 * ```sh
 * keytool -genkeypair -v -keystore decant-playstore.keystore \
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
            // \`rootProject\` is \`android/\`, so this is the repo root — the same
            // \`upload.keystore\` the README and \`docs/06-launch.md\` name. The
            // environment variable wins when set, for a runner that keeps the
            // key elsewhere.
            def envStore = System.getenv("DECANT_UPLOAD_STORE_FILE")
            def envFile = envStore ? file(envStore) : null
            def rootStore = rootProject.file("../decant-playstore.keystore")
            // The override only wins if it points at a file that is actually
            // there. A variable naming a path that no longer exists is a stale
            // export, not an instruction — failing the build on it would mean a
            // terminal opened last week can break a key sitting right here.
            if (envFile != null && !envFile.exists()) {
                println("Decant: ignoring DECANT_UPLOAD_STORE_FILE=" + envStore + " - no such file. Using the project root instead.")
                envFile = null
            }
            def resolved = envFile ?: (rootStore.exists() ? rootStore : null)
            if (resolved != null) {
                storeFile resolved
                storePassword System.getenv("DECANT_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("DECANT_UPLOAD_KEY_ALIAS") ?: "upload"
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
const RELEASE_SIGNING = `signingConfig signingConfigs.upload.storeFile != null ? signingConfigs.upload : signingConfigs.debug
            if (signingConfigs.upload.storeFile != null) {
                if (!System.getenv("DECANT_UPLOAD_STORE_PASSWORD") || !System.getenv("DECANT_UPLOAD_KEY_PASSWORD")) {
                    throw new GradleException("Found " + signingConfigs.upload.storeFile + " but DECANT_UPLOAD_STORE_PASSWORD or DECANT_UPLOAD_KEY_PASSWORD is unset. The keystore and its password are kept apart on purpose - set both.")
                }
                println("Decant: release builds signed with the upload key (" + signingConfigs.upload.storeFile + ").")
            } else {
                println("Decant: WARNING - release builds signed with the DEBUG key. Play will reject this upload. Put decant-playstore.keystore in the project root, or set DECANT_UPLOAD_STORE_FILE.")
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
