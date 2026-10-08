/**
 * Shared plumbing for `scripts/gen-datasets/*`: the registry of generators,
 * and write / check of `src/data/<case>.json` (STYLE_GUIDE §8).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate as generateAdverse } from '@/lib/datasets/adverse';
import { generate as generateDiabetesBmi20 } from '@/lib/datasets/diabetes-bmi-20';
import { generate as generateNotes } from '@/lib/datasets/notes';
import { stableStringify } from '@/lib/datasets/serialize';
import { generate as generateTropo } from '@/lib/datasets/tropo';
import type { DatasetId, Dataset } from '@/lib/datasets/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = path.join(root, 'src', 'data');

/** Each JSON file must stay reviewable; see docs/decisions/2026-10-07-dataset-generators.md. */
export const MAX_BYTES = 1_000_000;

export const GENERATORS: Record<DatasetId, () => Dataset<unknown>> = {
  'diabetes-bmi-20': generateDiabetesBmi20,
  notes: generateNotes,
  adverse: generateAdverse,
  tropo: generateTropo,
};

export const CASE_IDS = Object.keys(GENERATORS) as DatasetId[];

export function dataPath(id: DatasetId): string {
  return path.join(DATA_DIR, `${id}.json`);
}

export function render(id: DatasetId): string {
  const generator = GENERATORS[id];
  const text = stableStringify(generator());
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > MAX_BYTES) {
    throw new Error(`${id}.json would be ${bytes} bytes, over the ${MAX_BYTES}-byte limit`);
  }
  return text;
}

/** Write the file; returns its size in bytes. */
export function writeCase(id: DatasetId): number {
  const text = render(id);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(dataPath(id), text, 'utf8');
  return Buffer.byteLength(text, 'utf8');
}

/** Regenerate in memory and compare with the committed file; returns a problem or null. */
export function checkCase(id: DatasetId): string | null {
  const file = dataPath(id);
  if (!existsSync(file)) return `${path.relative(root, file)} is missing; run pnpm gen:datasets`;
  const onDisk = readFileSync(file, 'utf8');
  const fresh = render(id);
  if (onDisk === fresh) return null;
  const a = onDisk.split('\n');
  const b = fresh.split('\n');
  let line = 0;
  while (line < a.length && line < b.length && a[line] === b[line]) line++;
  return `${path.relative(root, file)} differs from the generator at line ${line + 1}; run pnpm gen:datasets`;
}
