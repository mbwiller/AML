/**
 * `gd-2d-eigen` (lesson 2.5; rebuilds L4 pp.50-53 and L5 pp.7-9): gradient
 * descent with one step size on the elliptical bowl E(θ) = ½θᵀAθ, A with
 * eigenvalues λ1, λ2 and eigenvectors rotated by φ. The level sets and the
 * iterates on the plane (the start is draggable), the eigen-axes, a table of
 * the per-mode factors 1 − ηλᵢ, the per-mode errors |vᵢ(t)| on a log scale,
 * the condition number κ, the stability bound 2/λmax, the best step
 * η* = 2/(λmax + λmin), and L4 p.53's five step sizes as presets and as
 * small multiples.
 *
 * Mafs draws the plane; `math.ts` computes; colors come from `useVizTheme()`.
 * See README.md.
 */
import { Coordinates, Ellipse, Line, Mafs, Text, useTransformContext, vec } from 'mafs';
import { useCallback, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Param, Toggle } from '../_shared/Param';
import { MiniChart } from '../_shared/plot-kit/MiniChart';
import { MovablePoint } from '../_shared/plot-kit/MovablePoint';
import { PlayerControls } from '../_shared/plot-kit/PlayerControls';
import { useFigureStateParams } from '../_shared/plot-kit/useFigureStateParams';
import { useStepPlayer } from '../_shared/plot-kit/useStepPlayer';
import { useVizTheme, type VizTheme } from '../_shared/useVizTheme';
import { regime, type Regime } from '../gd-1d-quadratic/math';
import type { WidgetProps } from '../types';
import { params as paramsSchema, type Params } from './manifest';
import {
  bestRate,
  bestStep,
  conditionNumber,
  contourLevels,
  DOMAIN,
  eigenBasis,
  energy,
  FIVE_RATES,
  firstBelow,
  gdIterates,
  hessianFromEigen,
  levelSetEllipse,
  levelSetPoints,
  modeFactors,
  spectralRadius,
  stabilityBound,
  stepsToTolerance,
  toEigenCoords,
  type Vec2,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 340;
const VIEW = { x: [-DOMAIN, DOMAIN] as [number, number], y: [-DOMAIN, DOMAIN] as [number, number] };
const TOL = 1e-3;

const fmt = (v: number, d = 2) => {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  const s = Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d);
  return s.replace('-', '−');
};
const tex = (v: number, d = 2) =>
  !Number.isFinite(v) ? '\\infty' : Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d);
const SHORT_REGIME: Record<Regime, string> = {
  frozen: 'frozen',
  monotone: 'monotone',
  exact: 'exact in 1 step',
  oscillating: 'oscillates',
  bounce: 'bounces',
  divergent: 'diverges',
};
const snap = (v: number) => Math.round(v * 2) / 2;
const clampDomain = (p: [number, number]): [number, number] => [
  Math.min(Math.max(snap(p[0]), -DOMAIN), DOMAIN),
  Math.min(Math.max(snap(p[1]), -DOMAIN), DOMAIN),
];

/* ---------- iterates (pixel space) ---------- */

function Path({ points, color }: { points: readonly Vec2[]; color: string }) {
  const { viewTransform, userTransform } = useTransformContext();
  const m = vec.matrixMult(viewTransform, userTransform);
  const px = points.map((p) => {
    const [x, y] = vec.transform([p[0], p[1]], m);
    return [Math.min(Math.max(x, -4000), 4000), Math.min(Math.max(y, -4000), 4000)] as const;
  });
  const pts = px.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <g data-layer="iterates" aria-hidden="true" fill={color}>
      {/* polyline, not path: mafs/core.css forces the stroke of every <path>. */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      {px.slice(1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.25} />
      ))}
    </g>
  );
}

/* ---------- L4 p.53 small multiples (plain SVG, no text inside) ---------- */

function SmallMultiple({
  lambda1,
  lambda2,
  rotation,
  start,
  eta,
  steps,
  theme,
  levels,
}: {
  lambda1: number;
  lambda2: number;
  rotation: number;
  start: Vec2;
  eta: number;
  steps: number;
  theme: VizTheme;
  levels: readonly number[];
}) {
  const S = 120;
  const px = (v: number) => Math.min(Math.max(((v + DOMAIN) / (2 * DOMAIN)) * S, -S), 2 * S);
  const py = (v: number) => S - px(v);
  const A = hessianFromEigen(lambda1, lambda2, rotation);
  const its = gdIterates(A, start, eta, steps);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="g2e-small-svg" aria-hidden="true" overflow="hidden">
      <rect width={S} height={S} fill={theme.surface} stroke={theme.border} />
      {levels.map((level) => (
        <polygon
          key={level}
          points={levelSetPoints(lambda1, lambda2, rotation, level, 48)
            .map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`)
            .join(' ')}
          fill="none"
          stroke={theme.viz[1]}
          strokeOpacity={0.55}
        />
      ))}
      <polyline
        points={its.map(([x, y]) => `${px(x).toFixed(1)},${py(y).toFixed(1)}`).join(' ')}
        fill="none"
        stroke={theme.field.calculus}
        strokeWidth={1.5}
      />
    </svg>
  );
}

/* ---------- the widget ---------- */

export default function Gd2dEigen({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  useFigureStateParams(figureState, paramsSchema.shape, setParams);

  const { lambda1: l1, lambda2: l2, rotation, eta, steps } = params;
  const start: Vec2 = [params.start[0], params.start[1]];
  const [sx, sy] = start;
  const A = useMemo(() => hessianFromEigen(l1, l2, rotation), [l1, l2, rotation]);
  const iterates = useMemo(() => gdIterates(A, [sx, sy], eta, steps), [A, sx, sy, eta, steps]);
  const levels = useMemo(() => contourLevels(energy(A, [sx, sy])), [A, sx, sy]);
  const [q1, q2] = eigenBasis(rotation);

  const resetKey = `${l1}|${l2}|${rotation}|${eta}|${sx}|${sy}|${steps}`;
  const player = useStepPlayer(steps, resetKey, 300);
  const visible = iterates.slice(0, player.shown + 1);

  const lMax = Math.max(l1, l2);
  const kappa = conditionNumber(l1, l2);
  const bound = stabilityBound(l1, l2);
  const etaStar = bestStep(l1, l2);
  const rho = spectralRadius(l1, l2, eta);
  const [r1, r2] = modeFactors(l1, l2, eta);
  const hit = firstBelow(iterates, TOL);
  const predicted = stepsToTolerance(rho, TOL);

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );
  const moveStart = useCallback(
    (p: [number, number]) => setParams({ start: clampDomain(p) }),
    [setParams],
  );

  /* ---------- per-mode error chart (log scale) ---------- */
  const n0 = Math.max(Math.hypot(sx, sy), 1e-9);
  const modeSeries = useMemo(() => {
    const m1: [number, number][] = [];
    const m2: [number, number][] = [];
    iterates.forEach((p, t) => {
      if (t > player.shown) return;
      const v = toEigenCoords(p, rotation);
      m1.push([t, Math.abs(v[0])]);
      m2.push([t, Math.abs(v[1])]);
    });
    return { m1, m2 };
  }, [iterates, rotation, player.shown]);

  /* ---------- readouts ---------- */
  const eTex = '\\htmlClass{sym-eta}{\\eta}';
  const readouts = [
    `\\kappa = \\lambda_{\\max}/\\lambda_{\\min} = ${tex(kappa)}`,
    `2/\\lambda_{\\max} = ${tex(bound, 3)}`,
    `${eTex}^\\star = 2/(\\lambda_{\\max} + \\lambda_{\\min}) = ${tex(etaStar, 3)}`,
    `\\rho(${eTex}) = \\max_i \\lvert 1 - ${eTex}\\lambda_i \\rvert = ${tex(rho, 3)}`,
    `\\rho(${eTex}^\\star) = \\tfrac{\\kappa - 1}{\\kappa + 1} = ${tex(bestRate(kappa), 3)}`,
  ];

  const verdict =
    rho > 1 + 1e-9
      ? `diverges (ρ = ${fmt(rho, 3)} > 1)`
      : Math.abs(rho - 1) <= 1e-9
        ? 'never settles (ρ = 1)'
        : hit !== null
          ? `error below 1/1000 of ‖θ(0)‖ at step ${hit}`
          : `error below 1/1000 of ‖θ(0)‖ after about ${predicted} steps (more than ${steps} drawn)`;

  const modeRows = [
    { i: 1, lambda: l1, r: r1, color: theme.viz[0] },
    { i: 2, lambda: l2, r: r2, color: theme.viz[4] },
  ];

  return (
    <div className="g2e" data-kappa={kappa.toFixed(3)} data-rho={rho.toFixed(3)}>
      <div className="g2e-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ ...VIEW, padding: 0 }}
          preserveAspectRatio="contain"
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian
            xAxis={{ lines: 5, labels: (v) => (v % 10 === 0 ? fmt(v, 0) : '') }}
            yAxis={{ lines: 5, labels: (v) => (v % 10 === 0 ? fmt(v, 0) : '') }}
            subdivisions={false}
          />
          {levels.map((level) => {
            const { radii, angle } = levelSetEllipse(l1, l2, rotation, level);
            return (
              <Ellipse
                key={level}
                center={[0, 0]}
                radius={[radii[0], radii[1]]}
                angle={angle}
                color={theme.viz[1]}
                fillOpacity={0}
                weight={1.25}
              />
            );
          })}
          {params.showModes ? (
            <g data-layer="eigen-axes">
              <Line.ThroughPoints
                point1={[0, 0]}
                point2={[q1[0], q1[1]]}
                color={theme.viz[0]}
                weight={1.5}
                style="dashed"
              />
              <Line.ThroughPoints
                point1={[0, 0]}
                point2={[q2[0], q2[1]]}
                color={theme.viz[4]}
                weight={1.5}
                style="dashed"
              />
              <Text x={11 * q1[0]} y={11 * q1[1]} attach="n" size={13} color={theme.viz[0]}>
                {`q₁ (λ₁ = ${fmt(l1, 1)})`}
              </Text>
              <Text x={11 * q2[0]} y={11 * q2[1]} attach="e" size={13} color={theme.viz[4]}>
                {`q₂ (λ₂ = ${fmt(l2, 1)})`}
              </Text>
            </g>
          ) : null}
          <Path points={visible} color={theme.field.calculus} />
          <MovablePoint
            point={start}
            onMove={moveStart}
            color={theme.field.calculus}
            constrain={clampDomain}
            testId="g2e-start"
            label={`Starting point θ(0) at (${fmt(sx, 1)}, ${fmt(sy, 1)}). Arrow keys move it.`}
          />
        </Mafs>
        <p className="g2e-legend" aria-hidden="true">
          <span style={{ color: theme.viz[1] }}>◯ level sets of E</span>
          <span style={{ color: theme.field.calculus }}>● θ(0) (drag) → iterates</span>
          <span>minimum at the origin</span>
        </p>
      </div>

      <div className="g2e-panel">
        <Param
          label="Step size"
          tex="\eta"
          value={eta}
          min={0}
          max={2}
          step={0.01}
          defaultValue={initial.eta}
          onChange={set('eta')}
          format={(v) => v.toFixed(3)}
        />
        <div
          className="g2e-presets"
          role="group"
          aria-label="Step size as a multiple of 1/λmax (L4 p.53)"
        >
          <span className="g2e-presets-label">
            <MathLabel tex={`${eTex} \\cdot \\lambda_{\\max}`} />:
          </span>
          {FIVE_RATES.map((m) => (
            <button
              key={m}
              type="button"
              className="widget-btn"
              aria-pressed={Math.abs(eta * lMax - m) < 1e-9}
              aria-label={`Set η to ${m} times 1/λmax = ${fmt(m / lMax, 3)}`}
              onClick={() => set('eta')(m / lMax)}
            >
              {m}
            </button>
          ))}
          <button
            type="button"
            className="widget-btn"
            aria-pressed={Math.abs(eta - etaStar) < 1e-9}
            aria-label={`Set η to the best step η* = ${fmt(etaStar, 3)}`}
            onClick={() => set('eta')(etaStar)}
          >
            <MathLabel tex={`${eTex}^\\star`} />
          </button>
        </div>
        <PlayerControls player={player} total={steps} />
        <div className="g2e-math" data-testid="g2e-readout">
          {readouts.map((t) => (
            <MathLabel key={t} tex={t} className="g2e-chip" />
          ))}
        </div>
        <p className="g2e-verdict" role="status" data-testid="g2e-verdict">
          {verdict}.
        </p>
      </div>

      {params.showModes ? (
        <div className="g2e-modes" data-testid="g2e-modes">
          <div className="g2e-table-wrap">
            <table className="g2e-table">
              <caption className="g2e-caption">Per-mode contraction, v = Qᵀθ</caption>
              <thead>
                <tr>
                  <th scope="col">Mode</th>
                  <th scope="col">
                    <MathLabel tex="\lambda_i" />
                  </th>
                  <th scope="col">
                    <MathLabel tex="\eta_{i,opt}" />
                  </th>
                  <th scope="col">
                    <MathLabel tex={`1 - ${eTex}\\lambda_i`} />
                  </th>
                  <th scope="col">Behavior</th>
                </tr>
              </thead>
              <tbody>
                {modeRows.map((row) => (
                  <tr key={row.i} data-mode={row.i}>
                    <th scope="row">
                      <span
                        className="g2e-swatch"
                        style={{ background: row.color }}
                        aria-hidden="true"
                      />
                      {row.i === 1 ? 'q₁ (● solid)' : 'q₂ (■ dashed)'}
                    </th>
                    <td>{fmt(row.lambda, 2)}</td>
                    <td>{fmt(1 / row.lambda, 3)}</td>
                    <td data-testid={`g2e-factor-${row.i}`}>{fmt(row.r, 3)}</td>
                    <td>{SHORT_REGIME[regime(row.lambda, eta)]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="g2e-chart">
            <p className="g2e-caption">Per-mode error |vᵢ(t)|, log scale</p>
            <MiniChart
              label={`Per-mode error by step on a log scale: mode 1 shrinks by ${fmt(Math.abs(r1), 3)} per step, mode 2 by ${fmt(Math.abs(r2), 3)}.`}
              height={130}
              x={[0, steps]}
              y={[n0 * 1e-4, n0 * 10]}
              yLog
              testId="g2e-mode-chart"
              series={[
                { id: 'mode-1', points: modeSeries.m1, color: theme.viz[0], dots: true },
                {
                  id: 'mode-2',
                  points: modeSeries.m2,
                  color: theme.viz[4],
                  dash: '5 3',
                  dots: true,
                  marker: 'square',
                },
              ]}
            />
          </div>
        </div>
      ) : null}

      <div className="g2e-controls">
        <div className="g2e-sliders">
          <Param
            label="Eigenvalue 1"
            tex="\lambda_1"
            value={l1}
            min={0.1}
            max={5}
            step={0.1}
            defaultValue={initial.lambda1}
            onChange={set('lambda1')}
          />
          <Param
            label="Eigenvalue 2"
            tex="\lambda_2"
            value={l2}
            min={0.1}
            max={5}
            step={0.1}
            defaultValue={initial.lambda2}
            onChange={set('lambda2')}
          />
          <Param
            label="Rotation"
            tex="\varphi"
            unit="°"
            value={rotation}
            min={-90}
            max={90}
            step={5}
            defaultValue={initial.rotation}
            onChange={set('rotation')}
          />
        </div>
        <div className="g2e-toggles">
          <Toggle label="Eigen-modes" checked={params.showModes} onChange={set('showModes')} />
          <Toggle
            label="Compare the five step sizes of L4 p.53"
            checked={params.showFive}
            onChange={set('showFive')}
          />
        </div>
      </div>

      {params.showFive ? (
        <div className="g2e-five" data-testid="g2e-five">
          {FIVE_RATES.map((m) => {
            const e = m / lMax;
            const r = spectralRadius(l1, l2, e);
            const h = firstBelow(gdIterates(A, start, e, 100), TOL);
            return (
              <figure key={m} className="g2e-small">
                <SmallMultiple
                  lambda1={l1}
                  lambda2={l2}
                  rotation={rotation}
                  start={start}
                  eta={e}
                  steps={steps}
                  theme={theme}
                  levels={levels}
                />
                <figcaption>
                  <strong>{m}/λmax</strong> = {fmt(e, 3)}
                  <br />ρ = {fmt(r, 2)}
                  <br />
                  {h === null ? (r >= 1 ? 'no convergence' : '> 100 steps') : `${h} steps`}
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
