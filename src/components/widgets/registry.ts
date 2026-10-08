/**
 * The widget registry (tech-stack memo §3 "Widgets in MDX"): name → lazy
 * loader of that widget's module. Astro cannot combine a dynamic component
 * tag with `client:*`, so `WidgetHost` (one React island) resolves the name
 * here and Vite code-splits each `Widget.tsx` into its own chunk.
 *
 * Adding a widget: one line here, one in `manifests.ts` (see README.md).
 */
import type { WidgetModule } from './types';

export const registry = {
  'bow-nb-scorer': () => import('./bow-nb-scorer/Widget'),
  'gaussian-2d-covariance': () => import('./gaussian-2d-covariance/Widget'),
  'gda-fitter': () => import('./gda-fitter/Widget'),
  'linear-bias-probe': () => import('./linear-bias-probe/Widget'),
} satisfies Record<string, () => Promise<WidgetModule>>;

export type WidgetName = keyof typeof registry;

export function isWidgetName(name: string): name is WidgetName {
  return Object.hasOwn(registry, name);
}
