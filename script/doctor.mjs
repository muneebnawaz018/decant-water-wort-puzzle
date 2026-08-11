import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * expo-doctor, with the dependency-version check replaced by a severity-aware
 * one.
 *
 * **The problem this solves.** Expo publishes patch releases to an SDK
 * continuously, and `expo-doctor` compares against its *live network*
 * recommendation — so the gate went red every week or two on patch drift alone
 * (`57.0.9` against `57.0.10`), with nothing changed here. Chasing each one
 * costs a prebuild, a rebuild and a re-test for bug fixes the app may not even
 * be hitting, and a gate that cries wolf stops being read.
 *
 * **Why not `expo.install.exclude`.** It was tried and removed. The name
 * suggests a filter and it is a blindfold: excluded packages leave version
 * validation entirely, at every severity, and leave `npx expo install --fix`
 * with them. Proven rather than assumed — with eight packages excluded,
 * `expo-asset` was set to `11.0.0` against a required `~57.0.10` and doctor
 * still reported 20/20. It would also have left those eight behind on SDK 57
 * during an SDK 58 upgrade, silently, since `expo` itself was on the list.
 *
 * **What this does instead.** `EXPO_DOCTOR_SKIP_DEPENDENCY_VERSION_CHECK` turns
 * off doctor's own version check, leaving its other checks untouched and fatal.
 * The version check is then done here against
 * `node_modules/expo/bundledNativeModules.json` — the manifest shipped *inside*
 * the installed `expo` package, saying what this SDK expects.
 *
 * That local file is the deliberate choice, and it is what makes the severity
 * split work:
 *
 * - **Patch drift never appears**, because the file moves only when `expo`
 *   itself does. Exactly the noise we wanted gone.
 * - **A wrong install is still caught.** The file says `~57.0.9`; a package
 *   sitting at `11.0.0` fails on a major difference.
 * - **A half-finished SDK upgrade is caught loudly**, which is the case that
 *   matters most. Bump to SDK 58 and this file lists `58.x`, so every package
 *   still on `57.x` fails on a minor-or-worse difference — the exact trap
 *   `install.exclude` would have hidden.
 *
 * The trade, stated plainly: a patch Expo published *after* your installed SDK
 * was cut is invisible here. That is the point, not an oversight — sync patches
 * deliberately at release time with `npx expo install --check`.
 */
const SKIP = 'EXPO_DOCTOR_SKIP_DEPENDENCY_VERSION_CHECK';
const EXPECTED = 'node_modules/expo/bundledNativeModules.json';

const ESC = '\x1b';
const red = (s) => `${ESC}[31m${s}${ESC}[0m`;
const green = (s) => `${ESC}[32m${s}${ESC}[0m`;
const dim = (s) => `${ESC}[2m${s}${ESC}[0m`;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/**
 * How far apart an installed version is from what the SDK asks for.
 *
 * `null` when they agree, otherwise the coarsest field that differs.
 *
 * **No `semver` dependency, deliberately.** Full range satisfaction is not the
 * question being asked — severity is — and every value in
 * `bundledNativeModules.json` is a plain `~x.y.z` or `^x.y.z`, so the floor is
 * the range with its prefix removed. Comparing major and minor against that
 * floor answers the whole question in three lines. `semver` is present in
 * `node_modules` only as a transitive of npm's own tree, and reaching for an
 * undeclared package is how a script breaks on an unrelated dependency bump.
 *
 * A patch *ahead* of the floor counts as drift the same as a patch behind it.
 * Both mean the lockfile and the SDK disagree, and both are noise.
 */
function drift(installed, range) {
  const floor = range.replace(/^\D+/, '').split('.').map(Number);
  const got = installed.split('.').map(Number);

  if (got[0] !== floor[0]) return 'major';
  if (got[1] !== floor[1]) return 'minor';
  if (got[2] !== floor[2]) return 'patch';
  return null;
}

function checkVersions() {
  const pkg = readJson('package.json');
  const expected = readJson(EXPECTED);
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };

  const patches = [];
  const breaks = [];

  for (const name of Object.keys(declared)) {
    const range = expected[name];
    if (!range) continue;

    let installed;
    try {
      installed = readJson(`node_modules/${name}/package.json`).version;
    } catch {
      // Not installed. `npm ls` and the build both say so far more clearly
      // than a version check can.
      continue;
    }

    const gap = drift(installed, range);
    if (!gap) continue;
    (gap === 'patch' ? patches : breaks).push({ name, installed, range, gap });
  }

  return { patches, breaks };
}

const doctor = spawn('npx', ['--yes', 'expo-doctor'], {
  stdio: 'inherit',
  env: { ...process.env, [SKIP]: '1' },
});

doctor.on('close', (doctorCode) => {
  const { patches, breaks } = checkVersions();

  if (patches.length > 0) {
    const list = patches.map((p) => `${p.name}@${p.installed}`).join(', ');
    console.log(dim(`\nPatch drift, ignored: ${list}`));
    console.log(dim('Sync at release time: npx expo install --check'));
  }

  if (breaks.length > 0) {
    console.log(red('\n✖ Package versions do not match the installed Expo SDK'));
    for (const b of breaks) {
      console.log(`  ${b.name.padEnd(24)} ${b.installed}  expected ${b.range}  (${b.gap})`);
    }
    console.log('\nFix with: npx expo install --fix');
    process.exit(1);
  }

  // Only when there is nothing to say. Printing it under a drift note would
  // contradict the line above it.
  if (doctorCode === 0 && patches.length === 0) {
    console.log(green('\n✔ Versions match the installed SDK'));
  }
  process.exit(doctorCode ?? 1);
});
