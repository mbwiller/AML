/**
 * Static fallback for `linear-bias-probe`, plus the panel geometry the live
 * widget shares with it: the dose slice at the probe baseline (patients,
 * arm means, the fitted model, the n → ∞ fit, and the true Emax mean) as
 * plain SVG markup with token colors, rendered at build time by
 * `Widget.astro` for no-JS, print, and the moment before hydration.
 */
import { trueMean } from '@/lib/datasets/vasco';

import {
  formatNumber,
  frameScales,
  polylinePath,
  sampleCurve,
  ticks,
  type Frame,
} from '../_shared/plot-scale';
import { vascoPatients } from './data';
import type { Params } from './manifest';
import { armMeans, fitPopulation, fitSample, predict, type ModelSpec } from './math';

export const DOSE_DOMAIN = [0, 40] as const;
export const BASELINE_DOMAIN = [120, 190] as const;
export const OUTCOME_DOMAIN = [-50, 30] as const;
export const RESIDUAL_DOMAIN = [-25, 25] as const;

export const PANEL: Frame = {
  width: 360,
  height: 250,
  margin: { top: 12, right: 12, bottom: 38, left: 46 },
};
export const RESIDUAL_PANEL: Frame = {
  width: 360,
  height: 190,
  margin: { top: 12, right: 12, bottom: 38, left: 46 },
};

export function modelSpec(p: Params): ModelSpec {
  return { features: p.features, interaction: p.showInteraction };
}

/** Deterministic horizontal jitter (mg) for patient i, so the arms' columns spread out. */
export function jitter(i: number): number {
  return ((((i * 0.6180339887) % 1) + 1) % 1) * 1.6 - 0.8;
}

const f1 = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const patients = vascoPatients();
  const model = modelSpec(p);
  const fit = fitSample(model, patients);
  const pop = fitPopulation(model);
  const b = p.probeBaseline;
  const { x, y } = frameScales(PANEL, DOSE_DOMAIN, OUTCOME_DOMAIN);
  const { width, height, margin } = PANEL;

  const grid = ticks(OUTCOME_DOMAIN[0], OUTCOME_DOMAIN[1], 10)
    .map(
      (v) =>
        `<line x1="${margin.left}" x2="${width - margin.right}" y1="${f1(y(v))}" y2="${f1(y(v))}" stroke="var(--border)" />` +
        `<text x="${margin.left - 6}" y="${f1(y(v) + 4)}" text-anchor="end" font-size="11" fill="var(--muted)">${formatNumber(v, 0)}</text>`,
    )
    .join('');
  const xTicks = ticks(DOSE_DOMAIN[0], DOSE_DOMAIN[1], 10)
    .map(
      (v) =>
        `<text x="${f1(x(v))}" y="${height - margin.bottom + 16}" text-anchor="middle" font-size="11" fill="var(--muted)">${v}</text>`,
    )
    .join('');
  const dots = patients
    .map(
      (pt, i) =>
        `<circle cx="${f1(x(pt.dose + jitter(i)))}" cy="${f1(y(pt.y))}" r="2" fill="var(--muted)" fill-opacity="0.35" />`,
    )
    .join('');
  const means = armMeans(patients)
    .map(
      ({ dose, mean }) =>
        `<rect x="${f1(x(dose) - 4)}" y="${f1(y(mean) - 4)}" width="8" height="8" fill="var(--fg)" />`,
    )
    .join('');
  const curve = (f: (d: number) => number) =>
    polylinePath(sampleCurve(f, DOSE_DOMAIN[0], DOSE_DOMAIN[1], 80), x, y);
  const truth = p.showTruth
    ? `<path d="${curve((d) => trueMean(d, b))}" fill="none" stroke="var(--viz-1)" stroke-width="2.5" stroke-dasharray="7 4" />`
    : '';
  const popPath = p.showPopulationFit
    ? `<path d="${curve((d) => predict(pop, d, b))}" fill="none" stroke="var(--viz-6)" stroke-width="1.5" stroke-dasharray="2 3" />`
    : '';
  const fitPath = `<path d="${curve((d) => predict(fit, d, b))}" fill="none" stroke="var(--viz-6)" stroke-width="2.5" />`;

  const label =
    `ΔSBP against dose for the 300 VASCO patients, with the least-squares fit on ${p.features.join(', ') || 'an intercept'}` +
    (p.showTruth ? ' and the true Emax dose–response' : '') +
    ` at baseline ${b} mmHg`;

  return (
    `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" font-family="var(--font-sans)">` +
    `<rect width="${width}" height="${height}" fill="var(--surface)" />` +
    grid +
    xTicks +
    `<text x="${(margin.left + width - margin.right) / 2}" y="${height - 6}" text-anchor="middle" font-size="12" fill="var(--fg)">dose D (mg)</text>` +
    dots +
    means +
    truth +
    popPath +
    fitPath +
    `</svg>`
  );
}
