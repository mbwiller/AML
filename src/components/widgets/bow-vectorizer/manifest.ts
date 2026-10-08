/**
 * Manifest for `bow-vectorizer` (lesson 6.2; L9 pp.12–16). Imported at
 * build time by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="bow-vectorizer" …>` props and render the static fallback.
 * The prop names match what lesson 6.2 passes (`dataset`, `binary`,
 * `removeStopWords`, `stem`).
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';

export const params = z.strictObject({
  /** Which case dataset supplies the training reports and the default report. */
  dataset: z.enum(['notes']).default('notes').describe('case dataset (NOTES only, for now)'),
  /** φ(x)_j = 1 if word j occurs (CountVectorizer(binary=True)); off: the count c_j(x). */
  binary: z.boolean().default(true).describe('0/1 presence instead of counts'),
  /** Drop stop words before fitting and transforming. */
  removeStopWords: z.boolean().default(false).describe('remove English stop words'),
  /** Apply the widget's suffix-stripping stemmer (not Porter) before fitting and transforming. */
  stem: z.boolean().default(false).describe('apply the tiny suffix-stripping stemmer'),
  /** Reports the vocabulary is fitted on (a seeded sample of NOTES). */
  trainSize: z
    .int()
    .min(5)
    .max(200)
    .default(20)
    .describe('training reports the vocabulary is fitted on'),
  /** Seed for the training sample and the held-out report. */
  seed: z.int().default(5).describe('seed of the training sample and the held-out report'),
  /** Which held-out report fills the textbox; "Another report" steps it. */
  report: z.int().min(0).max(999).default(0).describe('index of the held-out default report'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'bow-vectorizer',
  title: 'Bag of words: fit a vocabulary, transform a report',
  challenge:
    'Type a word the training reports never used: which column does it get? Then turn binary off and repeat a word three times, and turn on stop-word removal and stemming to watch |V| shrink.',
  usedIn: ['6.2'],
  height: 700,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
