/**
 * Astro integration: serve course files and case datasets without moving them.
 *
 * - `astro build`: after the pages are written, copy each file from
 *   `staticCopies()` into the output directory (the lecture PDFs, syllabus,
 *   and notebooks from `AML Course Material/` under `/materials/files/…`;
 *   `src/data/*.json` under `/data/…`). The source folders are only read.
 * - `astro dev`: answer the same URLs from the source files, so links work
 *   in the dev server without a copy.
 *
 * `public/` is not used because it would need a duplicate or a symlink of a
 * read-only folder. Adds about 25 MB to the deploy (the PDFs dominate).
 */
import { copyFileSync, createReadStream, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

import { staticCopies } from '../materials-scan.ts';

const TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.ipynb': 'application/x-ipynb+json',
  '.json': 'application/json',
};

function contentType(path: string): string {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return TYPES[ext] ?? 'application/octet-stream';
}

export function copyStatic(): AstroIntegration {
  let root = process.cwd();
  return {
    name: 'aml-copy-static',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root);
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const path = decodeURIComponent((req.url ?? '').split(/[?#]/)[0] ?? '');
          if (!path.startsWith('/materials/files/') && !path.startsWith('/data/')) return next();
          const hit = staticCopies(root).find((c) => c.to === path);
          if (!hit) return next();
          res.setHeader('content-type', contentType(hit.from));
          res.setHeader('content-length', String(statSync(hit.from).size));
          createReadStream(hit.from).pipe(res);
        });
      },
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        let bytes = 0;
        const copies = staticCopies(root);
        for (const { from, to } of copies) {
          const target = join(out, to);
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(from, target);
          bytes += statSync(from).size;
        }
        logger.info(`copied ${copies.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
      },
    },
  };
}
