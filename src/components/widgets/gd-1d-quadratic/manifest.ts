/**
 * Manifest for `gd-1d-quadratic` (VISION.md §9.3 P0; lesson 2.5). Imported at
 * build time by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="gd-1d-quadratic" …>` props and render the static fallback.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';

export const MARKERS = ['eta_opt', 'two_eta_opt'] as const;
export type Marker = (typeof MARKERS)[number];

export const params = z.strictObject({
  /** Curvature E''(θ) = a; η_opt = 1/a. */
  a: z.number().min(1).max(5).default(2).describe('curvature a = E″(θ); η_opt = 1/a'),
  b: z.number().min(-10).max(10).default(-4).describe('linear coefficient; θ* = −b/a'),
  c: z.number().min(-10).max(10).default(0).describe('constant (shifts E, not the iterates)'),
  /** Fixed step size η. The slider covers [0, 2.5], past 2η_opt for every a ≥ 1. */
  eta: z.number().min(0).max(2.5).default(0.25).describe('step size η'),
  theta0: z.number().min(-10).max(10).default(5).describe('starting point θ(0)'),
  steps: z.int().min(1).max(40).default(12).describe('gradient steps drawn'),
  /** Show the contraction factor 1 − ηa on the regime strip, the readout, and the error envelope. */
  showContraction: z.boolean().default(true).describe('show the factor 1 − ηa'),
  /** Which reference step sizes get a tick on the η strip and a "set η" button. */
  markers: z
    .array(z.enum(MARKERS))
    .max(2)
    .default(['eta_opt', 'two_eta_opt'])
    .describe('ticks and buttons at η_opt and 2η_opt'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'gd-1d-quadratic',
  title: 'Gradient descent on a parabola',
  challenge:
    'Find an η that lands on the minimum in one step, one that oscillates but converges, and one that diverges. Where is 1 − ηa each time?',
  usedIn: ['2.5'],
  height: 680,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
