import type { ExpoConfig } from 'expo/config';

import { colours } from './src/theme/colors.ts';
import { VIAL_HEIGHT } from './src/theme/splash.ts';

/**
 * Expo config as TypeScript, not `app.json`.
 *
 * The reason is the palette rule: a static JSON file cannot import anything, so
 * every colour baked into the native shell — splash background, adaptive icon —
 * had to be a second copy of a hex that already exists in `src/theme/colors.ts`.
 * The adaptive icon was still carrying Expo's default pale blue against a
 * near-black app, which is exactly the drift the rule exists to stop.
 *
 * `colors.ts` is pure TypeScript with no React Native imports, so Expo's config
 * loader can read it directly. Keep it that way — an `import` of anything
 * native here breaks `expo prebuild` and every EAS build with it.
 */
const config: ExpoConfig = {
  name: 'Decant',
  description: 'Decant: Water Sort Puzzle',
  slug: 'decant',
  /**
   * The version players see, on both stores. Shown in the settings drawer too.
   *
   * Separate from the build numbers below, and they move independently: this
   * one changes when the app changes, those change on every upload. A rejected
   * build, a re-signed build and a metadata fix all need a fresh build number
   * against the same version.
   */
  version: '1.0.1',
  orientation: 'portrait',
  // Phone only. Web was tried and dropped: MMKV, Skia and the worklet runtime
  // each need their own browser shim, which makes a second rendering path to
  // keep honest for a target the game does not ship on.
  platforms: ['ios', 'android'],
  icon: './assets/icon.png',
  // The app is the dark purple theme end to end. This drives the native chrome
  // — iOS keyboard/alert appearance, Android's system UI — and declaring
  // `light` against a near-black app made both fight the design on first
  // launch.
  userInterfaceStyle: 'dark',
  // The colour behind every React view, and — the reason it is here — the one
  // the window shows in the gap between the OS dismissing the splash and the
  // first React frame being drawn. It defaults to white, which flashed for a
  // frame on every launch against this near-black app.
  backgroundColor: colours.nightDeep,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.decant.watersort',
    /**
     * `CFBundleVersion` — the build number, not the version.
     *
     * **It has to be here.** Prebuild writes `Info.plist` from this config, so
     * with the key absent it writes `1` on every run and the second upload of
     * a version is rejected as a duplicate. The error names the build number
     * and not the missing config, which is why this is easy to hit twice.
     *
     * Bump it for **every** upload to App Store Connect, including a build
     * that only fixes signing or metadata. It never resets, not even when
     * `version` moves — App Store Connect only requires it to increase within
     * a version, but keeping it monotonic across all of them means a build
     * number identifies a build outright.
     */
    buildNumber: '2',
    infoPlist: {
      // `UIStatusBarHidden` is set by the `expo-status-bar` plugin below. This
      // is the half it does not cover: without it iOS asks each view controller
      // what the bar should look like and ignores the plist, so the bar comes
      // back the moment React Native's controller is on screen.
      UIViewControllerBasedStatusBarAppearance: false,

      /**
       * Declares this app a game to iOS — the other half of Android's
       * `appCategory`, which `plugins/withGameCategory.js` sets.
       *
       * It drives Screen Time's "Games" grouping and the category the App
       * Store files the app under. Unlike Android's, this one is expressible
       * in the Expo config, so it needs no plugin.
       *
       * App Store Connect's category picker overrides it for the listing
       * itself; the plist value is what the device reads, and the two should
       * agree. Puzzle rather than plain `games` because the store wants a
       * subcategory and picking it here keeps one source for the answer.
       */
      LSApplicationCategoryType: 'public.app-category.puzzle-games',

      /**
       * Answers the export-compliance question once, here, instead of on every
       * submission.
       *
       * Without the key App Store Connect asks whether the app uses
       * non-exempt encryption each time a build is uploaded, and a build sits
       * unprocessable until someone answers. The answer never changes for this
       * app: it ships no cryptography of its own, and HTTPS — which is all the
       * ad SDK and the notification scheduler use — is exempt.
       *
       * `false` is a declaration, not a default. Revisit it if this app ever
       * encrypts anything itself.
       */
      ITSAppUsesNonExemptEncryption: false,
    },

    /**
     * `PrivacyInfo.xcprivacy`, set here because `ios/` is prebuild output.
     *
     * Expo **merges** this into whatever the generated file already holds
     * rather than replacing it, so the required-reason API entries the
     * template writes for MMKV and the file system survive untouched.
     *
     * **Only `NSPrivacyTracking` needed correcting.** Apple aggregates each
     * bundled SDK's own manifest with the app's, so an app declares what *it*
     * collects and Google's SDK declares what Google collects — and it does,
     * in detail, at `GoogleMobileAds.framework/PrivacyInfo.xcprivacy`, marking
     * `NSPrivacyCollectedDataTypeDeviceID` with `Tracking = true`. This app
     * collects nothing on its own account: MMKV never leaves the device and
     * there is no analytics. So the empty `NSPrivacyCollectedDataTypes` is
     * correct and is deliberately left alone.
     *
     * What was wrong is the flag above it. Apple defines `NSPrivacyTracking`
     * as whether the app **or a third-party SDK** uses data for tracking, and
     * with AdMob bundled and an ATT prompt shown, the answer is yes.
     *
     * **`NSPrivacyTrackingDomains` is deliberately empty**, and that is a
     * judgement rather than an omission. Apple *blocks* requests to the
     * domains listed there when tracking permission has not been granted, so a
     * wrong or stale entry does not fail a review — it silently kills ad fill
     * for every player who declined, which reads as poor demand rather than as
     * a configuration mistake. Google publishes no list of its serving domains
     * for this key, and the SDK that knows its own endpoints declares its own
     * manifest. Guessing on this app's behalf is the more expensive error.
     */
    privacyManifests: {
      NSPrivacyTracking: true,
    },
  },
  android: {
    backgroundColor: colours.nightDeep,
    /**
     * The counterpart to `ios.buildNumber`, and the same trap: prebuild
     * regenerates `android/app/build.gradle`, so without this key every build
     * carries `versionCode 1` and Play refuses the second upload.
     *
     * Play is stricter than App Store Connect here — a version code may never
     * be reused on a track, even for a build that was never released, so a
     * failed upload still burns its number. Bump it, never reset it, and keep
     * it in step with `ios.buildNumber` so one number describes one build on
     * both stores.
     */
    versionCode: 2,
    /**
     * The OS's default, made a decision. Auto Backup ships the MMKV file to
     * the player's Google Drive, so a new phone restores their progress —
     * which is the whole promise of a save. iCloud does the same on iOS with
     * nothing to declare.
     *
     * What rides along is the daily-reward record, so restoring an old backup
     * re-opens claimed days. Accepted, the same way winding the device clock
     * forward is: the prize is coins, the coins buy cosmetics, and defending
     * either needs a trusted clock the app does not have. Set here rather
     * than in `AndroidManifest.xml`, which prebuild regenerates.
     */
    allowBackup: true,
    /**
     * Three permissions the Expo bare template writes into
     * `AndroidManifest.xml`, none of which this app uses.
     *
     * They are **not** a stale artefact and not `expo-dev-client`'s doing —
     * both were checked. A `prebuild --clean` on the current dependency set
     * emits all three every time, because they live in the template the
     * prebuild downloads rather than in any package under `node_modules`.
     * Nothing in this repo declares them, so nothing here could remove them
     * either; hence the block list.
     *
     * `SYSTEM_ALERT_WINDOW` is the one that matters. It is Android's "display
     * over other apps", Play treats it as sensitive, and a puzzle game has no
     * answer to the question it invites at review. `READ_` and
     * `WRITE_EXTERNAL_STORAGE` are the same problem one rung down: this app's
     * only storage is MMKV in app-private space, which needs neither.
     *
     * Blocked rather than deleted from the manifest by hand, for the reason
     * every other native setting is set here — prebuild regenerates that file,
     * so an edit there survives until the next config change and then silently
     * disappears. A block also writes `tools:node="remove"`, which strips the
     * permission at merge time even when a dependency reintroduces it later.
     *
     * The debug manifest keeps `SYSTEM_ALERT_WINDOW` and should: React
     * Native's dev overlay needs it, and no debug build is ever uploaded.
     */
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
    adaptiveIcon: {
      backgroundColor: colours.nightDeep,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.decant.watersort',
  },
  plugins: [
    'expo-dev-client',

    // `android:appCategory="game"` on `<application>` — the platform-standard
    // signal every skin's game mode reads. iOS's counterpart is
    // `LSApplicationCategoryType`, set in `ios.infoPlist` above.
    './plugins/withGameCategory.js',

    // Points release builds at the upload key instead of the debug key the
    // Expo template hardcodes. Reads `DECANT_UPLOAD_*` from the environment at
    // gradle time, so no keystore password is written into any file — see the
    // plugin for the variables and for how a missing one behaves.
    './plugins/withReleaseSigning.js',
    [
      // Hides the status bar from the launch window onward, on both platforms.
      //
      // The runtime `<StatusBar hidden />` in App.tsx only applies once React
      // is drawing, so without this the clock sits over the splash vial for the
      // first second and then vanishes.
      //
      // This replaces the top-level `androidStatusBar` key, which SDK 57
      // deprecated to no effect — it warned on every prebuild and set nothing,
      // so the bar was hidden on iOS and shown on Android's splash. The
      // plugin's two props are all that survived: `translucent` and
      // `barStyle` have no meaning behind a bar that is not drawn.
      'expo-status-bar',
      { hidden: true, style: 'light' },
    ],
    // No expo-audio plugin, because no expo-audio: sound plays through the
    // local `modules/system-sound` (AVAudioEngine / SoundPool), which needs no
    // permissions and no manifest entries. Its predecessor's plugin config —
    // switching off the microphone permission and background-audio services
    // the expo-audio plugin adds by default — went with it; nothing should ask
    // for RECORD_AUDIO on a puzzle game's behalf again.
    [
      /**
       * AdMob. The plugin writes the App ID into `AndroidManifest.xml` and
       * `Info.plist`, which is the one thing the SDK cannot be told at runtime
       * — it is read before any JavaScript runs, and a missing or mismatched
       * value crashes the app at launch rather than failing an ad request.
       *
       * **From `.env`, and from nowhere else.** No ID is written in this file,
       * not even a test one. They belong to whoever owns the AdMob account,
       * and that changes when the company's account takes over at launch — a
       * handover that should be a `.env` edit, never a commit. Copy
       * `.env.example` to `.env`; it ships with Google's public test IDs
       * already filled in, so a fresh clone builds and serves ads marked
       * "Test Ad" without touching anything.
       *
       * There is deliberately no fallback here. A default written into the
       * config is a second place an ID can come from, and the one time that
       * matters is the one time it is wrong — a release quietly built on test
       * IDs earns nothing and looks fine. Missing `.env` fails the build
       * instead, which is loud, early, and fixable in one command.
       *
       * Ad *unit* IDs are not here: those are read at run time and live in
       * `src/ads/units.ts`.
       */
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.ADMOB_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID,
        /**
         * Delays SDK start-up until `MobileAds().initialize()` is called.
         *
         * Off by default, meaning the SDK initialises during app launch and
         * does network work on the critical path to the first frame — on the
         * one screen this project spends real effort keeping seamless. It also
         * means the SDK would start before the EU consent form has been
         * answered, which is the wrong order.
         */
        delayAppMeasurementInit: true,
        /**
         * iOS asks for tracking permission through the SDK's own prompt rather
         * than a separate `expo-tracking-transparency` install.
         *
         * The wording matters: Apple rejects generic strings, and a puzzle
         * game asking to "track you" with no reason given is the prompt every
         * player denies.
         */
        userTrackingUsageDescription:
          'This lets Decant show ads that are relevant to you. Rewards work either way.',

        /**
         * Every buyer allowed to attribute an install from an ad shown here.
         *
         * SKAdNetwork is Apple's privacy-preserving attribution: a buyer whose
         * identifier is absent from `Info.plist` cannot be told its ad worked,
         * so it bids lower or not at all on this app. An empty list — which is
         * what shipped before this — is not a neutral default, it is every
         * demand partner bidding blind, and it costs iOS revenue quietly
         * enough that nothing ever points at it.
         *
         * Written through the plugin rather than into `infoPlist` directly, so
         * it merges with whatever the SDK contributes instead of racing it for
         * the same key.
         *
         * Copied verbatim from Google's published list (`Google and
         * Third-Party Buyer SKAdNetwork Identifiers`, last updated 30 January
         * 2026), in its order, Google's own entry first. It is Google's to
         * change: re-check it at release and when the ads SDK is upgraded. A
         * stale list costs demand, never correctness.
         */
        skAdNetworkItems: [
          'cstr6suwn9.skadnetwork', // Google
          '4fzdc2evr5.skadnetwork', // Aarki
          '2fnua5tdw4.skadnetwork', // Adform
          'ydx93a7ass.skadnetwork', // Adikteev
          'p78axxw29g.skadnetwork', // Amazon
          'v72qych5uu.skadnetwork', // Appier
          'ludvb6z3bs.skadnetwork', // Applovin
          'cp8zw746q7.skadnetwork', // Arpeely
          '3sh42y64q3.skadnetwork', // Basis
          'c6k4g5qg8m.skadnetwork', // Beeswax.io
          's39g8k73mm.skadnetwork', // Bidease
          'wg4vff78zm.skadnetwork', // BidMachine
          '3qy4746246.skadnetwork', // Bigabid Media
          'f38h382jlk.skadnetwork', // Chartboost
          'hs6bdukanm.skadnetwork', // Criteo
          'mlmmfzh3r3.skadnetwork', // Digital Turbine DSP
          'v4nxqhlyqp.skadnetwork', // i-mobile
          'wzmmz9fp6w.skadnetwork', // InMobi
          'su67r6k2v3.skadnetwork', // ironsource Ads
          'yclnxrl5pm.skadnetwork', // Jampp
          't38b2kh725.skadnetwork', // LifeStreet Media
          '7ug5zh24hu.skadnetwork', // Liftoff
          'gta9lk7p23.skadnetwork', // Liftoff Monetize
          'vutu7akeur.skadnetwork', // LINE Ads Network
          'y5ghdn5j9k.skadnetwork', // Mediaforce
          'v9wttpbfk9.skadnetwork', // Meta (1 of 2)
          'n38lu8286q.skadnetwork', // Meta (2 of 2)
          '47vhws6wlr.skadnetwork', // MicroAd
          'kbd757ywx3.skadnetwork', // Mintegral / Mobvista
          '9t245vhmpl.skadnetwork', // Moloco
          'a2p9lx4jpn.skadnetwork', // Opera
          '22mmun2rn5.skadnetwork', // Pangle
          '44jx6755aq.skadnetwork', // Persona.ly
          'k674qkevps.skadnetwork', // Pubmatic
          '4468km3ulz.skadnetwork', // Realtime Technologies
          '2u9pt9hc89.skadnetwork', // Remerge
          '8s468mfl3y.skadnetwork', // RTB House
          'klf5c3l5u5.skadnetwork', // Sift Media
          'ppxm28t8ap.skadnetwork', // Smadex
          'kbmxgpxpgc.skadnetwork', // StackAdapt
          'uw77j35x4d.skadnetwork', // The Trade Desk
          '578prtvx9j.skadnetwork', // Unicorn
          '4dzt52r2t5.skadnetwork', // Unity Ads
          'tl55sbb4fm.skadnetwork', // Verve
          'c3frkrj4fj.skadnetwork', // Viant
          'e5fvkxwrpn.skadnetwork', // Yahoo!
          '8c4e2ghe7u.skadnetwork', // Yahoo! Japan Ads
          '3rd42ekr43.skadnetwork', // YouAppi
          '97r2b46745.skadnetwork', // Zemanta
          '3qcr597p9d.skadnetwork', // Zucks
        ],
      },
    ],
    'expo-asset',
    'expo-font',
    'expo-system-ui',
    [
      // Release-build size. Both of these default to **off** in the Expo
      // Android template, so a release build without this block ships an
      // unminified dex and every resource the project has ever had.
      //
      // They live here rather than in `android/gradle.properties` because
      // `expo prebuild` regenerates that file — an edit there survives until
      // the next config change and then quietly disappears, which is the worst
      // possible failure mode for a build setting.
      'expo-build-properties',
      {
        android: {
          /**
           * R8. Shrinks and obfuscates the dex — the debug APK carries eight
           * dex files totalling ~55MB, and most of that is code no release
           * build reaches.
           *
           * The risk R8 carries is that it strips what only reflection finds,
           * and that fails at runtime rather than at build time. Every native
           * module here ships its own consumer ProGuard rules, so the
           * framework is covered; what is not covered by anyone is this app's
           * own code, and none of it uses reflection. **A release build still
           * has to be played through before it is trusted.**
           */
          enableMinifyInReleaseBuilds: true,

          /**
           * Drops resources nothing references. Safe here in a way it often is
           * not: resources are only reached by name when code does
           * `getIdentifier()`, and this app draws its own icons as Skia paths
           * and has no bitmap art beyond the launcher icons and the splash.
           */
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
    [
      'expo-notifications',
      {
        // The small monochrome glyph Android draws in the status bar. It
        // reuses the adaptive icon's foreground rather than shipping a fifth
        // mark to keep in sync.
        icon: './assets/android-icon-monochrome.png',
        color: colours.gold,
        defaultChannel: 'daily-reward',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        // `imageWidth` is the side of a **square** box the image is fitted
        // into, not the rendered width — expo-splash-screen generates a square
        // imageset (54x54, 108x108, 162x162). A tall vial contained in that box
        // ends up as wide as the box is tall, which rendered it at 19dp against
        // the animated vial's 54 and made the handoff jump.
        //
        // Passing the vial's *height* makes the contained image exactly
        // VIAL_WIDTH x VIAL_HEIGHT, matching the in-app splash.
        imageWidth: VIAL_HEIGHT,
        resizeMode: 'contain',
        // The ground the app itself paints, so the handoff from the native
        // splash to the first frame has nothing to cut between.
        backgroundColor: colours.nightDeep,
      },
    ],
  ],
};

export default config;
