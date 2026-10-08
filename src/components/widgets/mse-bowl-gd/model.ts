/**
 * Everything `mse-bowl-gd` shows for one set of params, computed once: the
 * data in the coordinates being optimized, the Hessian and κ, the
 * least-squares minimum, the gradient-descent run, and the same run in the
 * other coordinates (raw ↔ standardized) for the comparison line. Pure;
 * shared by the widget and the static fallback.
 */
import { eigenSymmetric2 } from '../gaussian-2d-covariance/math';
import { lecture4Points, type XY } from '../line-fit-playground/data';
import type { Params } from './manifest';
import {
  conditionNumber,
  gradientDescent,
  hessian,
  leastSquares,
  risk,
  standardize,
  type GdRun,
  type Standardization,
  type Sym2,
  type Vec2,
} from './math';

export interface BowlModel {
  /** The Lecture 4 data (scaled bmi, progression / 300). */
  raw: XY;
  standardization: Standardization;
  /** The data GD runs on (raw or z-scored feature). */
  data: XY;
  h: Sym2;
  kappa: number;
  /** Largest eigenvalue of H; η < 2/λ_max is the stability condition (lesson 2.5). */
  lambdaMax: number;
  star: Vec2;
  starRisk: number;
  run: GdRun;
  /** The same η, start, and rule in the other coordinates. */
  other: { run: GdRun; kappa: number };
}

export function bowlModel(p: Params): BowlModel {
  const raw = lecture4Points(p.dataset);
  const standardization = standardize(raw);
  const data = p.standardize ? standardization.data : raw;
  const otherData = p.standardize ? raw : standardization.data;
  const h = hessian(data);
  const star = leastSquares(data);
  const options = {
    init: p.init,
    eta: p.eta,
    stopping: p.stopping,
    tolerance: p.tolerance,
    maxIterations: p.maxIterations,
  };
  return {
    raw,
    standardization,
    data,
    h,
    kappa: conditionNumber(h),
    lambdaMax: eigenSymmetric2(h).values[0],
    star,
    starRisk: risk(data, star),
    run: gradientDescent(data, options),
    other: {
      run: gradientDescent(otherData, options),
      kappa: conditionNumber(hessian(otherData)),
    },
  };
}
