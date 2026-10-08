/**
 * `dgp-sampler` (lesson 2.1; rebuilds the linear DGP of L3 pp.37 and 40 and
 * the "what does R² converge to?" question on L3 p.40): α, β, σ_X, σ_ε
 * sliders; a seeded scatter of n draws from X ~ N(0, σ_X²),
 * Y = α + βX + ε; the true conditional mean line E[Y | X = x] = α + βx; the
 * OLS line fitted to the draws; the sample R̂², the training MSE, and the
 * population R² = β²σ_X² / (β²σ_X² + σ_ε²); and a small plot of the sample
 * R² (or training MSE) against n on nested samples, converging to its limit.
 *
 * Mafs draws the plane and lines; `math.ts` does the sampling and fitting;
 * colors come only from `useVizTheme()`. No animation. See README.md.
 */
import { Coordinates, Line, Mafs, useTransformContext, vec } from 'mafs';
import { Shuffle } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { useSeededRandom } from '../_shared/useSeededRandom';
import { useVizTheme, type VizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { N_SLIDER_MAX, params as paramsSchema, type Params } from './manifest';
import {
  logSizes,
  N_MAX,
  olsFit,
  populationR2,
  r2Path,
  sampleDgp,
  standardDraws,
  X_HALF,
  yHalfRange,
  type Dgp,
  type PathPoint,
  type Vec2,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 300;
const PATH_SIZES = logSizes(3, N_MAX, 72);
const figureStateSchema = paramsSchema.partial();

const fmt = (v: number, digits = 2) =>
  Number.isFinite(v) ? (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits) : 'undefined';
const signed = (v: number) => fmt(v).replace('-', '−');

/** Axis labels every `every` units, none at the window edge (where they would be clipped). */
const tickLabel = (every: number, edge: number) => (v: number) =>
  Math.abs(v) < edge && Math.abs(v % every) < 1e-9 ? String(v).replace('-', '−') : '';

/** One `<g>` of circles in pixel space; cheaper than 1000 Mafs `<Point>`s. */
function Scatter({ points, color }: { points: readonly Vec2[]; color: string }) {
  const { viewTransform, userTransform } = useTransformContext();
  const matrix = vec.matrixMult(viewTransform, userTransform);
  const r = points.length > 300 ? 2 : 3;
  return (
    <g fill={color} fillOpacity={0.55} aria-hidden="true" data-layer="scatter">
      {points.map((p, i) => {
        const [cx, cy] = vec.transform([p[0], p[1]], matrix);
        return <circle key={i} cx={cx} cy={cy} r={r} />;
      })}
    </g>
  );
}

/* ---------- the R² (or training MSE) vs n plot, plain SVG ---------- */

const MW = 320;
const MH = 150;
const M = { l: 34, r: 10, t: 10, b: 26 };
const N_TICKS = [3, 10, 30, 100, 300, 1000] as const;

interface ConvergenceProps {
  path: readonly PathPoint[];
  curve: Params['curve'];
  target: number;
  n: number;
  current: number;
  theme: VizTheme;
}

function ConvergencePlot({ path, curve, target, n, current, theme }: ConvergenceProps) {
  const values = path.map((p) => (curve === 'r2' ? p.r2 : p.trainMse));
  const yMax =
    curve === 'r2'
      ? 1
      : Math.max(
          0.1,
          Number.isFinite(target) ? 1.6 * target : 0,
          ...values.slice(Math.floor(values.length / 3)).filter(Number.isFinite),
        );
  const lx0 = Math.log(PATH_SIZES[0] ?? 3);
  const lx1 = Math.log(N_MAX);
  const sx = (v: number) => M.l + ((Math.log(v) - lx0) / (lx1 - lx0)) * (MW - M.l - M.r);
  const sy = (v: number) => MH - M.b - (Math.min(Math.max(v, 0), yMax) / yMax) * (MH - M.t - M.b);

  let d = '';
  path.forEach((p, i) => {
    const v = values[i] ?? Number.NaN;
    if (!Number.isFinite(v)) return;
    d += `${d === '' ? 'M' : 'L'}${sx(p.n).toFixed(1)} ${sy(v).toFixed(1)}`;
  });

  const label = curve === 'r2' ? 'sample R²' : 'training MSE';
  const targetLabel = curve === 'r2' ? 'population R²' : 'σ_ε²';
  const summary =
    `${label} against n on a log scale, from n = 3 to ${N_MAX}, on nested samples; ` +
    `dashed line at the ${targetLabel} ${fmt(target, 3)}; at n = ${n} the ${label} is ${fmt(current, 3)}.`;
  const yTicks = curve === 'r2' ? [0, 0.5, 1] : [0, yMax / 2, yMax];

  return (
    <svg
      className="dgp-conv"
      viewBox={`0 0 ${MW} ${MH}`}
      role="img"
      aria-label={summary}
      data-testid="dgp-convergence"
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={MW - M.r} y1={sy(t)} y2={sy(t)} stroke={theme.border} />
          <text
            x={M.l - 4}
            y={sy(t) + 4}
            textAnchor="end"
            fill={theme.muted}
            className="dgp-conv-tick"
          >
            {t === 0 ? '0' : t.toFixed(curve === 'r2' ? 1 : 2)}
          </text>
        </g>
      ))}
      {N_TICKS.map((t) => (
        <text
          key={t}
          x={sx(t)}
          y={MH - M.b + 16}
          textAnchor="middle"
          fill={theme.muted}
          className="dgp-conv-tick"
        >
          {t}
        </text>
      ))}
      <text x={MW - M.r} y={MH - 2} textAnchor="end" fill={theme.muted} className="dgp-conv-tick">
        n
      </text>
      {Number.isFinite(target) ? (
        <line
          x1={M.l}
          x2={MW - M.r}
          y1={sy(target)}
          y2={sy(target)}
          stroke={theme.viz[3]}
          strokeWidth={2}
          strokeDasharray="6 4"
          data-layer="target"
        />
      ) : null}
      <path d={d} fill="none" stroke={theme.viz[5]} strokeWidth={2} data-layer="path" />
      <line
        x1={sx(n)}
        x2={sx(n)}
        y1={M.t}
        y2={MH - M.b}
        stroke={theme.muted}
        strokeDasharray="2 3"
      />
      {Number.isFinite(current) ? (
        <circle
          cx={sx(n)}
          cy={sy(current)}
          r={4.5}
          fill={theme.surface}
          stroke={theme.viz[5]}
          strokeWidth={2.5}
        />
      ) : null}
    </svg>
  );
}

/* ---------- the widget ---------- */

export default function DgpSampler({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const rng = useSeededRandom(params.seed);

  // A revealed <Step figureState> may set any param.
  useEffect(() => {
    const parsed = figureStateSchema.safeParse(figureState);
    if (!parsed.success || !figureState) return;
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    ) as Partial<Params>;
    if (Object.keys(patch).length > 0) setParams(patch);
  }, [figureState, setParams]);

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );

  const dgp: Dgp = useMemo(
    () => ({
      alpha: params.alpha,
      beta: params.beta,
      sigmaX: params.sigmaX,
      sigmaEps: params.sigmaEps,
    }),
    [params.alpha, params.beta, params.sigmaX, params.sigmaEps],
  );

  // Standard normals depend only on the seed; the sliders rescale the same draws.
  const draws = useMemo(() => standardDraws(N_MAX, rng), [rng]);
  const all = useMemo(() => sampleDgp(dgp, draws, N_MAX), [dgp, draws]);
  const points = useMemo(() => all.slice(0, params.n), [all, params.n]);
  const fit = useMemo(() => olsFit(points), [points]);
  const path = useMemo(() => r2Path(all, PATH_SIZES), [all]);

  const popR2 = populationR2(dgp);
  const noiseVar = params.sigmaEps * params.sigmaEps;
  const yHalf = yHalfRange(dgp);
  const yStep = yHalf <= 6 ? 1 : yHalf <= 12 ? 2 : 4;
  const fitOk = Number.isFinite(fit.alphaHat) && Number.isFinite(fit.betaHat);

  const r2Tex = String.raw`R^2 = \frac{\beta^2\sigma_X^2}{\beta^2\sigma_X^2 + \sigma_\varepsilon^2}`;
  const mseTex = String.raw`\tfrac1n \mathrm{RSS}`;

  return (
    <div className="dgp" data-testid="dgp">
      <div className="dgp-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ x: [-X_HALF, X_HALF], y: [-yHalf, yHalf], padding: 0 }}
          preserveAspectRatio={false}
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian
            xAxis={{ lines: 1, labels: tickLabel(2, X_HALF) }}
            yAxis={{ lines: yStep, labels: tickLabel(2 * yStep, yHalf) }}
            subdivisions={false}
          />
          <Scatter points={points} color={theme.viz[0]} />
          {params.showConditionalMean ? (
            <Line.ThroughPoints
              point1={[0, params.alpha]}
              point2={[1, params.alpha + params.beta]}
              color={theme.viz[3]}
              weight={3}
            />
          ) : null}
          {fitOk ? (
            <Line.ThroughPoints
              point1={[0, fit.alphaHat]}
              point2={[1, fit.alphaHat + fit.betaHat]}
              color={theme.viz[5]}
              weight={2.5}
              style="dashed"
            />
          ) : null}
        </Mafs>
        <p className="dgp-legend" aria-hidden="true">
          <span className="dgp-key" style={{ color: theme.viz[0] }}>
            ● {params.n} draws
          </span>
          {params.showConditionalMean ? (
            <span className="dgp-key" style={{ color: theme.viz[3] }}>
              ━ true line E[Y | X = x] = α + βx
            </span>
          ) : null}
          <span className="dgp-key" style={{ color: theme.viz[5] }}>
            ╍ OLS fit α̂ + β̂x
          </span>
        </p>
      </div>

      <div className="dgp-panel">
        <dl className="dgp-readout">
          <div>
            <dt>
              <MathLabel tex="\hat\alpha,\ \hat\beta" aria-label="OLS intercept and slope" />
            </dt>
            <dd>
              <output data-testid="dgp-fit">
                {signed(fit.alphaHat)}, {signed(fit.betaHat)}
              </output>
              <span className="dgp-truth">
                {' '}
                (α = {signed(params.alpha)}, β = {signed(params.beta)})
              </span>
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel tex="\hat R^2" aria-label="Sample R squared" />
            </dt>
            <dd>
              <output data-testid="dgp-r2">{fmt(fit.r2, 3)}</output>
              <span className="dgp-truth"> sample, n = {params.n}</span>
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel tex="R^2" aria-label="Population R squared" />
            </dt>
            <dd>
              <output data-testid="dgp-pop-r2">{fmt(popR2, 3)}</output>
              <span className="dgp-truth"> population, the n → ∞ limit</span>
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel tex={mseTex} aria-label="Training MSE" />
            </dt>
            <dd>
              <output data-testid="dgp-mse">{fmt(fit.trainMse, 3)}</output>
              <span className="dgp-truth"> training MSE (σ_ε² = {fmt(noiseVar, 2)})</span>
            </dd>
          </div>
        </dl>
        <div className="dgp-formula">
          <MathLabel tex={r2Tex} display />
        </div>
        <ConvergencePlot
          path={path}
          curve={params.curve}
          target={params.curve === 'r2' ? popR2 : noiseVar}
          n={params.n}
          current={params.curve === 'r2' ? fit.r2 : fit.trainMse}
          theme={theme}
        />
        <Choice
          label="Track against n"
          value={params.curve}
          options={[
            { value: 'r2', label: 'Sample R²' },
            { value: 'mse', label: 'Training MSE' },
          ]}
          onChange={set('curve')}
        />
      </div>

      <div className="dgp-controls">
        <div className="dgp-sliders">
          <Param
            label="Intercept"
            tex="\alpha"
            value={params.alpha}
            min={-3}
            max={3}
            step={0.1}
            defaultValue={initial.alpha}
            onChange={set('alpha')}
          />
          <Param
            label="Slope"
            tex="\beta"
            value={params.beta}
            min={-2}
            max={2}
            step={0.1}
            defaultValue={initial.beta}
            onChange={set('beta')}
          />
          <Param
            label="Standard deviation of X"
            tex="\sigma_X"
            value={params.sigmaX}
            min={0.2}
            max={2}
            step={0.1}
            defaultValue={initial.sigmaX}
            onChange={set('sigmaX')}
          />
          <Param
            label="Noise standard deviation"
            tex="\sigma_\varepsilon"
            value={params.sigmaEps}
            min={0}
            max={3}
            step={0.1}
            defaultValue={initial.sigmaEps}
            onChange={set('sigmaEps')}
          />
          <Param
            label="Sample size"
            tex="n"
            value={params.n}
            min={3}
            max={N_SLIDER_MAX}
            step={1}
            defaultValue={initial.n}
            onChange={set('n')}
          />
        </div>
        <div className="dgp-actions">
          <button type="button" className="widget-btn" onClick={() => set('seed')(params.seed + 1)}>
            <Shuffle size={14} aria-hidden="true" />
            Draw again
          </button>
          <span className="dgp-seed" data-testid="dgp-seed">
            draw {params.seed}
          </span>
          <Toggle
            label="True line E[Y | X = x]"
            checked={params.showConditionalMean}
            onChange={set('showConditionalMean')}
          />
        </div>
      </div>
    </div>
  );
}
