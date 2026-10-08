/**
 * Manifest for `hessian-classifier` (VISION.md §9.3, P1; lesson 2.3).
 * Imported at build time by `manifests.ts` (no React here) so `Widget.astro`
 * can validate `<Widget name="hessian-classifier" …>` props. The prop names
 * match what lesson 2.3 passes (`eigenvalues`, `rotation`, `showLevelSets`).
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';
import { HIGHER_ORDER } from './math';

/** Range of each eigenvalue (the sliders and the schema agree). */
export const LAMBDA_MAX = 3;

const eigenvalue = z.number().min(-LAMBDA_MAX).max(LAMBDA_MAX);

export const params = z.strictObject({
  /** [λ₁, λ₂], the eigenvalues of the Hessian H at the critical point. */
  eigenvalues: z.tuple([eigenvalue, eigenvalue]).default([2, 0.5]),
  /** Angle in degrees of the first eigenvector q₁ from the θ₁ axis; H = Q diag(λ) Qᵀ. */
  rotation: z.number().min(-90).max(90).default(0),
  /** Draw level sets of f (solid above f(0), dashed below, f = 0 in bold). */
  showLevelSets: z.boolean().default(true),
  /** Draw the unit eigenvectors q₁, q₂ with their eigenvalues. */
  showEigenvectors: z.boolean().default(true),
  /** A term added along the flattest eigenvector q (smallest |λ|): none, ¼(qᵀx)⁴, −¼(qᵀx)⁴, or ⅓(qᵀx)³. */
  higherOrder: z.enum(HIGHER_ORDER).default('none'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'hessian-classifier',
  title: 'Classifying a critical point from the Hessian',
  challenge:
    'Make the critical point a minimum, then a maximum, then a saddle. Then set one eigenvalue to 0 and try the higher-order terms: what does the Hessian alone fail to tell you?',
  usedIn: ['2.3'],
  height: 740,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
