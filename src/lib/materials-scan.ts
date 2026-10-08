/**
 * Build-time scan of `AML Course Material/` (read-only; never written) into
 * the manifest that /materials renders and the copy step serves
 * (VISION.md §7 "Materials"). Node-only (fs), framework-free.
 *
 * What is served: the lecture PDFs, the other PDFs in `Lectures/` (the
 * syllabus), and the notebooks in `Lectures/` and `Code Companions/`.
 * Not served: `Homeworks/` (our solutions and multi-megabyte Kaggle CSVs).
 *
 * Relative imports only (loaded from astro.config.mjs).
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  LECTURE_SCHEDULE,
  lectureNumberFromFilename,
  materialUrl,
  notebookLectures,
  type MaterialsManifest,
} from './materials.ts';
import { slugify } from './markdown/numbering.ts';

export const MATERIALS_DIR = 'AML Course Material';

const NOTEBOOK_DIRS = ['Code Companions', 'Lectures'];

function files(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(ext) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/** Scan the course folder under `root` (the project root). Missing folders yield empty lists. */
export function scanMaterials(root: string = process.cwd()): MaterialsManifest {
  const base = resolve(root, MATERIALS_DIR);
  const manifest: MaterialsManifest = { lectures: [], notebooks: [], documents: [] };

  for (const name of files(join(base, 'Lectures'), '.pdf')) {
    const source = `Lectures/${name}`;
    const bytes = statSync(join(base, source)).size;
    const lecture = lectureNumberFromFilename(name);
    if (lecture === null) {
      manifest.documents.push({
        title: name.replace(/\.pdf$/i, ''),
        source,
        url: materialUrl('documents', name),
        bytes,
      });
      continue;
    }
    const schedule = LECTURE_SCHEDULE[lecture];
    manifest.lectures.push({
      lecture,
      title: schedule?.topic ?? name.replace(/\.pdf$/i, ''),
      date: schedule?.date,
      source,
      url: materialUrl('lectures', name),
      bytes,
    });
  }
  manifest.lectures.sort((a, b) => a.lecture - b.lecture);

  for (const dir of NOTEBOOK_DIRS) {
    for (const name of files(join(base, dir), '.ipynb')) {
      const source = `${dir}/${name}`;
      const { lectures, note } = notebookLectures(name);
      manifest.notebooks.push({
        name,
        slug: slugify(name),
        source,
        url: materialUrl('notebooks', name),
        bytes: statSync(join(base, source)).size,
        lectures,
        note,
      });
    }
  }
  manifest.notebooks.sort(
    (a, b) => (a.lectures[0] ?? 99) - (b.lectures[0] ?? 99) || a.name.localeCompare(b.name),
  );
  return manifest;
}

let cached: MaterialsManifest | undefined;

/** The manifest for the current project, scanned once per build. */
export function materialsManifest(): MaterialsManifest {
  cached ??= scanMaterials();
  return cached;
}

/** The copied PDF of a lecture, or undefined when the course folder has none. */
export function lecturePdfUrl(lecture: number): string | undefined {
  return materialsManifest().lectures.find((l) => l.lecture === lecture)?.url;
}

/** Every `{ from, to }` pair the build copies: course files and `src/data/*.json`. */
export function staticCopies(root: string): { from: string; to: string }[] {
  const base = resolve(root, MATERIALS_DIR);
  const m = scanMaterials(root);
  const out = [...m.lectures, ...m.notebooks, ...m.documents].map((f) => ({
    from: join(base, f.source),
    to: f.url,
  }));
  const data = resolve(root, 'src/data');
  for (const name of files(data, '.json'))
    out.push({ from: join(data, name), to: `/data/${name}` });
  return out;
}
