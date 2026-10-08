/**
 * A small responsive line/stem chart for the lesson 2.5 widgets (error by
 * step, step size by step, cumulative sums). React draws plain SVG; the
 * scales come from `scale.ts`. The width follows the container (a
 * ResizeObserver), the height is fixed so the widget's reserved height holds.
 *
 * Colors arrive from the caller, who reads them from `useVizTheme()`; axis
 * ink is read from `useVizTheme()` here. The chart is one `role="img"` with
 * an accessible name; the numbers it shows are also in the widget's readouts.
 */
import { useEffect, useId, useRef, useState } from 'react';

import { useVizTheme } from '../useVizTheme';
import { formatTick, linearScale, linearTicks, logScale, logTicks, type Domain } from './scale';

export type Point = readonly [number, number];

export interface ChartSeries {
  id: string;
  points: readonly Point[];
  color: string;
  width?: number | undefined;
  dash?: string | undefined;
  opacity?: number | undefined;
  /** Draw a dot at every point (square dots if `marker` is 'square'). */
  dots?: boolean | undefined;
  marker?: 'circle' | 'square' | undefined;
  /** Draw vertical stems from y = 0 (linear charts only). */
  stems?: boolean | undefined;
  /** No connecting line (dots or stems only). */
  noLine?: boolean | undefined;
}

export interface ChartRule {
  /** Horizontal rule at this y (or vertical at x). */
  y?: number;
  x?: number;
  color: string;
  dash?: string | undefined;
  label?: string;
}

export interface ChartBand {
  y0: number;
  y1: number;
  color: string;
  opacity?: number | undefined;
}

export interface MiniChartProps {
  /** Accessible name of the chart. */
  label: string;
  height: number;
  x: Domain;
  y: Domain;
  yLog?: boolean;
  series: readonly ChartSeries[];
  rules?: readonly ChartRule[];
  bands?: readonly ChartBand[];
  xLabel?: string;
  yLabel?: string;
  testId?: string;
}

const MARGIN = { top: 8, right: 10, bottom: 26, left: 40 };

/** Width of an element in CSS px, kept current with a ResizeObserver. */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** SVG path through the points, broken wherever a coordinate is not finite. */
function linePath(points: readonly Point[], sx: (v: number) => number, sy: (v: number) => number) {
  let d = '';
  let pen = false;
  for (const [x, y] of points) {
    const px = sx(x);
    const py = sy(y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
    pen = true;
  }
  return d;
}

export function MiniChart({
  label,
  height,
  x,
  y,
  yLog = false,
  series,
  rules = [],
  bands = [],
  xLabel,
  yLabel,
  testId,
}: MiniChartProps) {
  const theme = useVizTheme();
  const clipId = useId().replace(/:/g, '');
  const [ref, width] = useElementWidth<HTMLDivElement>(320);

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 10);
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 10);
  const sx = linearScale(x, [MARGIN.left, MARGIN.left + innerW]);
  const syRaw = yLog
    ? logScale(y, [MARGIN.top + innerH, MARGIN.top])
    : linearScale(y, [MARGIN.top + innerH, MARGIN.top]);
  // Keep runaway values (divergent iterates) at a drawable distance; the clip hides them.
  const sy = (v: number) => {
    const p = syRaw(v);
    return Number.isFinite(p) ? Math.min(Math.max(p, -2 * height), 3 * height) : p;
  };

  const xTicks = linearTicks(x[0], x[1], Math.max(2, Math.floor(innerW / 70)));
  const yTicks = yLog ? logTicks(y[0], y[1], 4) : linearTicks(y[0], y[1], 3);

  return (
    <div ref={ref} className="pk-chart" data-testid={testId}>
      <svg width={width} height={height} role="img" aria-label={label}>
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left} y={MARGIN.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={innerW}
          height={innerH}
          fill={theme.surface}
          stroke={theme.border}
        />
        <g clipPath={`url(#${clipId})`}>
          {bands.map((b, i) => {
            const y0 = sy(b.y0);
            const y1 = sy(b.y1);
            return (
              <rect
                key={i}
                x={MARGIN.left}
                width={innerW}
                y={Math.min(y0, y1)}
                height={Math.abs(y1 - y0)}
                fill={b.color}
                fillOpacity={b.opacity ?? 0.12}
              />
            );
          })}
          {yTicks.map((t) => (
            <line
              key={`gy${t}`}
              x1={MARGIN.left}
              x2={MARGIN.left + innerW}
              y1={sy(t)}
              y2={sy(t)}
              stroke={theme.border}
              strokeWidth={1}
            />
          ))}
          {!yLog && y[0] < 0 && y[1] > 0 ? (
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + innerW}
              y1={sy(0)}
              y2={sy(0)}
              stroke={theme.muted}
              strokeWidth={1}
            />
          ) : null}
          {rules.map((r, i) =>
            r.y !== undefined ? (
              <line
                key={`r${i}`}
                x1={MARGIN.left}
                x2={MARGIN.left + innerW}
                y1={sy(r.y)}
                y2={sy(r.y)}
                stroke={r.color}
                strokeWidth={1.5}
                strokeDasharray={r.dash}
              />
            ) : r.x !== undefined ? (
              <line
                key={`r${i}`}
                x1={sx(r.x)}
                x2={sx(r.x)}
                y1={MARGIN.top}
                y2={MARGIN.top + innerH}
                stroke={r.color}
                strokeWidth={1.5}
                strokeDasharray={r.dash}
              />
            ) : null,
          )}
          {series.map((s) => (
            <g
              key={s.id}
              data-series={s.id}
              opacity={s.opacity ?? 1}
              stroke={s.color}
              fill={s.color}
            >
              {s.stems
                ? s.points.map(([px, py], i) => (
                    <line
                      key={i}
                      x1={sx(px)}
                      x2={sx(px)}
                      y1={sy(0)}
                      y2={sy(py)}
                      strokeWidth={s.width ?? 2}
                    />
                  ))
                : null}
              {s.noLine ? null : (
                <path
                  d={linePath(s.points, sx, sy)}
                  fill="none"
                  strokeWidth={s.width ?? 2}
                  strokeDasharray={s.dash}
                  strokeLinejoin="round"
                />
              )}
              {s.dots
                ? s.points.map(([px, py], i) => {
                    const cx = sx(px);
                    const cy = sy(py);
                    if (!Number.isFinite(cy)) return null;
                    return s.marker === 'square' ? (
                      <rect key={i} x={cx - 3} y={cy - 3} width={6} height={6} stroke="none" />
                    ) : (
                      <circle key={i} cx={cx} cy={cy} r={3} stroke="none" />
                    );
                  })
                : null}
            </g>
          ))}
        </g>
        {rules.map((r, i) =>
          r.label && r.y !== undefined ? (
            <text
              key={`rl${i}`}
              x={MARGIN.left + 6}
              y={sy(r.y) - 5}
              textAnchor="start"
              fill={r.color}
              className="pk-chart-rule-label"
            >
              {r.label}
            </text>
          ) : null,
        )}
        <g fill={theme.muted} className="pk-chart-ticks">
          {yTicks.map((t) => (
            <text key={`ty${t}`} x={MARGIN.left - 6} y={sy(t) + 4} textAnchor="end">
              {formatTick(t, yLog)}
            </text>
          ))}
          {xTicks.map((t) => (
            <text key={`tx${t}`} x={sx(t)} y={MARGIN.top + innerH + 14} textAnchor="middle">
              {formatTick(t)}
            </text>
          ))}
          {xLabel ? (
            <text x={MARGIN.left + innerW} y={height - 1} textAnchor="end">
              {xLabel}
            </text>
          ) : null}
          {yLabel ? (
            <text x={MARGIN.left + 4} y={MARGIN.top + 12} textAnchor="start">
              {yLabel}
            </text>
          ) : null}
        </g>
      </svg>
    </div>
  );
}
