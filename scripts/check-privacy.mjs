// Privacy + content guard. Run: `node scripts/check-privacy.mjs [--history]`
// Fails (exit 1) if tracked/untracked-not-ignored files contain phone numbers, postcodes,
// the home town, DOB / student-ID wording, any PDF, or banned phrases.
// With --history it also scans every commit on every branch.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const SELF = 'scripts/check-privacy.mjs'; // contains the patterns, so it is excluded from scanning
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.gif', '.svg']);
const SKIP_FILES = new Set([SELF, 'package-lock.json']);

const RULES = [
  { name: 'UK phone number', re: /(?<![\d.])(?:\+44\s?\(?0?\)?\s?|0)(?:7\d{3}|\d{3,4})[\s-]?\d{3}[\s-]?\d{3,4}(?!\d)/ },
  { name: 'UK postcode', re: /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/ },
  { name: 'home town / address', re: /REDACTED/i },
  { name: 'date of birth', re: /\b(date of birth|dob|born on)\b/i },
  { name: 'student ID', re: /\bstudent\s*(id|number|no\.?)\b/i },
  { name: 'banned phrase', re: /production[- ]ready/i },
];
const BAD_NAME = [
  { name: 'PDF file', re: /\.pdf$/i },
  { name: 'transcript file', re: /transcript/i },
];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });
const hits = [];

function scanText(label, text) {
  text.split(/\r?\n/).forEach((line, i) => {
    for (const r of RULES)
      if (r.re.test(line)) hits.push(`${label}:${i + 1}  [${r.name}]  ${line.trim().slice(0, 100)}`);
  });
}

const files = [
  ...new Set([...git('ls-files').split('\n'), ...git('ls-files', '-o', '--exclude-standard').split('\n')]),
].filter(Boolean);

for (const f of files) {
  for (const r of BAD_NAME) if (r.re.test(f)) hits.push(`${f}  [${r.name}] must not be committed`);
  if (SKIP_FILES.has(f) || BINARY.has(extname(f).toLowerCase())) continue;
  try {
    if (statSync(f).isFile()) scanText(f, readFileSync(f, 'utf8'));
  } catch {
    /* deleted file */
  }
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
    const names = git('log', '--all', '--name-only', '--pretty=format:').split('\n').filter(Boolean);
    for (const f of new Set(names)) for (const r of BAD_NAME) if (r.re.test(f)) hits.push(`history: ${f}  [${r.name}]`);
    const patch = git(
      'log',
      '--all',
      '-p',
      '--no-color',
      '--pretty=format:commit %h',
      '--',
      '.',
      `:(exclude)${SELF}`,
      ':(exclude)package-lock.json',
    );
    scanText(
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
