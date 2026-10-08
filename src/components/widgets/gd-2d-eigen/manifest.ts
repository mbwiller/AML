/**
 * Manifest for `gd-2d-eigen` (VISION.md §9.3 P0; lesson 2.5). Imported at
 * build time by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="gd-2d-eigen" …>` props and render the static fallback.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';
import { DOMAIN } from './math';

export const params = z.strictObject({
  /** Eigenvalue along q1 = (cos φ, sin φ); at rotation 0 this is a11. */
  lambda1: z.number().min(0.1).max(5).default(1).describe('eigenvalue λ1 (curvature along q1)'),
  /** Eigenvalue along q2 = (−sin φ, cos φ); at rotation 0 this is a22. */
  lambda2: z.number().min(0.1).max(5).default(3).describe('eigenvalue λ2 (curvature along q2)'),
  /** Rotation φ of the eigenbasis, in degrees. */
  rotation: z.number().min(-90).max(90).default(0).describe('rotation φ of the eigenvectors (deg)'),
  eta: z.number().min(0).max(2).default(0.25).describe('step size η'),
  /** Starting point θ(0); the minimizer is the origin. */
  start: z
    .tuple([z.number().min(-DOMAIN).max(DOMAIN), z.number().min(-DOMAIN).max(DOMAIN)])
    .default([-15, 15])
    .describe('starting point θ(0) = [x, y]'),
  steps: z.int().min(1).max(100).default(25).describe('gradient steps drawn'),
  /** Eigen-axes on the plane, the per-mode table, and the per-mode error chart. */
  showModes: z.boolean().default(true).describe('per-mode factors 1 − ηλᵢ'),
  /** Small multiples of L4 p.53: the five step sizes side by side. */
  showFive: z.boolean().default(false).describe("L4 p.53's five step sizes side by side"),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'gd-2d-eigen',
  title: 'One step size, two curvatures',
  challenge:
    'Try η = 0.75, 1, 1.5, 2, and 2.1 times 1/λmax. Which run reaches a small error in the fewest steps? Then rotate the bowl: do the per-mode factors change?',
  usedIn: ['2.5'],
  height: 672,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
