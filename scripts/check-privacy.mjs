// Privacy + content guard. Run: `node scripts/check-privacy.mjs [--history]`
// Fails (exit 1) if tracked or untracked-not-ignored files contain phone numbers, postcodes, private words,
// date-of-birth / student-ID wording or banned phrases, or if any PDF / transcript-named file is present.
// With --history it also scans every commit on every branch. Rules live in privacy-rules.mjs.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';
import { findIssues } from './privacy-rules.mjs';

// The rule files necessarily contain the patterns they detect.
const SELF = [
  'scripts/privacy-rules.mjs',
  'scripts/check-privacy.mjs',
  'scripts/privacy-rules.d.mts',
  'tests/e2e/rules.spec.ts', // deliberate bad examples for the rules
];
const SKIP_FILES = new Set(['package-lock.json', ...SELF]);
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.gif']);
const BAD_NAME = [
  { name: 'PDF file', re: /\.pdf$/i },
  { name: 'transcript file', re: /transcript/i },
];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
const list = (...args) =>
  git(...args)
    .split('\0')
    .filter(Boolean);
const hits = [];

const scan = (label, text) => {
  for (const i of findIssues(text)) hits.push(`${label}:${i.line}  [${i.rule}]  ${i.text}`);
};

const files = [...new Set([...list('ls-files', '-z'), ...list('ls-files', '-z', '-o', '--exclude-standard')])];
for (const f of files) {
  for (const r of BAD_NAME) if (r.re.test(f)) hits.push(`${f}  [${r.name}] must not be committed`);
  if (SKIP_FILES.has(f) || BINARY.has(extname(f).toLowerCase())) continue;
  let text;
  try {
    if (!statSync(f).isFile()) continue;
    text = readFileSync(f, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') continue; // deleted but still listed
    hits.push(`${f}  [unreadable] ${err?.message}`);
    continue;
  }
  scan(f, text);
}

const withHistory = process.argv.includes('--history');
if (withHistory) {
  let hasCommits = true;
  try {
    git('rev-parse', '--verify', 'HEAD');
  } catch {
    hasCommits = false;
  }
  if (hasCommits) {
    for (const f of new Set(list('log', '--all', '-z', '--name-only', '--pretty=format:'))) {
      for (const r of BAD_NAME) if (r.re.test(f)) hits.push(`history: ${f}  [${r.name}]`);
    }
    // -m and --first-parent off: include merge diffs too. Added lines only.
    const patch = git(
      'log',
      '--all',
      '-m',
      '-p',
      '--no-color',
      '--pretty=format:commit %h',
      '--',
      '.',
      ':(exclude)package-lock.json',
      ...SELF.map((f) => `:(exclude)${f}`),
    );
    scan(
      'history',
      patch
        .split('\n')
        .filter((l) => l.startsWith('+') || l.startsWith('commit'))
        .join('\n'),
    );
  }
}

if (hits.length) {
  console.error(`privacy check FAILED (${hits.length}):\n` + hits.map((h) => '  ' + h).join('\n'));
  process.exit(1);
}
console.log(`privacy check passed (${files.length} files${withHistory ? ' + history' : ''})`);
