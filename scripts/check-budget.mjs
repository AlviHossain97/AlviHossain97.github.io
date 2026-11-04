// JS budget, measured on the built site (gzip). Fails CI when a limit is exceeded.
//   lazy 3D chunk (ThreeUI Topo Field, requested only after first paint): <= 75 KB
//   everything else (React runtime, islands, motion, page scripts):         <= 90 KB
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const dir = fileURLToPath(new URL('../dist/_astro/', import.meta.url));
const LIMITS = { lazy3d: 75, rest: 90 };
let lazy = 0;
let rest = 0;
for (const n of (await readdir(dir)).filter((f) => f.endsWith('.js'))) {
  const kb = gzipSync(await readFile(join(dir, n))).length / 1024;
  if (n.startsWith('ConstellationField.')) lazy += kb;
  else rest += kb;
}
console.log(
  `JS budget: lazy 3D chunk ${lazy.toFixed(1)} KB / ${LIMITS.lazy3d}, rest ${rest.toFixed(1)} KB / ${LIMITS.rest} (gzip)`,
);
if (lazy === 0)
  throw new Error('budget: ConstellationField chunk not found; update the pattern in scripts/check-budget.mjs');
if (lazy > LIMITS.lazy3d || rest > LIMITS.rest) {
  console.error('JS budget exceeded');
  process.exit(1);
}
