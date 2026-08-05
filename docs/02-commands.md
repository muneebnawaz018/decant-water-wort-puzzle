# 02 — Commands and troubleshooting

Expo SDK 57, RN 0.86, prebuild workflow. If you last did this on RN 0.6x, read
§6 — several habits are now actively harmful.

---

## 1. Daily loop

```bash
npm run prebuild        # generate android/ and ios/ — already done once, re-run after config changes
npm run android         # expo run:android — build, install, launch
npm run ios             # expo run:ios
npm start               # expo start --dev-client — Metro only, for an installed build

npm test                # jest
npm run test:watch      # the real inner loop for src/core
npm run typecheck       # tsc --noEmit
npm run lint:md         # markdownlint-cli2
npm run doctor          # expo-doctor, keep at 20/20
```

Rebuild natively only when native deps or `app.json` change. JS edits hot-reload
over Metro.

Target a specific simulator or device:

```bash
npx expo run:ios --device "iPhone 16"
npx expo run:android --device emulator-5554
adb devices                      # list attached Android devices
xcrun simctl list devices        # list iOS simulators
```

---

## 2. Debugging

Android emulator is the primary target. Faster builds, no signing, and Skia and
Reanimated fail there first — fix on Android and iOS is usually free.

| Layer                       | Where to debug it                                                              |
| --------------------------- | ------------------------------------------------------------------------------ |
| `src/core` logic, generator | `npm run test:watch`. Pure TS, no device, sub-second                           |
| Board layout, Skia paint    | Device + fast refresh. Skia has no inspector — log rects or draw debug strokes |
| Pour animation, worklets    | React Native DevTools. `console.log` inside a worklet needs `runOnJS`          |
| Store state                 | zustand, log on transition or attach Redux DevTools middleware                 |
| Native crash                | `adb logcat` / Xcode console                                                   |

Press `j` in the Metro terminal to open React Native DevTools. Flipper is gone
as of RN 0.73 and is not coming back.

Force-quit persistence test (spec §13, save must survive):

```bash
adb shell am force-stop com.decant.watersort
```

---

## 3. When it breaks

Escalate in this order. Stop as soon as it works.

```bash
# 1. Metro cache — stale bundle, phantom import errors, babel alias not resolving
npx expo start --dev-client --clear

# 2. Port 8081 held by a zombie Metro
sudo lsof -i tcp:8081 | grep LISTEN | awk '{print $2}' | xargs kill -9

# 3. node_modules drift
rm -rf node_modules && npm install

# 4. Native dirs — these are GENERATED. Regenerating beats cleaning.
npm run prebuild:clean          # expo prebuild --clean
npm run android

# 5. Nuclear
watchman watch-del-all
rm -rf node_modules ios android
npm install && npm run prebuild
```

`android/` and `ios/` are build output. Never hand-fix them expecting the fix to
survive — a config plugin or `app.json` entry is the durable place.

---

## 4. Android

```bash
cd android
./gradlew clean                  # drop build output
./gradlew cleanBuildCache
./gradlew --refresh-dependencies
rm -rf $HOME/.gradle/caches/     # heavy, forces a full re-download

./gradlew assembleDebug          # debug APK
./gradlew assembleRelease        # release APK — needs a keystore
./gradlew bundleRelease          # .aab for Play
```

Release builds should go through EAS Build rather than local Gradle. The store
pipeline is the reason this project exists, and local release builds need
keystore handling that EAS does for you.

Requires JDK 17 and the Android SDK on `PATH`.

---

## 5. iOS

```bash
cd ios && pod install            # expo prebuild already does this
rm -rf ~/Library/Developer/Xcode/DerivedData
```

If Xcode cannot find node during a build phase, set the path instead of patching
`node_modules`:

```bash
echo "export NODE_BINARY=$(which node)" > ios/.xcode.env.local
```

`.xcode.env.local` is gitignored and survives `prebuild --clean`.

Requires Xcode and CocoaPods.

---

## 6. Changed since RN 0.6x

| Old habit                                          | Now                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npx react-native start --reset-cache`             | `npx expo start --dev-client --clear`                                                                      |
| `npx react-native run-android`                     | `npx expo run:android`                                                                                     |
| `npx react-native run-ios --simulator "iPhone 14"` | `npx expo run:ios --device "iPhone 16"`                                                                    |
| `arch -x86_64 pod install`                         | Drop it. CocoaPods runs native on Apple Silicon; forcing Rosetta breaks Hermes and Skia builds             |
| `react-native bundle --entry-file index.js`        | `npx expo export:embed`. Entry here is `index.ts`, and Gradle/Xcode bundle automatically on release builds |
| Commenting out `scripts/find-node.sh`              | Set `NODE_BINARY` in `ios/.xcode.env.local`. Never edit `node_modules`                                     |
| Flipper                                            | React Native DevTools, `j` in Metro                                                                        |
| JSC engine option                                  | Hermes only, JSC removed                                                                                   |
| New Architecture opt-in                            | Default and mandatory in 0.86. Fabric + TurboModules. A library without New Arch support will not load     |

Expo Go cannot run this app — Skia and MMKV need a native build. `expo-dev-client`
is the replacement and is already installed.

No web target. MMKV has no web build, and the game is phone-only.

---

## 7. Two failures specific to this stack

**Skia or Reanimated missing after a dependency change** — the autolinking
manifest is stale. Regenerate rather than clean:

```bash
npm run prebuild:clean && npm run android
```

**Worklet errors after editing `babel.config.js`** — Reanimated's babel plugin
output is cached in Metro:

```bash
npx expo start --dev-client --clear
```

The `react-native-worklets` plugin must stay **last** in the babel plugin list.
Moving it breaks every worklet with an unhelpful error.
