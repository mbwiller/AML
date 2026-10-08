/**
 * Manifest for `encoding-explorer` (lesson 1.1; L2 pp.9–10). Imported at
 * build time by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="encoding-explorer" …>` props and render the static fallback.
 * The prop names match what lesson 1.1 passes (`categories`, `encodings`).
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';
import { ENCODINGS } from './math';

const unique = <T>(xs: readonly T[]) => new Set(xs).size === xs.length;

export const params = z.strictObject({
  /** The categorical column's distinct values, in order (zip codes, ICD-like codes). */
  categories: z
    .array(z.string().min(1).max(12))
    .min(2)
    .max(8)
    .refine(unique, 'categories must be distinct')
    .default(['10040', '10041', '10042', '10043', '10044'])
    .describe('distinct category values, in order (2–8)'),
  /** Which encodings the reader can switch between (and the comparison table lists). */
  encodings: z
    .array(z.enum(ENCODINGS))
    .min(1)
    .max(4)
    .refine(unique, 'encodings must be distinct')
    .default([...ENCODINGS])
    .describe('encodings offered: integer | standardized | one-hot | one-hot-drop-first'),
  /** The encoding shown in the design-matrix table (falls back to the first offered). */
  encoding: z.enum(ENCODINGS).default('integer').describe('encoding shown in the matrix'),
  /** Prepend an all-ones column θ₀. */
  intercept: z.boolean().default(true).describe('include the intercept column of ones'),
  /** Target value per category (risk score 0–10); missing entries use an even ramp from 2 to 4. */
  targets: z
    .array(z.number().min(0).max(10))
    .max(8)
    .default([])
    .describe('target per category; [] = an even ramp from 2 to 4'),
  /** Position c along the null direction when θ is not unique (one-hot with an intercept). */
  shift: z.number().min(-5).max(5).default(0).describe('c in θ + c·v when θ is not unique'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'encoding-explorer',
  title: 'One categorical column, four encodings',
  challenge:
    'Make the middle category the highest. Which encodings can still fit every target exactly? Then use one-hot with an intercept and slide c: the coefficients change, the predictions do not.',
  usedIn: ['1.1'],
  height: 720,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
