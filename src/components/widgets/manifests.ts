/**
 * Every widget manifest, importable at build time WITHOUT React: this file
 * and the manifests it imports pull in only Zod and pure math, so
 * `src/components/mdx/Widget.astro` and `/dev/widgets` can validate props and
 * list params during the static build. Keep `registry.ts` and this map in
 * step; `manifests.test.ts` checks they agree.
 */
import { manifest as bowNbScorer } from './bow-nb-scorer/manifest';
import { manifest as bowVectorizer } from './bow-vectorizer/manifest';
import { manifest as dgpSampler } from './dgp-sampler/manifest';
import { manifest as encodingExplorer } from './encoding-explorer/manifest';
import { manifest as gaussian2dCovariance } from './gaussian-2d-covariance/manifest';
import { manifest as gdaFitter } from './gda-fitter/manifest';
import { manifest as generativeVsDiscriminativeToggle } from './generative-vs-discriminative-toggle/manifest';
import { manifest as hessianClassifier } from './hessian-classifier/manifest';
import { manifest as innerProductDial } from './inner-product-dial/manifest';
import { manifest as lineFitPlayground } from './line-fit-playground/manifest';
import { manifest as linearBiasProbe } from './linear-bias-probe/manifest';
import { manifest as mseBowlGd } from './mse-bowl-gd/manifest';
import { manifest as trueVsEmpiricalRisk } from './true-vs-empirical-risk/manifest';
import type { ParamsSchema, WidgetManifest } from './types';

export const manifests: Readonly<Record<string, WidgetManifest>> = {
  [bowNbScorer.name]: bowNbScorer as WidgetManifest<ParamsSchema>,
  [bowVectorizer.name]: bowVectorizer as WidgetManifest<ParamsSchema>,
  [dgpSampler.name]: dgpSampler as WidgetManifest<ParamsSchema>,
  [encodingExplorer.name]: encodingExplorer as WidgetManifest<ParamsSchema>,
  [gaussian2dCovariance.name]: gaussian2dCovariance as WidgetManifest<ParamsSchema>,
  [gdaFitter.name]: gdaFitter as WidgetManifest<ParamsSchema>,
  [generativeVsDiscriminativeToggle.name]:
    generativeVsDiscriminativeToggle as WidgetManifest<ParamsSchema>,
  [hessianClassifier.name]: hessianClassifier as WidgetManifest<ParamsSchema>,
  [innerProductDial.name]: innerProductDial as WidgetManifest<ParamsSchema>,
  [lineFitPlayground.name]: lineFitPlayground as WidgetManifest<ParamsSchema>,
  [linearBiasProbe.name]: linearBiasProbe as WidgetManifest<ParamsSchema>,
  [mseBowlGd.name]: mseBowlGd as WidgetManifest<ParamsSchema>,
  [trueVsEmpiricalRisk.name]: trueVsEmpiricalRisk as WidgetManifest<ParamsSchema>,
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
