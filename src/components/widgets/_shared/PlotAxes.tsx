/**
 * Axes for the widgets that draw their own SVG charts: grid lines, tick
 * labels, and axis titles, in the frame and scales of `plot-scale.ts`.
 * Decorative for assistive technology (each panel's `aria-label` describes
 * the chart). Colors are passed in from `useVizTheme()`.
 */
import { formatNumber, ticks, type Frame, type Scale } from './plot-scale';

export interface PlotAxesProps {
  frame: Frame;
  x: Scale;
  y: Scale;
  xStep: number;
  /** 0 draws no horizontal grid and no y labels. */
  yStep: number;
  xTitle: string;
  yTitle?: string;
  /** Vertical grid lines at the x ticks. */
  xGrid?: boolean;
  /** Format of the x tick labels; defaults to a rounded number with a true minus. */
  formatX?: (v: number) => string;
  color: { grid: string; text: string; muted: string };
}

export function PlotAxes({
  frame,
  x,
  y,
  xStep,
  yStep,
  xTitle,
  yTitle,
  xGrid = false,
  formatX = (v) => formatNumber(v, 0),
  color,
}: PlotAxesProps) {
  const { width, height, margin } = frame;
  const [x0, x1] = x.domain;
  const [y0, y1] = y.domain;
  const top = margin.top;
  const bottom = height - margin.bottom;
  return (
    <g aria-hidden="true" fontSize={12}>
      {yStep > 0
        ? ticks(y0, y1, yStep).map((v) => (
            <g key={`y${v}`}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y(v)}
                y2={y(v)}
                stroke={color.grid}
                strokeWidth={v === 0 ? 1.25 : 0.75}
              />
              <text x={margin.left - 6} y={y(v) + 4} textAnchor="end" fill={color.muted}>
                {formatNumber(v, 0)}
              </text>
            </g>
          ))
        : null}
      {ticks(x0, x1, xStep).map((v) => (
        <g key={`x${v}`}>
          {xGrid ? (
            <line x1={x(v)} x2={x(v)} y1={top} y2={bottom} stroke={color.grid} strokeWidth={0.75} />
          ) : null}
          <text x={x(v)} y={bottom + 16} textAnchor="middle" fill={color.muted}>
            {formatX(v)}
          </text>
        </g>
      ))}
      <text
        x={(margin.left + width - margin.right) / 2}
        y={height - 6}
        textAnchor="middle"
        fontSize={13}
        fill={color.text}
      >
        {xTitle}
      </text>
      {yTitle ? (
        <text
          transform={`translate(12 ${(top + bottom) / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={13}
          fill={color.text}
        >
          {yTitle}
        </text>
      ) : null}
    </g>
  );
}
