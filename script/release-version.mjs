import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

/**
 * Moves the version and the build number together, in one place.
 *
 * **They are two different numbers and the difference is the whole reason this
 * exists.** `version` is semver, is what players see in the drawer and on the
 * store page, and changes when the app changes. `versionCode` / `buildNumber`
 * are a monotonic counter the stores use to tell one upload from another, and
 * change on **every** upload — including a build that only fixes signing, or a
 * resubmission of code that was already rejected.
 *
 * Doing them by hand means editing `app.config.ts` twice, remembering that a
 * rejected build still burned its number on Play, and keeping iOS and Android
 * in step. It is the kind of bookkeeping that is fine until the one release
 * where it is not, and the error surfaces at the upload form rather than in a
 * build.
 *
 * Run it, answer one question, and every number that has to move moves:
 *
 * ```sh
 * npm run release:version         # asks
 * npm run release:version patch   # or say it outright
 * npm run release:version build   # a re-upload of the same version
 * ```
 *
 * **Not called `version`.** npm runs a script by that name as part of its own
 * `npm version` lifecycle, so the name would fire this at moments nobody asked
 * for it. It was briefly `bump`, which said what it did to someone who already
 * knew — the prefix is there so the command names the moment it belongs to.
 */

const ESC = '\x1b';
const cyan = (s) => `${ESC}[36m${s}${ESC}[0m`;
const green = (s) => `${ESC}[32m${s}${ESC}[0m`;
const yellow = (s) => `${ESC}[33m${s}${ESC}[0m`;
const dim = (s) => `${ESC}[2m${s}${ESC}[0m`;

const CONFIG = 'app.config.ts';
const PACKAGE = 'package.json';

/**
 * Each key is matched on its own line rather than by parsing the file.
 *
 * `app.config.ts` is TypeScript that imports from the palette, so reading it
 * means executing it, and writing it back means regenerating source from an
 * object — which would discard every comment in a file that is mostly comments
 * explaining why each value is what it is. A line rewrite keeps them.
 */
const FIELDS = {
  version: /^(\s*version: ')([^']+)(',)$/m,
  buildNumber: /^(\s*buildNumber: ')(\d+)(',)$/m,
  versionCode: /^(\s*versionCode: )(\d+)(,)$/m,
};

const read = (path) => readFileSync(path, 'utf8');

/** Pulls a field out, or fails loudly — a silent miss would write nothing. */
function current(contents, key) {
  const match = FIELDS[key].exec(contents);
  if (!match) {
    throw new Error(
      `${CONFIG} has no \`${key}\` on a line this script can rewrite. ` +
        `It must sit on one line, formatted as prettier leaves it.`
    );
  }
  return match[2];
}

const setField = (contents, key, value) => contents.replace(FIELDS[key], `$1${value}$3`);

/**
 * The next semver for each kind of release.
 *
 * `build` is the fourth option and leaves the version alone: a resubmission is
 * not a new version of the app, it is another attempt at the same one.
 */
function nextVersions(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  if ([major, minor, patch].some(Number.isNaN)) {
    throw new Error(`\`version\` is "${version}", which is not major.minor.patch.`);
  }
  return {
    build: version,
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`,
  };
}

const KINDS = {
  build: 'same version, next upload — a resubmission or a signing fix',
  patch: 'bug fixes only, nothing new to announce',
  minor: 'new levels, features or screens, still compatible',
  major: 'a rewrite, or anything that changes what the app is',
};

async function ask(versions, build) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log(
    `\n  ${cyan('Build')}   ${build} ${dim('→')} ${green(build + 1)}   ${dim('always')}\n`
  );
  const keys = Object.keys(KINDS);
  keys.forEach((kind, index) => {
    const arrow =
      versions[kind] === versions.build ? dim('unchanged') : green(versions[kind]);
    console.log(
      `  ${cyan(String(index + 1))}  ${kind.padEnd(6)} ${arrow.padEnd(20)} ${dim(KINDS[kind])}`
    );
  });

  const answer = (
    await rl.question(`\n  Which? ${dim('[1-4, or a version like 2.1.0]')} `)
  ).trim();
  rl.close();

  if (/^[1-4]$/.test(answer)) return versions[keys[Number(answer) - 1]];
  if (/^\d+\.\d+\.\d+$/.test(answer)) return answer;
  if (answer in versions) return versions[answer];
  throw new Error(`"${answer}" is not one of 1-4, a kind, or a major.minor.patch version.`);
}

const config = read(CONFIG);
const version = current(config, 'version');
const build = Number(current(config, 'buildNumber'));
const code = Number(current(config, 'versionCode'));

// The two build numbers are kept identical on purpose, so one number names one
// build on both stores. If they have drifted, say so rather than picking one:
// the wrong guess silently burns a version code on Play.
if (build !== code) {
  throw new Error(
    `\`buildNumber\` is ${build} and \`versionCode\` is ${code}. ` +
      `They are meant to match — set them by hand, then run this again.`
  );
}

const versions = nextVersions(version);
const requested = process.argv[2];
const nextVersion = requested
  ? (versions[requested] ??
    (/^\d+\.\d+\.\d+$/.test(requested)
      ? requested
      : (() => {
          throw new Error(
            `"${requested}" is not one of ${Object.keys(KINDS).join(', ')} or a version.`
          );
        })()))
  : await ask(versions, build);

const nextBuild = build + 1;

let updated = setField(config, 'version', nextVersion);
updated = setField(updated, 'buildNumber', nextBuild);
updated = setField(updated, 'versionCode', nextBuild);
writeFileSync(CONFIG, updated);

// `package.json` is not read by the app — the drawer reads `expoConfig` — but a
// repo whose manifest disagrees with the app it builds is a question somebody
// eventually has to stop and answer.
const pkg = read(PACKAGE);
writeFileSync(
  PACKAGE,
  pkg.replace(/^(\s*"version": ")([^"]+)(",)$/m, `$1${nextVersion}$3`)
);

console.log(`\n  ${green('✔')} ${CONFIG}  ${dim(version)} → ${green(nextVersion)}`);
console.log(
  `  ${green('✔')} build      ${dim(String(build))} → ${green(String(nextBuild))}  ${dim('versionCode + buildNumber')}`
);
console.log(`  ${green('✔')} ${PACKAGE}\n`);
console.log(
  `  ${yellow('Next:')} npm run prebuild ${dim('— both numbers are baked into native files')}\n`
);
