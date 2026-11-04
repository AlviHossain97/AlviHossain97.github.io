// Shared privacy + content rules: used by check-privacy.mjs (files, history), the postbuild step (built output)
// and the Playwright tests. Private words are stored only as SHA-256 hashes so this public file never contains them.
import { createHash } from 'node:crypto';

const PRIVATE_WORD_HASHES = new Set(['a503694f5b216f54d1e701fef2d5be843918a8b6b2566ba684a1d1610d15ab55']);

const sha = (w) => createHash('sha256').update(w).digest('hex');

// A run of digits that could be a phone number: separators allowed, decimals not.
const PHONE_CANDIDATE = /(?<![\d.])[+(]?\d[\d\s()-]{8,}\d(?![\d.])/g;
const PHONE_DIGITS = /^(?:\+?44|0044)0?\d{9,10}$|^0\d{9,10}$/;

export const RULES = [
  {
    name: 'phone number',
    test: (line) => (line.match(PHONE_CANDIDATE) ?? []).some((m) => PHONE_DIGITS.test(m.replace(/[\s()-]/g, ''))),
  },
  { name: 'UK postcode', test: (line) => /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i.test(line) },
  {
    name: 'private word (home town)',
    test: (line) => (line.toLowerCase().match(/[a-z]{4,}/g) ?? []).some((w) => PRIVATE_WORD_HASHES.has(sha(w))),
  },
  { name: 'date of birth', test: (line) => /\b(date of birth|dob|born on|born in \d{4}|aged? \d{2})\b/i.test(line) },
  { name: 'student ID', test: (line) => /\bstudent\s*(id|number|no\.?)\b/i.test(line) },
  { name: 'banned phrase', test: (line) => /production[- ]ready|ready[- ]for[- ]production/i.test(line) },
];

/** Returns [{rule, line, text}] for every line that breaks a rule. */
export function findIssues(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const r of RULES) if (r.test(line)) out.push({ rule: r.name, line: i + 1, text: line.trim().slice(0, 100) });
  });
  return out;
}
