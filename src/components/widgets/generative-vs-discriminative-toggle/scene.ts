/**
 * What `generative-vs-discriminative-toggle` draws, computed from its params:
 * the ADVERSE subsample, the two fits, and the boundary geometry. Shared by
 * the live widget (memoized piece by piece so the prior slider refits only
 * the Bayes boundary) and the static fallback. Pure; no colors.
 */
import { adverseProjection } from '../gda-fitter/data';
import { clipLineToBox, fitGda, fitLogistic, zeroContour } from '../gda-fitter/math';
import type { Params } from './manifest';
import {
  bayesLine,
  bayesScore,
  positiveRegion,
  type Box,
  type GdaFit,
  type LabeledPoint,
  type LineParams,
  type Vec2,
} from './math';

/** Plot half-width in standardized units (the same window as gda-fitter's ADVERSE view). */
export const DOMAIN = 4;
export const BOX: Box = { x: [-DOMAIN, DOMAIN], y: [-DOMAIN, DOMAIN] };
const CONTOUR_CELLS = 56;

export function samplePoints(p: Pick<Params, 'features' | 'n' | 'seed'>): LabeledPoint[] {
  return adverseProjection(p.features, p.n, p.seed);
}

export function fitGenerative(points: readonly LabeledPoint[], shared: boolean): GdaFit {
  return fitGda(points, shared);
}

export function fitDiscriminative(points: readonly LabeledPoint[]): LineParams {
  const { theta, theta0 } = fitLogistic(points);
  return { theta, theta0 };
}

export interface Boundary {
  /** The line when the boundary is linear (shared Σ, or logistic regression). */
  line: LineParams | null;
  /** Polylines inside the box (empty when the boundary misses the window). */
  polylines: Vec2[][];
  /** The "predict y = 1" part of the box (linear boundaries only). */
  region: Vec2[];
}

/** The generative model's Bayes boundary under prior π. */
export function bayesBoundary(fit: GdaFit, prior: number): Boundary {
  if (fit.degenerate) return { line: null, polylines: [], region: [] };
  if (fit.shared) {
    const line = bayesLine(fit, prior);
    const seg = clipLineToBox(line, BOX);
    return { line, polylines: seg ? [seg] : [], region: positiveRegion(line, BOX) };
  }
  return {
    line: null,
    polylines: zeroContour((x, y) => bayesScore(fit, prior, [x, y]), BOX, CONTOUR_CELLS),
    region: [],
  };
}

export function logisticBoundary(line: LineParams): Boundary {
  const seg = clipLineToBox(line, BOX);
  return { line, polylines: seg ? [seg] : [], region: positiveRegion(line, BOX) };
}
