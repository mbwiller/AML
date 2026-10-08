/**
 * Manifest for `bow-nb-scorer` (VISION.md §9.3 P0; lesson 6.3). Imported at
 * build time by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="bow-nb-scorer" …>` props and render the static fallback.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';

export const params = z.strictObject({
  /** Which case dataset supplies the vocabulary, training reports, and default note. */
  dataset: z.enum(['notes']).default('notes').describe('case dataset (NOTES only, for now)'),
  /** Laplace add-one smoothing of ψ; off exposes the log 0 = −∞ failure. */
  smoothing: z.boolean().default(true).describe('Laplace add-one smoothing of ψ'),
  /** Reports in the seeded training subsample the model is fitted on. */
  trainSize: z
    .int()
    .min(200)
    .max(6000)
    .default(2000)
    .describe('training reports (seeded subsample of NOTES)'),
  /** Seed for the training subsample and the default report. */
  seed: z.int().default(11).describe('seed of the subsample and default report'),
  /** How many per-word bars to show (largest |vote| first). */
  maxWords: z.int().min(3).max(30).default(12).describe('bars shown, largest |vote| first'),
  /** Which seeded report fills the textarea; "Another report" steps it. */
  report: z.int().min(0).max(5999).default(0).describe('index of the seeded default report'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'bow-nb-scorer',
  title: 'Bernoulli Naive Bayes, one word at a time',
  challenge:
    'Add one rare word to the report and turn smoothing off. Find a word that makes a whole class impossible; then turn smoothing back on and read that word’s vote.',
  usedIn: ['6.3'],
  height: 520,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
