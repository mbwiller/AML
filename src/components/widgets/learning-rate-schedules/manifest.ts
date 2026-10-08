/**
 * Manifest for `learning-rate-schedules` (VISION.md §9.3 P1; lesson 2.5).
 * Imported at build time by `manifests.ts` (no React here) so `Widget.astro`
 * can validate `<Widget name="learning-rate-schedules" …>` props and render
 * the static fallback.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';
import { SCHEDULES } from './math';

export const params = z.strictObject({
  /** Which schedule is highlighted (L5 p.11's three, plus a constant baseline). */
  schedule: z
    .enum(SCHEDULES)
    .default('inverse')
    .describe('constant | inverse η₀/(t+1) | inverse-square η₀/(t+1)² | exponential η₀e^{−βt}'),
  eta0: z.number().min(0.1).max(3).default(1).describe('initial step size η₀'),
  /** Decay rate of the exponential schedule (ignored by the others). */
  beta: z.number().min(0.01).max(1).default(0.1).describe('exponential decay rate β'),
  /** Show the cumulative sums Σηₜ and Σηₜ² against the distance to the minimum. */
  showCumulative: z.boolean().default(true).describe('cumulative Σηₜ and Σηₜ²'),
  /** Distance from θ(0) to the minimizer θ* = 0. */
  start: z.number().min(1).max(30).default(5).describe('starting distance |θ(0) − θ*|'),
  steps: z.int().min(20).max(1000).default(200).describe('iterations T drawn'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'learning-rate-schedules',
  title: 'Decaying step sizes and the Robbins–Monro conditions',
  challenge:
    'Start far from the minimum. Which schedules stall before they arrive? Compare the cumulative sum of ηₜ with the distance to the minimum.',
  usedIn: ['2.5'],
  height: 776,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
