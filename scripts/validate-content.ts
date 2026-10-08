/**
 * `pnpm validate:content [--strict] [--quiet]`
 *
 * Reads every file under src/content, runs the pure checks in
 * src/lib/content/validate.ts, prints findings, and exits 1 on any error
 * (or on any warning with --strict). The Astro build runs this first.
 */
import { readdirSync, readFileSync, type Dirent } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONTENT_ROOT,
  runValidation,
  summaryLine,
  type Finding,
  type RawFile,
} from '../src/lib/content/validate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const quiet = args.has('--quiet');

function readTree(dir: string): RawFile[] {
  const abs = path.join(root, dir);
  let entries: Dirent[];
  try {
    entries = readdirSync(abs, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  const files: RawFile[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (!/\.(mdx|ya?ml)$/.test(rel)) continue;
    files.push({ path: rel, text: readFileSync(full, 'utf-8') });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function print(kind: 'error' | 'warning', findings: Finding[]): void {
  const sorted = [...findings].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.message.localeCompare(b.message),
  );
  for (const f of sorted) {
    const where = f.line === undefined ? f.file : `${f.file}:${f.line}`;
    console.log(`${kind.padEnd(8)} ${where}  ${f.message}`);
  }
}

const result = runValidation(readTree(CONTENT_ROOT));

if (!quiet) {
  print('error', result.errors);
  print('warning', result.warnings);
}
console.log(summaryLine(result));

if (result.errors.length > 0 || (strict && result.warnings.length > 0)) process.exit(1);
