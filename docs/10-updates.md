# 10 — Over-the-air updates

EAS Update, configured and live as of 19 August 2026. This is the runbook: what
was set up, how to ship an update, and the one rule that makes shipping one
dangerous in this particular app.

`docs/06-launch.md` §4 used to list this as blocked on an account. It is not
blocked any more; that section now points here.

---

## 1. What is actually hosted where

EAS is two products and they are constantly confused with each other. Only one
of them is in use:

- **EAS Update** — Expo's servers host the JavaScript bundles that an installed
  app downloads. **In use.**
- **EAS Build** — Expo's servers compile the app. **Not in use, deliberately.**

Builds stay on this machine, through `script/build-apk.sh`, with the upload
keystore that never leaves it. Nothing about the build pipeline changed to get
updates working, and nothing needs to: an update is JavaScript, and the binary
that consumes it can be built anywhere.

The free tier is 1,000 monthly active users, 100 GiB of bandwidth and 20 GiB of
storage. EAS Build's free tier is 15 Android builds a month, which one
afternoon of `build-apk.sh` would exhaust — the second reason it is not used.

| Thing                     | Where it happens                    |
| ------------------------- | ----------------------------------- |
| Compiling the APK or AAB  | this machine, `script/build-apk.sh` |
| Hosting the update bundle | Expo's servers                      |
| Publishing an update      | this machine, `eas update`          |

---

## 2. The account

Owned by the **`walqalum-games` organization**, not by a personal account. Every
installed copy of the app asks this account's project for updates, which makes
it a business asset in the same way the AdMob account is — `docs/06-launch.md`
§6 makes the same argument there. An organization can have more than one owner
and survives a person leaving.

The display name is `Walqalum`, matching `O=Walqalum` on the upload keystore.
The slug is `walqalum-games` because plain `walqalum` is held by an unrelated
Expo user; only the URL had to differ.

```text
organization   walqalum-games  (display name: Walqalum)
project        @walqalum-games/decant
project id     502b1524-1757-47f5-9134-dd9b78aba32e
dashboard      https://expo.dev/accounts/walqalum-games/projects/decant
```

The personal account `walqalum_games` also exists — signup creates one and it
cannot be avoided. Nothing should ever be created under it. `owner` in
`app.config.ts` is what stops that happening by accident: this machine is signed
in to both, and with no `owner` the CLI resolves against whichever it likes.

---

## 3. Configuration, and why each key is what it is

Three keys in `app.config.ts`, all commented at the source.

**`updates.url`** — `https://u.expo.dev/<projectId>`. Not a secret; it is baked
into every binary and readable by unzipping any APK.

**`updates.requestHeaders['expo-channel-name']`** — the channel this binary asks
for, read from `DECANT_UPDATE_CHANNEL` and **defaulting to `preview`**.

EAS Build would inject the channel from a build profile. These builds are local,
so it is set in the config instead — the documented route for a prebuild (CNG)
project — and applied on the next `expo prebuild`. `build-apk.sh` runs prebuild
on every non-`--fast` build, so the channel is baked in by the pipeline that
already exists.

The default is the safe direction: a build that forgets to say what it wants
gets the tester channel, never the one real players are on.

**`runtimeVersion: { policy: 'fingerprint' }`** — and `nativeVersion` would be
actively wrong. `nativeVersion` is built from `version` plus the build number,
and `script/release-version.mjs` bumps the build number on _every_ upload, so
each upload would mint a new runtime version and an update could only ever reach
one single build. `fingerprint` hashes what actually decides compatibility: the
native code.

---

## 4. Channels

Two, and the split exists for one specific reason — see §5.

| Channel      | Carried by                | Set with                    |
| ------------ | ------------------------- | --------------------------- |
| `preview`    | tester APKs — the default | nothing, it is the default  |
| `production` | store builds only         | `--production` on the build |

A **channel** is a label baked into the binary and frozen there; it cannot
change without a rebuild. A **branch** is a line of published updates. The
server maps channel to branch, and that mapping is changed instantly with no
rebuild and no store review — which is what makes promotion and rollback
possible at all.

```bash
npm run build:apk                      # preview  — testers
npm run publish:apk                    # preview  — testers, uploaded to GitHub
npm run build:aab -- --production      # production — the store artefact
```

`--production` is deliberately **not** implied by `--aab`. A bundle is also how
a closed test is uploaded, and those testers should stay on `preview`.

Check what a built binary actually asks for, rather than trusting the flag:

```bash
grep -o 'expo-channel-name[^/]*' android/app/src/main/AndroidManifest.xml
```

---

## 5. The rule that matters more than any of the above

**An OTA update must never change level generation without bumping
`GENERATOR_VERSION`.**

No board is stored anywhere. Level N is rebuilt from
`seedForLevel(level, DIFFICULTY_SALT[mode])`, which means the difficulty curves,
the gate ramps, the salts, the generator and the RNG **are the save format**. A
JavaScript-only update that touches any of them silently repoints every player's
saved progress at different puzzles. Their level 47 becomes a different board.

Three things stand between that and a player:

1. `src/game/__tests__/difficulty.test.ts` pins level 30 in all three modes
   against recorded fingerprints. It is the tripwire.
2. `GENERATOR_VERSION` in `src/game/generatorVersion.ts` is stamped into saved
   progress and sessions. On mismatch, `loadProgress` keeps levels, stars and
   `paidBlocks` and drops `best`; `loadSession` retires the record. It is what
   makes tripping the tripwire survivable.
3. The `preview` channel. Testers see it first.

Only the third one is new, and it is the only one that catches a mistake
**before** a player sees it. That is the whole reason two channels exist here
rather than one.

Ordinary UI, copy and layout fixes carry none of this risk. Ship them freely.

**Rollback does not undo a generation mistake.** By the time you roll back, the
session record has already been validated against the new generator or discarded
by it. Rolling back restores the code, not the save.

So, when an update touches generation:

- [ ] Bump `GENERATOR_VERSION` and re-record the level-30 fingerprints in
      `difficulty.test.ts`, **in the same commit**
- [ ] Publish to `preview` only
- [ ] Install a preview build, confirm an in-progress level behaves
- [ ] Promote to `production` (§6)

---

## 6. Shipping an update

```bash
npm run check:all                                  # never skip; it is the tripwire
eas update --branch preview --message "what changed"
```

Launch a preview build and confirm it arrives. Then promote the exact bundle
that was tested — no rebuild, no republish, no store review:

```bash
eas channel:edit production --branch preview
```

Rolling back is the same operation pointed the other way:

```bash
eas update:rollback
eas channel:view production                        # confirm where it points
```

Useful for reading state:

```bash
eas update:list --branch preview
eas channel:list
eas branch:list
```

---

## 7. What is not done

- **Both platforms are verified**, so nothing here is inferred from the other
  one. Android carries the channel in the merged `AndroidManifest.xml` and iOS
  in `ios/Decant/Supporting/Expo.plist`, and `--production` was confirmed to
  flip it on each. `EXUpdatesRuntimeVersion` and `EXUpdatesURL` match their
  Android counterparts.
- **No update has ever been published.** The channels exist and both point at
  empty branches. The first `eas update` is untested by definition.
- **No update has been received by a device.** Configuration being correct and
  an update actually landing are different claims, and only the first is proven.
- **`checkAutomatically` is left at its default**, so the app checks on every
  launch and applies the update on the _next_ one. Fine for a puzzle game with
  no session state to lose; revisit only if a check on a cold launch ever shows
  up in a profile.
