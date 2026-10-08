/**
 * Pure math for `true-vs-empirical-risk` (lesson 2.2): the constant model
 * f_θ(x) = θ with squared loss on one VASCO arm.
 *
 * - True risk, in closed form from the generative model: within an arm
 *   Y = f*(D, B) + ε with B ~ N(155, 12²) and ε ~ N(0, 8²), so Y has mean μ
 *   and variance σ² = 0.15²·12² + 8², and R(θ) = E[(Y − θ)²] = (θ − μ)² + σ²
 *   (lesson 2.2, der-2-2-5). Minimizer θ* = μ, minimum σ².
 * - Empirical risk on a training set y⁽¹⁾…y⁽ⁿ⁾:
 *   R̂(θ) = (1/n) Σ (y⁽ⁱ⁾ − θ)² = (θ − ȳ)² + s², s² = (1/n) Σ (y⁽ⁱ⁾ − ȳ)².
 *   Minimizer θ̂ = ȳ, minimum s².
 * - Expectations over training sets (der-2-2-5, eq. 2.2.6): for a θ fixed
 *   before seeing the data, E[R̂(θ)] = R(θ); for the fitted θ̂,
 *   E[R̂(θ̂)] = (n − 1)σ²/n and E[R(θ̂)] = (n + 1)σ²/n, a gap of 2σ²/n.
 *
 * Training sets: draw 0 with n ≤ 50 is the generated trial's own arm (the
 * first n of its 50 patients in id order); every other draw is a fresh,
 * seeded sample of n patients from the generative model.
 *
 * No React, no DOM; every function is unit-tested in `math.test.ts`.
 */
import { createRng } from '@/lib/datasets/random';
import { ARM_DOSES, armMoments, spec, trueMean, type VascoArm } from '@/lib/datasets/vasco';

export const THETA_MODES = ['true-mean', 'fixed', 'fitted'] as const;
export type ThetaMode = (typeof THETA_MODES)[number];

export interface ArmTruth {
  /** μ = E[Y] in the arm = θ*. */
  mean: number;
  /** σ² = Var(Y) in the arm = R(θ*). */
  variance: number;
}

export function armTruth(arm: VascoArm): ArmTruth {
  return armMoments(arm);
}

/** R(θ) = (θ − μ)² + σ². */
export function trueRisk(truth: ArmTruth, theta: number): number {
  return (theta - truth.mean) ** 2 + truth.variance;
}

export interface SampleStats {
  n: number;
  /** ȳ = θ̂. */
  mean: number;
  /** s² = (1/n) Σ (y − ȳ)² = R̂(θ̂). */
  variance: number;
}

export function sampleStats(ys: readonly number[]): SampleStats {
  const n = ys.length;
  if (n === 0) return { n: 0, mean: 0, variance: 0 };
  const mean = ys.reduce((a, b) => a + b, 0) / n;
  const variance = ys.reduce((a, y) => a + (y - mean) ** 2, 0) / n;
  return { n, mean, variance };
}

/** R̂(θ) = (θ − ȳ)² + s², equal to (1/n) Σ (y⁽ⁱ⁾ − θ)². */
export function empiricalRisk(stats: SampleStats, theta: number): number {
  return (theta - stats.mean) ** 2 + stats.variance;
}

/** n fresh patients of an arm from the generative model (unrounded). */
export function drawFromModel(arm: VascoArm, n: number, seed: number, draw: number): number[] {
  const rng = createRng(seed).fork(`${arm}/${n}/${draw}`);
  const dose = ARM_DOSES[arm];
  const ys = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const baseline = rng.normal(spec.baseline.mean, spec.baseline.sd);
    ys[i] = trueMean(dose, baseline) + rng.normal(0, spec.outcome.noiseSd);
  }
  return ys;
}

/**
 * The training set for a draw: the trial's own arm (first n patients) for
 * draw 0 when it has enough patients, else a fresh seeded sample.
 */
export function trainingSet(
  arm: VascoArm,
  n: number,
  seed: number,
  draw: number,
  trialArm: readonly number[],
): { ys: number[]; fromTrial: boolean } {
  if (draw === 0 && n <= trialArm.length) return { ys: trialArm.slice(0, n), fromTrial: true };
  return { ys: drawFromModel(arm, n, seed, draw), fromTrial: false };
}

/** The θ that is scored: θ*, θ* + offset, or the fitted θ̂ = ȳ. */
export function scoredTheta(
  mode: ThetaMode,
  truth: ArmTruth,
  stats: SampleStats,
  offset: number,
): number {
  if (mode === 'fitted') return stats.mean;
  if (mode === 'fixed') return truth.mean + offset;
  return truth.mean;
}

export interface DrawRecord {
  draw: number;
  theta: number;
  /** R̂(θ) on this draw's training set. */
  train: number;
  /** R(θ). */
  true: number;
}

export function scoreDraw(
  draw: number,
  ys: readonly number[],
  truth: ArmTruth,
  mode: ThetaMode,
  offset: number,
): DrawRecord {
  const stats = sampleStats(ys);
  const theta = scoredTheta(mode, truth, stats, offset);
  return { draw, theta, train: empiricalRisk(stats, theta), true: trueRisk(truth, theta) };
}

/** E[R̂(θ) − R(θ)] over training sets: 0 for a θ fixed in advance, −2σ²/n for θ̂ = ȳ. */
export function expectedGap(mode: ThetaMode, truth: ArmTruth, n: number): number {
  return mode === 'fitted' ? (-2 * truth.variance) / n : 0;
}

/** E[R̂(θ)] over training sets: R(θ) for a fixed θ, (n − 1)σ²/n for θ̂. */
export function expectedTrainingRisk(
  mode: ThetaMode,
  truth: ArmTruth,
  n: number,
  offset: number,
): number {
  if (mode === 'fitted') return ((n - 1) * truth.variance) / n;
  return trueRisk(truth, truth.mean + (mode === 'fixed' ? offset : 0));
}

/** E[R(θ)] over training sets: R(θ) for a fixed θ, (n + 1)σ²/n for θ̂. */
export function expectedTrueRisk(
  mode: ThetaMode,
  truth: ArmTruth,
  n: number,
  offset: number,
): number {
  if (mode === 'fitted') return ((n + 1) * truth.variance) / n;
  return trueRisk(truth, truth.mean + (mode === 'fixed' ? offset : 0));
}

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
