/**
 * `line-fit-playground` (lesson 1.3; rebuilds L2 pp.20–21 and L3 pp.4–9 on
 * the Lecture 2 companion's 20 patients): sliders for the intercept θ₀ and
 * slope θ₁ of f_θ(x) = θ₀ + θ₁x, the residuals drawn as segments or as
 * squares (area ∝ r²), live MAE, MSE, RMSE, and R² against the least-squares
 * values, and "Snap to OLS" (plus the least-absolute-deviations fit when the
 * loss is MAE).
 *
 * Plain SVG at the measured width (`geometry.ts` is shared with the static
 * fallback); the math is in `math.ts`; colors come only from `useVizTheme()`.
 * See README.md.
 */
import { useCallback, useEffect, useId, useMemo } from 'react';
import { z } from 'zod';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { useVizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { lecture2Points, patientIds } from './data';
import { frame, lineSegment, residualGlyphs } from './geometry';
import { THETA0_RANGE, THETA1_RANGE, type Params } from './manifest';
import { fitLad, fitOls, metrics, type Line, type Metrics } from './math';
import { fixed, formatTick } from './plot';
import { useElementWidth } from './useElementWidth';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 300;

/** What a `<Step figureState>` may send; unknown keys are ignored. */
const figureStateSchema = z.looseObject({
  theta0: z.number().optional(),
  theta1: z.number().optional(),
  showResiduals: z.boolean().optional(),
  showSquares: z.boolean().optional(),
  loss: z.enum(['mse', 'mae']).optional(),
  snap: z.enum(['ols', 'lad']).optional(),
});

const clampTo = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, v));

function MetricRows({ mine, best, loss }: { mine: Metrics; best: Metrics; loss: Params['loss'] }) {
  const rows: [string, keyof Metrics, number, string][] = [
    ['MAE', 'mae', 1, 'mean absolute error'],
    ['MSE', 'mse', 1, 'mean squared error'],
    ['RMSE', 'rmse', 1, 'root mean squared error'],
    ['R²', 'r2', 3, 'coefficient of determination'],
  ];
  return (
    <tbody>
      {rows.map(([label, key, decimals, title]) => (
        <tr key={key} data-metric={key} className={key === loss ? 'lfp-row-active' : undefined}>
          <th scope="row">
            <abbr title={title}>{label}</abbr>
          </th>
          <td data-testid={`lfp-${key}`}>{fixed(mine[key], decimals)}</td>
          <td>{fixed(best[key], decimals)}</td>
        </tr>
      ))}
    </tbody>
  );
}

export default function LineFitPlayground({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const clipId = useId();
  const [plotRef, width] = useElementWidth<HTMLDivElement>(560);

  const data = useMemo(() => lecture2Points(params.dataset), [params.dataset]);
  const ids = useMemo(() => patientIds(params.dataset), [params.dataset]);
  const ols = useMemo(() => fitOls(data.x, data.y), [data]);
  const lad = useMemo(() => fitLad(data.x, data.y), [data]);
  const line: Line = { theta0: params.theta0, theta1: params.theta1 };
  const mine = metrics(data.x, data.y, line);
  const best = useMemo(() => metrics(data.x, data.y, ols), [data, ols]);
  const ladMetrics = useMemo(() => metrics(data.x, data.y, lad), [data, lad]);

  const fr = frame(width, PLOT_HEIGHT);
  const glyphs = residualGlyphs(fr, data, line);
  const [a, b] = lineSegment(fr, line);
  const { inner } = fr;

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );
  const snap = useCallback(
    (to: Line) =>
      setParams({
        theta0: clampTo(to.theta0, THETA0_RANGE),
        theta1: clampTo(to.theta1, THETA1_RANGE),
      }),
    [setParams],
  );

  // A `<Step figureState>` reveal: apply what it names.
  useEffect(() => {
    const parsed = figureStateSchema.safeParse(figureState);
    if (!parsed.success) return;
    const { snap: snapTo, ...rest } = parsed.data;
    const patch: Partial<Params> = {};
    if (rest.theta0 !== undefined) patch.theta0 = clampTo(rest.theta0, THETA0_RANGE);
    if (rest.theta1 !== undefined) patch.theta1 = clampTo(rest.theta1, THETA1_RANGE);
    if (rest.showResiduals !== undefined) patch.showResiduals = rest.showResiduals;
    if (rest.showSquares !== undefined) patch.showSquares = rest.showSquares;
    if (rest.loss !== undefined) patch.loss = rest.loss;
    if (snapTo === 'ols') Object.assign(patch, { theta0: ols.theta0, theta1: ols.theta1 });
    if (snapTo === 'lad') Object.assign(patch, { theta0: lad.theta0, theta1: lad.theta1 });
    if (Object.keys(patch).length > 0) setParams(patch);
  }, [figureState, setParams, ols, lad]);

  const atOls =
    Math.abs(params.theta0 - ols.theta0) < 1e-9 && Math.abs(params.theta1 - ols.theta1) < 1e-9;
  const headline = params.loss === 'mae' ? mine.mae : mine.mse;
  const headlineBest = params.loss === 'mae' ? ladMetrics.mae : best.mse;
  const lineTex =
    `\\htmlClass{sym-yhat}{\\hat y} = \\htmlClass{sym-theta}{\\theta_0} + \\htmlClass{sym-theta}{\\theta_1}\\,\\htmlClass{sym-x}{x}` +
    ` = ${fixed(params.theta0, 2)} + ${fixed(params.theta1, 2)}\\,\\htmlClass{sym-x}{x}`;
  const summary =
    `Scatter of 20 patients: BMI on the companion scale against disease progression, ` +
    `with the line θ₀ = ${fixed(params.theta0, 2)}, θ₁ = ${fixed(params.theta1, 2)}. ` +
    `MSE ${fixed(mine.mse, 1)}, R² ${fixed(mine.r2, 3)}.`;

  return (
    <div
      className="lfp"
      data-loss={params.loss}
      data-at-ols={atOls ? 'true' : 'false'}
      data-theta0={String(params.theta0)}
      data-theta1={String(params.theta1)}
    >
      <div className="lfp-plot" ref={plotRef}>
        <svg
          width={width}
          height={PLOT_HEIGHT}
          viewBox={`0 0 ${width} ${PLOT_HEIGHT}`}
          role="img"
          aria-label={summary}
          className="lfp-svg"
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={inner.x0}
                y={inner.y0}
                width={inner.x1 - inner.x0}
                height={inner.y1 - inner.y0}
              />
            </clipPath>
          </defs>
          <g aria-hidden="true" fontSize={11} fill={theme.muted}>
            {fr.yTicks.map((t) => (
              <g key={`y${t}`}>
                <line
                  x1={inner.x0}
                  x2={inner.x1}
                  y1={fr.sy(t)}
                  y2={fr.sy(t)}
                  stroke={theme.border}
                />
                <text x={inner.x0 - 6} y={fr.sy(t) + 4} textAnchor="end">
                  {formatTick(t, fr.yStep)}
                </text>
              </g>
            ))}
            {fr.xTicks.map((t) => (
              <g key={`x${t}`}>
                <line
                  x1={fr.sx(t)}
                  x2={fr.sx(t)}
                  y1={inner.y1}
                  y2={inner.y1 + 4}
                  stroke={theme.border}
                />
                <text x={fr.sx(t)} y={inner.y1 + 16} textAnchor="middle">
                  {formatTick(t, fr.xStep)}
                </text>
              </g>
            ))}
            <text x={(inner.x0 + inner.x1) / 2} y={PLOT_HEIGHT - 4} textAnchor="middle">
              BMI, companion scale (30·bmi + 25)
            </text>
            <text
              transform={`translate(11 ${(inner.y0 + inner.y1) / 2}) rotate(-90)`}
              textAnchor="middle"
            >
              disease progression
            </text>
          </g>
          <g clipPath={`url(#${clipId})`} aria-hidden="true">
            {params.showSquares ? (
              <g
                data-layer="squares"
                fill={theme.viz[4]}
                fillOpacity={params.loss === 'mse' ? 0.16 : 0.08}
                stroke={theme.viz[4]}
                strokeOpacity={0.6}
              >
                {glyphs.map((g, i) => (
                  <rect
                    key={i}
                    x={g.square.x}
                    y={g.square.y}
                    width={g.square.size}
                    height={g.square.size}
                  />
                ))}
              </g>
            ) : null}
            {params.showResiduals ? (
              <g
                data-layer="residuals"
                stroke={theme.viz[4]}
                strokeWidth={params.loss === 'mae' ? 2.5 : 1.5}
              >
                {glyphs.map((g, i) => (
                  <line key={i} x1={g.px} x2={g.px} y1={g.py} y2={g.pyHat} />
                ))}
              </g>
            ) : null}
            <line
              data-layer="model"
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              stroke={theme.viz[5]}
              strokeWidth={2.5}
            />
          </g>
          <g data-layer="points" fill={theme.viz[0]} stroke={theme.surface} strokeWidth={1}>
            {glyphs.map((g, i) => (
              <circle key={ids[i]} cx={g.px} cy={g.py} r={4}>
                <title>{`${ids[i] ?? ''}: residual ${fixed(g.r, 1)}`}</title>
              </circle>
            ))}
          </g>
        </svg>
        <p className="lfp-legend" aria-hidden="true">
          <span style={{ color: theme.viz[0] }}>● patient</span>
          <span style={{ color: theme.viz[5] }}>— line ŷ = θ₀ + θ₁x</span>
          {params.showResiduals ? (
            <span style={{ color: theme.viz[4] }}>| residual y − ŷ</span>
          ) : null}
          {params.showSquares ? (
            <span style={{ color: theme.viz[4] }}>□ squared residual</span>
          ) : null}
        </p>
      </div>

      <div className="lfp-panel">
        <div className="lfp-math">
          <MathLabel tex={lineTex} display />
        </div>
        <p className="lfp-headline" role="status" data-testid="lfp-headline">
          {params.loss === 'mae' ? 'MAE' : 'MSE'} {fixed(headline, 1)}
          <span className="lfp-headline-best"> (smallest possible {fixed(headlineBest, 1)})</span>
        </p>
        <table className="lfp-table" data-testid="lfp-metrics">
          <thead>
            <tr>
              <th scope="col">
                <span className="lfp-sr">Metric</span>
              </th>
              <th scope="col">your line</th>
              <th scope="col">least squares</th>
            </tr>
          </thead>
          <MetricRows mine={mine} best={best} loss={params.loss} />
        </table>
        <p className="lfp-theta" data-testid="lfp-theta">
          θ₀ = {fixed(params.theta0, 4)}, θ₁ = {fixed(params.theta1, 4)}
        </p>
        <div className="lfp-actions">
          <button type="button" className="widget-btn" onClick={() => snap(ols)} disabled={atOls}>
            Snap to OLS
          </button>
          {params.loss === 'mae' ? (
            <button type="button" className="widget-btn" onClick={() => snap(lad)}>
              Snap to least absolute deviations
            </button>
          ) : null}
        </div>
        <div className="lfp-toggles">
          <Toggle
            label="Residuals"
            checked={params.showResiduals}
            onChange={set('showResiduals')}
          />
          <Toggle label="Squares" checked={params.showSquares} onChange={set('showSquares')} />
        </div>
        <Choice
          label="Loss"
          value={params.loss}
          options={[
            { value: 'mse', label: 'MSE' },
            { value: 'mae', label: 'MAE' },
          ]}
          onChange={set('loss')}
        />
      </div>

      <div className="lfp-controls">
        <Param
          label="Intercept"
          tex="\theta_0"
          value={params.theta0}
          min={THETA0_RANGE.min}
          max={THETA0_RANGE.max}
          step={THETA0_RANGE.step}
          defaultValue={initial.theta0}
          onChange={set('theta0')}
          format={(v) => fixed(v, 0)}
        />
        <Param
          label="Slope"
          tex="\theta_1"
          value={params.theta1}
          min={THETA1_RANGE.min}
          max={THETA1_RANGE.max}
          step={THETA1_RANGE.step}
          defaultValue={initial.theta1}
          onChange={set('theta1')}
          format={(v) => fixed(v, 1)}
        />
      </div>
    </div>
  );
}
