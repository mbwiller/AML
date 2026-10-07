/**
 * Manifest for `gaussian-2d-covariance` (VISION.md §9.3, §12.4; lesson 7.1).
 * Imported at build time by `manifests.ts` (no React here) so `Widget.astro`
 * can validate `<Widget name="gaussian-2d-covariance" …>` props.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';

export const params = z.strictObject({
  /** Standard deviation along x. */
  sigmaX: z.number().min(0.2).max(3).default(1),
  /** Standard deviation along y. */
  sigmaY: z.number().min(0.2).max(3).default(1),
  /** Correlation coefficient ρ = cov(x, y) / (σx σy). */
  rho: z.number().min(-0.95).max(0.95).default(0.6),
  /** Number of sampled points drawn from N(0, Σ). */
  n: z.int().min(0).max(400).default(200),
  /** Seed for the sampler, so the scatter is the same on every machine. */
  seed: z.int().default(7),
  showEigenvectors: z.boolean().default(true),
  showMatrix: z.boolean().default(true),
  /** Show the sampled points (lesson 7.1 uses this; off hides the scatter). */
  showSamples: z.boolean().default(true),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'gaussian-2d-covariance',
  title: 'Covariance and the shape of a Gaussian',
  challenge: 'Make the ellipse a circle without touching ρ. Then make it collapse to a line.',
  usedIn: ['7.1'],
  height: 420,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
