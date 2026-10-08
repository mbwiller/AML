/**
 * Static fallback for `true-vs-empirical-risk`, plus the panel geometry the
 * live widget shares with it: R(θ) and R̂(θ) for the first training set
 * (the trial's own arm), their minimizers θ* and θ̂, and the gap at θ̂, as
 * plain SVG with token colors, rendered at build time by `Widget.astro`.
 */
import {
  formatNumber,
  frameScales,
  polylinePath,
  sampleCurve,
  ticks,
  type Frame,
} from '../_shared/plot-scale';
import { trialArm } from './data';
import type { Params } from './manifest';
import { armTruth, empiricalRisk, sampleStats, trainingSet, trueRisk, type ArmTruth } from './math';

export const RISK_PANEL: Frame = {
  width: 360,
  height: 270,
  margin: { top: 12, right: 12, bottom: 40, left: 46 },
};
export const HISTORY_PANEL: Frame = {
  width: 360,
  height: 150,
  margin: { top: 10, right: 12, bottom: 40, left: 12 },
};
export const RISK_MAX = 250;
export const THETA_HALF_WIDTH = 12;

export function thetaDomain(truth: ArmTruth): [number, number] {
  return [truth.mean - THETA_HALF_WIDTH, truth.mean + THETA_HALF_WIDTH];
}

const f1 = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const truth = armTruth(p.arm);
  const { ys } = trainingSet(p.arm, p.n, p.seed, p.draw, trialArm(p.arm).ys);
  const stats = sampleStats(ys);
  const domain = thetaDomain(truth);
  const { x, y } = frameScales(RISK_PANEL, domain, [0, RISK_MAX]);
  const { width, height, margin } = RISK_PANEL;

  const grid = ticks(0, RISK_MAX, 50)
    .map(
      (v) =>
        `<line x1="${margin.left}" x2="${width - margin.right}" y1="${f1(y(v))}" y2="${f1(y(v))}" stroke="var(--border)" />` +
        `<text x="${margin.left - 6}" y="${f1(y(v) + 4)}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`,
    )
    .join('');
  const xTicks = ticks(domain[0], domain[1], 5)
    .map(
      (v) =>
        `<text x="${f1(x(v))}" y="${height - margin.bottom + 16}" text-anchor="middle" font-size="11" fill="var(--muted)">${formatNumber(v, 0)}</text>`,
    )
    .join('');
  const curve = (f: (t: number) => number) =>
    polylinePath(sampleCurve(f, domain[0], domain[1]), x, y);
  const rTrue = p.showTrueRisk
    ? `<path d="${curve((t) => trueRisk(truth, t))}" fill="none" stroke="var(--viz-1)" stroke-width="2.5" stroke-dasharray="7 4" />` +
      `<line x1="${f1(x(truth.mean))}" x2="${f1(x(truth.mean))}" y1="${f1(y(0))}" y2="${f1(y(truth.variance))}" stroke="var(--viz-1)" stroke-dasharray="2 3" />`
    : '';
  const rTrain = p.showTrainingRisk
    ? `<path d="${curve((t) => empiricalRisk(stats, t))}" fill="none" stroke="var(--viz-6)" stroke-width="2.5" />` +
      `<line x1="${f1(x(stats.mean))}" x2="${f1(x(stats.mean))}" y1="${f1(y(0))}" y2="${f1(y(stats.variance))}" stroke="var(--viz-6)" stroke-dasharray="2 3" />`
    : '';
  const gap =
    p.showTrueRisk && p.showTrainingRisk
      ? `<line x1="${f1(x(stats.mean))}" x2="${f1(x(stats.mean))}" y1="${f1(y(stats.variance))}" y2="${f1(y(trueRisk(truth, stats.mean)))}" stroke="var(--fg)" stroke-width="2.5" />`
      : '';
  const rug = ys
    .filter((v) => v >= domain[0] && v <= domain[1])
    .map(
      (v) =>
        `<line x1="${f1(x(v))}" x2="${f1(x(v))}" y1="${f1(y(0))}" y2="${f1(y(0) - 7)}" stroke="var(--viz-6)" />`,
    )
    .join('');

  const label =
    `True risk and training risk of the constant model on the ${p.arm} arm of VASCO, n = ${p.n}: ` +
    `θ* = ${formatNumber(truth.mean)} mmHg with R(θ*) = ${formatNumber(truth.variance)}; ` +
    `θ̂ = ${formatNumber(stats.mean)} with training risk ${formatNumber(stats.variance)}`;

  return (
    `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font-sans)">` +
    `<rect width="${width}" height="${height}" fill="var(--surface)" />` +
    grid +
    xTicks +
    `<text x="${(margin.left + width - margin.right) / 2}" y="${height - 6}" text-anchor="middle" font-size="12" fill="var(--fg)">θ (mmHg)</text>` +
    rug +
    rTrue +
    rTrain +
    gap +
    `</svg>`
  );
}
