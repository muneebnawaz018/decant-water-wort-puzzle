import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

/**
 * `prettier --write` with a summary worth reading.
 *
 * Prettier prints one line per file whether or not it changed, which buries
 * the answer to the only question anyone has after running it: what did you
 * touch? This reprints that list at the end, with sizes.
 */
const TIMESTAMP = /\s\d+ms(\s|$)/;
const FILE_PATH = /^(.+?)\s\d+ms/;

const ESC = '\x1b';
const cyan = (s) => `${ESC}[36m${s}${ESC}[0m`;
const yellow = (s) => `${ESC}[33m${s}${ESC}[0m`;

const proc = spawn('node_modules/.bin/prettier', ['--write', '.', '--log-level', 'log'], {
  shell: false,
  stdio: ['inherit', 'pipe', 'pipe'],
});

const stats = { total: 0, formatted: 0, files: [] };

const countLines = (path) => {
  try {
    const content = readFileSync(path, 'utf8');
    if (content === '') return 0;
    return content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
  } catch {
    return 0;
  }
};

const processLine = (line) => {
  if (!line.trim()) return;
  process.stdout.write(line + '\n');
  if (line.startsWith('[')) return;
  if (!TIMESTAMP.test(line)) return;
  stats.total++;
  if (line.includes('(unchanged)') || line.includes('(cached)')) return;
  stats.formatted++;
  const match = FILE_PATH.exec(line);
  if (match) stats.files.push({ path: match[1], lines: countLines(match[1]) });
};

const pump = (stream, sink) => {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(sink);
  });
  return () => buffer.trim() && sink(buffer);
};

const flushOut = pump(proc.stdout, processLine);
const flushErr = pump(proc.stderr, (line) => process.stderr.write(line + '\n'));

proc.on('close', (code) => {
  flushOut();
  flushErr();

  if (code !== 0) {
    console.error(cyan('▶ Prettier failed — see errors above'));
    process.exit(code ?? 1);
  }

  console.log(cyan('\n▶ Prettier summary'));
  console.log(`  Files checked     : ${stats.total}`);
  console.log(`  Files reformatted : ${stats.formatted}`);
  console.log(`  Already formatted : ${stats.total - stats.formatted}`);

  if (stats.files.length > 0) {
    console.log(cyan('\n▶ Reformatted'));
    for (const file of stats.files) {
      console.log(`  ${yellow(file.path)} (${file.lines} lines)`);
    }
  }

  process.exit(0);
});
