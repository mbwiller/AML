/**
 * Manifest for `true-vs-empirical-risk` (lesson 2.2). Imported at build time
 * by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="true-vs-empirical-risk" …>` props and render the static
 * fallback. The prop names match what lesson 2.2 passes (`dataset`, `arm`,
 * `model`, `n`, `showTrueRisk`, `showTrainingRisk`, `resample`).
 */
import { z } from 'zod';

import { ARMS } from '@/lib/datasets/vasco';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';
import { THETA_MODES } from './math';

export const params = z.strictObject({
  /** The case dataset; VASCO's arms have closed-form true risks. */
  dataset: z.enum(['vasco']).default('vasco').describe('case dataset (VASCO only)'),
  /** Which trial arm the patients come from. */
  arm: z.enum(ARMS).default('placebo').describe('VASCO arm'),
  /** The model class; lesson 2.2's running toy is the constant predictor f_θ(x) = θ. */
  model: z.enum(['constant']).default('constant').describe('model class (constant: f_θ(x) = θ)'),
  /** Patients per training set. */
  n: z.int().min(2).max(500).default(50).describe('patients per training set'),
  /** Draw the true risk R(θ). */
  showTrueRisk: z.boolean().default(true).describe('draw the true risk R(θ)'),
  /** Draw the empirical (training) risk R̂(θ). */
  showTrainingRisk: z.boolean().default(true).describe('draw the training risk R̂(θ)'),
  /** Offer "Resample" buttons that draw fresh training sets. */
  resample: z.boolean().default(true).describe('show the resample buttons'),
  /** Which θ is scored on each training set. */
  thetaMode: z
    .enum(THETA_MODES)
    .default('true-mean')
    .describe('θ scored: the true mean θ*, θ* + offset, or the fitted ȳ'),
  /** For thetaMode "fixed": θ − θ* in mmHg. */
  thetaOffset: z.number().min(-10).max(10).default(4).describe('fixed θ minus θ* (mmHg)'),
  /** Seed of the fresh training sets. */
  seed: z.int().default(5).describe('seed of the fresh training sets'),
  /** Which training set: 0 is the trial's own arm (n ≤ 50); 1, 2, … are fresh draws. */
  draw: z.int().min(0).default(0).describe('training-set index (0 = the trial’s arm)'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'true-vs-empirical-risk',
  title: 'True risk and training risk',
  challenge:
    'Resample with θ fixed at the true mean and watch the training risk scatter evenly around the true risk. Switch to the fitted mean θ̂ = ȳ and resample again: which side does the training risk land on, and how far on average?',
  usedIn: ['2.2'],
  height: 790,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
