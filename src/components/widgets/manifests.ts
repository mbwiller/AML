/**
 * Every widget manifest, importable at build time WITHOUT React: this file
 * and the manifests it imports pull in only Zod and pure math, so
 * `src/components/mdx/Widget.astro` and `/dev/widgets` can validate props and
 * list params during the static build. Keep `registry.ts` and this map in
 * step; `manifests.test.ts` checks they agree.
 */
import { manifest as bowNbScorer } from './bow-nb-scorer/manifest';
import { manifest as gaussian2dCovariance } from './gaussian-2d-covariance/manifest';
import { manifest as gdaFitter } from './gda-fitter/manifest';
import { manifest as lineFitPlayground } from './line-fit-playground/manifest';
import type { ParamsSchema, WidgetManifest } from './types';

export const manifests: Readonly<Record<string, WidgetManifest>> = {
  [bowNbScorer.name]: bowNbScorer as WidgetManifest<ParamsSchema>,
  [gaussian2dCovariance.name]: gaussian2dCovariance as WidgetManifest<ParamsSchema>,
  [gdaFitter.name]: gdaFitter as WidgetManifest<ParamsSchema>,
  [lineFitPlayground.name]: lineFitPlayground as WidgetManifest<ParamsSchema>,
};

export function getManifest(name: string): WidgetManifest | undefined {
  return Object.hasOwn(manifests, name) ? manifests[name] : undefined;
}

export interface ValidationResult {
  ok: boolean;
  /** Parsed params with defaults applied (when `ok`). */
  params: Record<string, unknown>;
  /** Manifest defaults, i.e. `params.parse({})`. */
  defaults: Record<string, unknown>;
  /** Human-readable problems (when not `ok`). */
  errors: string[];
}

/** Validate the props an MDX `<Widget>` passes (everything but `name` and `challenge`). */
export function validateWidgetParams(
  manifest: WidgetManifest,
  props: Record<string, unknown>,
): ValidationResult {
  const defaults = manifest.params.parse({}) as Record<string, unknown>;
  const result = manifest.params.safeParse(props);
  if (result.success) {
    return { ok: true, params: result.data as Record<string, unknown>, defaults, errors: [] };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.map(String).join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  return { ok: false, params: defaults, defaults, errors };
}
