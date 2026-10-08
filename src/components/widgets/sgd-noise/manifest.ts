/**
 * Manifest for `sgd-noise` (VISION.md §9.3 P1; lesson 2.5). Imported at build
 * time by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="sgd-noise" …>` props and render the static fallback.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';
import { WINDOW } from './math';

export const params = z.strictObject({
  /** Training examples in the seeded least-squares problem. */
  n: z.int().min(10).max(400).default(100).describe('training examples n'),
  /** Minibatch size b (clamped to n). */
  batchSize: z.int().min(1).max(400).default(1).describe('minibatch size b (≤ n)'),
  eta: z.number().min(0.01).max(0.5).default(0.1).describe('step size η (arrows are −η g)'),
  /** Overlay the full gradient ∇R̂ (the mean of the minibatch gradients). */
  showMeanGradient: z.boolean().default(true).describe('overlay the full gradient ∇R̂'),
  /** How many minibatch gradients are drawn at the probe point. */
  draws: z.int().min(1).max(400).default(40).describe('minibatches K drawn at the probe point'),
  /** Indices drawn independently (def-2-5-5) or as a shuffled block without replacement. */
  replacement: z.boolean().default(true).describe('sample indices with replacement'),
  /** Arrows at one point, or a constant-step SGD path next to the GD path. */
  view: z.enum(['arrows', 'path']).default('arrows').describe('arrows | path'),
  /** Probe point as an offset from θ̂. */
  probe: z
    .tuple([z.number().min(-WINDOW).max(WINDOW), z.number().min(-WINDOW).max(WINDOW)])
    .default([-2.2, 0.2])
    .describe('probe point θ − θ̂ = [x, y]'),
  /** Steps of the SGD and GD paths in the path view. */
  pathSteps: z.int().min(10).max(300).default(80).describe('steps in the path view'),
  /** Seed of the data. */
  seed: z.int().default(5).describe('seed of the data'),
  /** Seed of the minibatch stream ("New draws" steps it). */
  drawSeed: z.int().min(0).default(1).describe('seed of the minibatch draws'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'sgd-noise',
  title: 'Minibatch gradients: unbiased and noisy',
  challenge:
    'At batch size 1, average many sampled gradients: does the average match the full gradient? Raise the batch size to 4, then 16. By what factor does the spread shrink?',
  usedIn: ['2.5'],
  height: 628,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
