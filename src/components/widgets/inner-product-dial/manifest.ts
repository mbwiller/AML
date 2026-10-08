/**
 * Manifest for `inner-product-dial` (VISION.md §9.3, P1; lesson 2.3).
 * Imported at build time by `manifests.ts` (no React here) so `Widget.astro`
 * can validate `<Widget name="inner-product-dial" …>` props. The prop names
 * match what lesson 2.3 passes (`gradient`, `showCosineCurve`,
 * `showHalfSpace`).
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';

/** Range of each gradient component (the sliders and the schema agree). */
export const G_MAX = 5;

const component = z.number().min(-G_MAX).max(G_MAX);

export const params = z.strictObject({
  /** The gradient g = ∇f(θ) at the current point, as [∂f/∂θ₁, ∂f/∂θ₂]. */
  gradient: z.tuple([component, component]).default([3, 4]),
  /** Direction ϑ of the unit step u = (cos ϑ, sin ϑ), degrees counterclockwise from the θ₁ axis. */
  angle: z.number().min(0).max(360).default(120),
  /** Plot the rate gᵀu against ϑ (L4 p.16's cosine curve). */
  showCosineCurve: z.boolean().default(true),
  /** Shade the half-plane of descent directions {u : gᵀu < 0}. */
  showHalfSpace: z.boolean().default(true),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'inner-product-dial',
  title: 'The slope in every direction',
  challenge:
    'Turn the unit step u all the way around. Where is the slope largest, where is it most negative, and where is it zero?',
  usedIn: ['2.3'],
  height: 560,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
