/**
 * Pixel geometry for `line-fit-playground`, shared by the live widget and
 * its static fallback so the two pictures agree: the fixed data window, the
 * scales, the ticks, the clipped line, and the residual segments and squares.
 */
import type { XY } from './data';
import { predict, type Line } from './math';
import { linearScale, niceStep, ticks, type Scale } from './plot';

/** Data window: the 20 patients have x in [22.78, 27.66] and y in [48, 310]. */
export const VIEW = { x: [22.5, 28] as const, y: [0, 350] as const };

export const MARGIN = { top: 10, right: 12, bottom: 40, left: 46 } as const;

export interface Frame {
  width: number;
  height: number;
  sx: Scale;
  sy: Scale;
  /** Inner plotting rectangle in pixels. */
  inner: { x0: number; x1: number; y0: number; y1: number };
  xTicks: number[];
  yTicks: number[];
  xStep: number;
  yStep: number;
}

export function frame(width: number, height: number): Frame {
  const inner = {
    x0: MARGIN.left,
    x1: Math.max(MARGIN.left + 10, width - MARGIN.right),
    y0: MARGIN.top,
    y1: Math.max(MARGIN.top + 10, height - MARGIN.bottom),
  };
  const sx = linearScale(VIEW.x, [inner.x0, inner.x1]);
  const sy = linearScale(VIEW.y, [inner.y1, inner.y0]);
  const xCount = width < 420 ? 3 : 6;
  return {
    width,
    height,
    sx,
    sy,
    inner,
    xTicks: ticks(VIEW.x[0], VIEW.x[1], xCount),
    yTicks: ticks(VIEW.y[0], VIEW.y[1], 6),
    xStep: niceStep(VIEW.x[0], VIEW.x[1], xCount),
    yStep: niceStep(VIEW.y[0], VIEW.y[1], 6),
  };
}

/** The line across the window (clipping to the inner rectangle is done in SVG). */
export function lineSegment(f: Frame, line: Line): [[number, number], [number, number]] {
  const [a, b] = VIEW.x;
  return [
    [f.sx(a), f.sy(predict(line, a))],
    [f.sx(b), f.sy(predict(line, b))],
  ];
}

export interface ResidualGlyph {
  /** Point, in pixels. */
  px: number;
  py: number;
  /** Prediction on the line, in pixels. */
  pyHat: number;
  /** y − ŷ in data units. */
  r: number;
  /**
   * The square on the residual segment: side |py − pyHat| pixels, on the
   * side of the segment with more room, so its area is proportional to r²
   * (the y scale is fixed).
   */
  square: { x: number; y: number; size: number };
}

export function residualGlyphs(f: Frame, data: XY, line: Line): ResidualGlyph[] {
  const mid = (f.inner.x0 + f.inner.x1) / 2;
  return data.x.map((xi, i) => {
    const yi = data.y[i] as number;
    const yHat = predict(line, xi);
    const px = f.sx(xi);
    const py = f.sy(yi);
    const pyHat = f.sy(yHat);
    const size = Math.abs(py - pyHat);
    const left = px > mid ? px - size : px;
    return { px, py, pyHat, r: yi - yHat, square: { x: left, y: Math.min(py, pyHat), size } };
  });
}
