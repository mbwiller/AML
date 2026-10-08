/**
 * Pixel geometry for `mse-bowl-gd`, shared by the live widget and its static
 * fallback: the equal-aspect window around the start, the minimum, and the
 * path (so an ellipse looks like the ellipse it is, and standardizing
 * visibly rounds the bowl), the contour polylines, and the thinned path.
 */
import { eigenSymmetric2 } from '../gaussian-2d-covariance/math';
import {
  linearScale,
  niceStep,
  thinPolyline,
  ticks,
  type Scale,
} from '../line-fit-playground/plot';
import {
  contourLevels,
  excessRisk,
  halfHessian,
  levelSet,
  type GdRun,
  type Sym2,
  type Vec2,
} from './math';

export const BOWL_MARGIN = { top: 10, right: 12, bottom: 36, left: 46 } as const;

export interface BowlFrame {
  width: number;
  height: number;
  sx: Scale;
  sy: Scale;
  inner: { x0: number; x1: number; y0: number; y1: number };
  xTicks: number[];
  yTicks: number[];
  xStep: number;
  yStep: number;
}

/**
 * The data window: the bounding box of `points` padded by 12% (at least
 * `minSpan` wide), then widened in one direction so one unit is the same
 * number of pixels on both axes.
 */
export function bowlFrame(
  points: readonly Vec2[],
  width: number,
  height: number,
  minSpan = 0.2,
): BowlFrame {
  const inner = {
    x0: BOWL_MARGIN.left,
    x1: Math.max(BOWL_MARGIN.left + 10, width - BOWL_MARGIN.right),
    y0: BOWL_MARGIN.top,
    y1: Math.max(BOWL_MARGIN.top + 10, height - BOWL_MARGIN.bottom),
  };
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    xMin = Math.min(xMin, x);
    xMax = Math.max(xMax, x);
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  if (!Number.isFinite(xMin)) [xMin, xMax, yMin, yMax] = [-1, 1, -1, 1];
  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;
  let spanX = Math.max(minSpan, (xMax - xMin) * 1.24);
  let spanY = Math.max(minSpan, (yMax - yMin) * 1.24);
  const wPx = inner.x1 - inner.x0;
  const hPx = inner.y1 - inner.y0;
  const unitsPerPx = Math.max(spanX / wPx, spanY / hPx);
  spanX = unitsPerPx * wPx;
  spanY = unitsPerPx * hPx;
  const xDomain: [number, number] = [cx - spanX / 2, cx + spanX / 2];
  const yDomain: [number, number] = [cy - spanY / 2, cy + spanY / 2];
  const xCount = Math.max(2, Math.round(wPx / 90));
  const yCount = Math.max(2, Math.round(hPx / 60));
  return {
    width,
    height,
    sx: linearScale(xDomain, [inner.x0, inner.x1]),
    sy: linearScale(yDomain, [inner.y1, inner.y0]),
    inner,
    xTicks: ticks(xDomain[0], xDomain[1], xCount),
    yTicks: ticks(yDomain[0], yDomain[1], yCount),
    xStep: niceStep(xDomain[0], xDomain[1], xCount),
    yStep: niceStep(yDomain[0], yDomain[1], yCount),
  };
}

/**
 * The points the window must show: start, minimum, and the path up to
 * iterate `upTo` (a diverging path only while it stays within 4× the
 * start–minimum box, so the bowl stays readable).
 */
export function windowPoints(run: GdRun, start: Vec2, star: Vec2): Vec2[] {
  const pts: Vec2[] = [start, star];
  const span = Math.max(Math.abs(start[0] - star[0]), Math.abs(start[1] - star[1]), 0.1);
  const limit = 4 * span;
  for (let t = 0; t <= run.iterations; t += 1) {
    const p: Vec2 = [run.path[2 * t] as number, run.path[2 * t + 1] as number];
    if (Math.abs(p[0] - star[0]) > limit || Math.abs(p[1] - star[1]) > limit) {
      if (run.status === 'diverged') break;
      continue;
    }
    pts.push(p);
  }
  return pts;
}

/**
 * Contours of R̂ as pixel polylines: excess-risk levels c = R̂ − R̂(θ̂) spaced
 * by a factor 0.4 below the largest excess at a corner of the window.
 */
export function contourPolylines(f: BowlFrame, h: Sym2, star: Vec2, count = 14): Vec2[][] {
  const a = halfHessian(h);
  const e = eigenSymmetric2(a);
  const [x0, x1] = f.sx.domain;
  const [y0, y1] = f.sy.domain;
  const top = Math.max(
    excessRisk(a, star, [x0, y0]),
    excessRisk(a, star, [x0, y1]),
    excessRisk(a, star, [x1, y0]),
    excessRisk(a, star, [x1, y1]),
  );
  return contourLevels(top, count, 0.4).map((c) =>
    levelSet(star, a, c, 120, e).map(([x, y]): Vec2 => [f.sx(x), f.sy(y)]),
  );
}

/** The path θ⁽⁰⁾ … θ⁽ᵘᵖᵀᵒ⁾ in pixels, thinned to ≥ 1 px steps. */
export function pathPixels(f: BowlFrame, run: GdRun, upTo: number): [number, number][] {
  const n = Math.max(0, Math.min(run.iterations, Math.trunc(upTo)));
  const pts: [number, number][] = [];
  for (let t = 0; t <= n; t += 1) {
    pts.push([f.sx(run.path[2 * t] as number), f.sy(run.path[2 * t + 1] as number)]);
  }
  return thinPolyline(pts, 1);
}

/** Iterates far enough apart (≥ 7 px) to draw as dots: the visible steps. */
export function stepDots(f: BowlFrame, run: GdRun, upTo: number): [number, number][] {
  const n = Math.max(0, Math.min(run.iterations, Math.trunc(upTo)));
  const pts: [number, number][] = [];
  for (let t = 0; t <= n; t += 1) {
    pts.push([f.sx(run.path[2 * t] as number), f.sy(run.path[2 * t + 1] as number)]);
  }
  return thinPolyline(pts, 7).slice(1, -1);
}
