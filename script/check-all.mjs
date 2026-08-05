import { spawn } from 'node:child_process';

/**
 * Every gate, run in parallel, with one summary at the end.
 *
 * Parallel because they are independent and the slowest one sets the wall
 * clock; output is buffered per task so four interleaved streams do not
 * become unreadable. The exit code is the first failure, so this is safe to
 * chain in CI.
 */
const TASKS = [
  ['Lint (eslint)', 'eslint', ['.', '--no-warn-ignored', '--max-warnings=0']],
  ['Format (prettier)', 'prettier', ['--check', '.']],
  ['Markdown (markdownlint)', 'markdownlint-cli2', []],
  ['Types (tsc)', 'tsc', ['--noEmit']],
  ['Tests (jest)', 'jest', ['--silent', '--watchman=false']],
  ['Dead code (knip)', 'knip', ['--no-progress']],
];

const ESC = '\x1b';
const cyan = (s) => `${ESC}[36m${s}${ESC}[0m`;
const green = (s) => `${ESC}[32m${s}${ESC}[0m`;
const red = (s) => `${ESC}[31m${s}${ESC}[0m`;

const run = (label, command, args) =>
  new Promise((resolve) => {
    // The local binary, not `npx`: npx re-resolves the package every call.
    const proc = spawn(`node_modules/.bin/${command}`, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout.on('data', (chunk) => (output += chunk.toString()));
    proc.stderr.on('data', (chunk) => (output += chunk.toString()));
    proc.on('error', (error) => resolve({ label, output: error.message, code: 1 }));
    proc.on('close', (code) => resolve({ label, output, code: code ?? 1 }));
  });

const status = (code) => (code === 0 ? green('PASS') : red(`FAIL (${code})`));

console.log(cyan(`▶ Running ${TASKS.length} checks in parallel...\n`));

const results = await Promise.all(TASKS.map((task) => run(...task)));

for (const result of results) {
  if (result.code === 0 && !result.output.trim()) continue;
  console.log(cyan(`▶ ${result.label}`));
  if (result.output.trim()) console.log(result.output.trimEnd());
  console.log();
}

console.log(cyan('▶ Summary'));
const width = Math.max(...results.map((r) => r.label.length));
for (const result of results) {
  console.log(`  ${result.label.padEnd(width)} : ${status(result.code)}`);
}

process.exit(results.find((result) => result.code !== 0)?.code ?? 0);
