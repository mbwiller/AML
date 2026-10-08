/**
 * Static fallback for `sgd-noise`: the level sets of R̂ around θ̂, the sampled
 * minibatch steps −η g_B at the probe point, and the full-gradient step, as
 * plain SVG for no-JS, print, and the moment before hydration. Token colors
 * only.
 */
import { eigenSymmetric2, majorAxisAngle } from '../gaussian-2d-covariance/math';
import type { Params } from './manifest';
import {
  fullGradient,
  hessian,
  leastSquares,
  makeProblem,
  sampleMinibatchGradients,
  WINDOW,
} from './math';

const SIZE = 360;
const f = (v: number) => v.toFixed(1);

export function renderFallback(p: Params): string {
  const prob = makeProblem(p.n, p.seed);
  const hat = leastSquares(prob);
  const px = (v: number) => ((v - hat[0] + WINDOW) / (2 * WINDOW)) * SIZE;
  const py = (v: number) => SIZE - ((v - hat[1] + WINDOW) / (2 * WINDOW)) * SIZE;
  const probe: [number, number] = [hat[0] + p.probe[0], hat[1] + p.probe[1]];
  const b = Math.min(p.batchSize, p.n);
  const gs = sampleMinibatchGradients(
    prob,
    probe,
    b,
    Math.min(p.draws, 60),
    p.drawSeed,
    p.replacement,
  );
  const g = fullGradient(prob, probe);
  const H = hessian(prob);

  // Level sets ½dᵀHd = c through the probe, scaled.
  const d0 = p.probe;
  const c0 = 0.5 * (H.a * d0[0] * d0[0] + 2 * H.b * d0[0] * d0[1] + H.c * d0[1] * d0[1]);
  const eig = eigenSymmetric2(H);
  const [l1, l2] = eig.values;
  const ang = majorAxisAngle(eig);
  const contours = [0.5, 1, 1.5]
    .map((s) => {
      const c = c0 * s * s;
      const r1 = Math.sqrt((2 * c) / l1);
      const r2 = Math.sqrt((2 * c) / l2);
      const pts: string[] = [];
      for (let i = 0; i < 48; i += 1) {
        const t = (2 * Math.PI * i) / 48;
        const x = r1 * Math.cos(t);
        const y = r2 * Math.sin(t);
        pts.push(
          `${f(px(hat[0] + x * Math.cos(ang) - y * Math.sin(ang)))},${f(py(hat[1] + x * Math.sin(ang) + y * Math.cos(ang)))}`,
        );
      }
      return `<polygon points="${pts.join(' ')}" fill="none" stroke="var(--viz-2)" stroke-opacity="0.5" />`;
    })
    .join('');
  const arrows = gs
    .map(
      ([gx, gy]) =>
        `<line x1="${f(px(probe[0]))}" y1="${f(py(probe[1]))}" x2="${f(px(probe[0] - p.eta * gx))}" y2="${f(py(probe[1] - p.eta * gy))}" />`,
    )
    .join('');

  return (
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" role="img" ` +
    `aria-label="${gs.length} minibatch gradient steps of size ${p.eta} with batch size ${b} at one point of a least-squares loss, scattered around the full-gradient step" ` +
    `xmlns="http://www.w3.org/2000/svg" overflow="hidden">` +
    `<rect width="${SIZE}" height="${SIZE}" fill="var(--surface)" />` +
    contours +
    `<g stroke="var(--viz-1)" stroke-opacity="0.5" stroke-width="1.25">${arrows}</g>` +
    `<line x1="${f(px(probe[0]))}" y1="${f(py(probe[1]))}" x2="${f(px(probe[0] - p.eta * g[0]))}" y2="${f(py(probe[1] - p.eta * g[1]))}" stroke="var(--fg)" stroke-width="3" />` +
    `<circle cx="${f(px(hat[0]))}" cy="${f(py(hat[1]))}" r="4" fill="var(--viz-positive)" />` +
    `</svg>`
  );
}
