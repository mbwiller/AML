/**
 * Manifest for `linear-bias-probe` (lesson 1.2). Imported at build time by
 * `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="linear-bias-probe" …>` props and render the static
 * fallback. The prop names match what lesson 1.2 passes (`dataset`,
 * `features`, `showTruth`, `showInteraction`).
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';
import { FEATURES } from './math';

export const params = z.strictObject({
  /** The case dataset; VASCO is the only one with a known dose–response. */
  dataset: z.enum(['vasco']).default('vasco').describe('case dataset (VASCO only)'),
  /** Columns of the linear model besides the intercept (order does not matter). */
  features: z
    .array(z.enum(FEATURES))
    .max(FEATURES.length)
    .default(['dose', 'baseline_sbp'])
    .describe('model features: dose, log1p_dose, emax_dose, baseline_sbp'),
  /** Draw the true mean f*(D, B) of the generative model. */
  showTruth: z.boolean().default(true).describe('draw the true dose–response f*(D, B)'),
  /** Add each dose feature times baseline as an extra column. */
  showInteraction: z.boolean().default(false).describe('add the dose × baseline column'),
  /** Draw the best model in the class (least squares on the population, n → ∞). */
  showPopulationFit: z.boolean().default(true).describe('draw the n → ∞ fit'),
  /** Base dose of the +10 mg probe step. */
  probeDose: z.number().min(0).max(30).default(0).describe('base dose of the +10 mg step (mg)'),
  /** Baseline SBP at which the probe and the dose slice are drawn. */
  probeBaseline: z
    .number()
    .min(120)
    .max(190)
    .default(155)
    .describe('baseline SBP of the probe and slice (mmHg)'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'linear-bias-probe',
  title: 'What a linear model must get wrong',
  challenge:
    'Apply the +10 mg step at 0 mg and again at 20 mg, and compare the model’s change with the truth’s. Then swap the dose feature for D/(6 + D) and watch the residual pattern and the squared bias.',
  usedIn: ['1.2', '1.4'],
  height: 820,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
