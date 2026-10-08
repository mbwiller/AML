/**
 * `gd-1d-quadratic` (lesson 2.5; rebuilds L4 pp.48-49): gradient descent with
 * a fixed step size η on E(θ) = ½aθ² + bθ + c. The parabola with its
 * iterates, a regime strip whose η axis carries ticks at η_opt = 1/a and
 * 2η_opt = 2/a and whose second axis is the contraction factor 1 − ηa (r = 0
 * sits under η_opt, r = −1 under 2η_opt), and the error e(t) by step with
 * its envelope ±|1 − ηa|^t |e(0)|.
 *
 * Mafs draws the plane; `math.ts` computes; colors come from `useVizTheme()`.
 * See README.md.
 */
import { Coordinates, Line, Mafs, Plot, useTransformContext, vec } from 'mafs';
import { useCallback, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Param, Toggle } from '../_shared/Param';
import { MiniChart, useElementWidth } from '../_shared/plot-kit/MiniChart';
import { PlayerControls } from '../_shared/plot-kit/PlayerControls';
import { linearTicks, niceStep } from '../_shared/plot-kit/scale';
import { useFigureStateParams } from '../_shared/plot-kit/useFigureStateParams';
import { useStepPlayer } from '../_shared/plot-kit/useStepPlayer';
import { useVizTheme, type VizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { params as paramsSchema, type Params } from './manifest';
import {
  contractionFactor,
  energy,
  etaDivergence,
  etaOpt,
  gdIterates,
  minimizer,
  plotWindow,
  regime,
  REGIME_LABEL,
  stepsToTolerance,
  type Regime,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 230;
const ETA_MAX = 2.5;

const fmt = (v: number, d = 2) => {
  const s = Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d);
  return s.replace('-', '−');
};
const texNum = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d));
const sci = (v: number) => {
  if (!Number.isFinite(v)) return '\\infty';
  if (v === 0) return '0';
  if (v >= 1e-2 && v < 1e4) return v.toPrecision(3);
  const e = Math.floor(Math.log10(v));
  return `${(v / 10 ** e).toFixed(2)}\\times 10^{${e}}`;
};

/* ---------- iterates on the plane (pixel space, like the reference widgets) ---------- */

function Iterates({ points, color }: { points: readonly [number, number][]; color: string }) {
  const { viewTransform, userTransform } = useTransformContext();
  const m = vec.matrixMult(viewTransform, userTransform);
  const px = points.map((p) => vec.transform([p[0], p[1]], m));
  // Keep runaway iterates at a drawable distance; the SVG viewport clips them.
  const clamp = ([x, y]: vec.Vector2): vec.Vector2 => [
    Math.min(Math.max(x, -4000), 4000),
    Math.min(Math.max(y, -4000), 4000),
  ];
  return (
    <g data-layer="iterates" aria-hidden="true" stroke={color} fill={color}>
      {px.slice(1).map((p, i) => {
        const [x0, y0] = clamp(px[i] as vec.Vector2);
        const [x1, y1] = clamp(p);
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len < 1) return null;
        const ux = (x1 - x0) / len;
        const uy = (y1 - y0) / len;
        const hx = x1 - ux * 6;
        const hy = y1 - uy * 6;
        return (
          <g key={i}>
            <line x1={x0} y1={y0} x2={hx} y2={hy} strokeWidth={1.75} />
            <path
              d={`M${x1} ${y1}L${hx - uy * 4} ${hy + ux * 4}L${hx + uy * 4} ${hy - ux * 4}Z`}
              strokeWidth={0}
            />
          </g>
        );
      })}
      {px.map((p, i) => {
        const [x, y] = clamp(p);
        return i === 0 ? (
          <rect key={i} x={x - 5} y={y - 5} width={10} height={10} stroke="none" />
        ) : (
          <circle key={i} cx={x} cy={y} r={3.5} stroke="none" />
        );
      })}
    </g>
  );
}

/* ---------- the regime strip: η on top, 1 − ηa underneath ---------- */

const ZONE_LABEL: Record<'monotone' | 'oscillating' | 'divergent', string> = {
  monotone: 'monotone',
  oscillating: 'oscillates',
  divergent: 'diverges',
};

interface StripProps {
  a: number;
  eta: number;
  markers: readonly string[];
  showContraction: boolean;
  theme: VizTheme;
}

function RegimeStrip({ a, eta, markers, showContraction, theme }: StripProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(320);
  const left = 14;
  const right = 14;
  const inner = Math.max(width - left - right, 50);
  const x = (v: number) => left + (Math.min(Math.max(v, 0), ETA_MAX) / ETA_MAX) * inner;
  const opt = etaOpt(a);
  const div = etaDivergence(a);
  const top = 18;
  const bandH = 22;
  const markerRow = top + bandH + 16;
  const factorRow = markerRow + 18;
  const height = showContraction ? factorRow + 6 : markerRow + 6;

  const zones = [
    { key: 'monotone' as const, from: 0, to: opt, color: theme.positive },
    { key: 'oscillating' as const, from: opt, to: div, color: theme.field.calculus },
    { key: 'divergent' as const, from: div, to: ETA_MAX, color: theme.negative },
  ];
  const etaTicks = linearTicks(0, ETA_MAX, Math.max(2, Math.floor(inner / 60)));
  // r = 1 − ηa is linear in η: r = k sits at η = (1 − k)/a. Integer ticks, thinned.
  const pxPerUnit = inner / (ETA_MAX * a);
  const stride = pxPerUnit >= 34 ? 1 : pxPerUnit >= 17 ? 2 : 5;
  const rTicks: number[] = [];
  for (let k = 1; k >= 1 - ETA_MAX * a - 1e-9; k -= 1) {
    if ((1 - k) % stride === 0) rTicks.push(k);
  }
  const r = contractionFactor(a, eta);
  const showOpt = markers.includes('eta_opt') && opt <= ETA_MAX;
  const showDiv = markers.includes('two_eta_opt') && div <= ETA_MAX;

  return (
    <div ref={ref} className="g1q-strip" data-testid="g1q-strip">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Step-size regimes for a = ${a}: monotone below η_opt = ${fmt(opt, 3)}, oscillating up to 2η_opt = ${fmt(div, 3)}, divergent above; current η = ${fmt(eta)}${showContraction ? `, contraction factor 1 − ηa = ${fmt(r)}` : ''}.`}
      >
        {zones.map((z) =>
          z.to > z.from ? (
            <g key={z.key}>
              <rect
                x={x(z.from)}
                y={top}
                width={Math.max(x(z.to) - x(z.from), 0)}
                height={bandH}
                fill={z.color}
                fillOpacity={0.18}
              />
              {x(z.to) - x(z.from) > 70 ? (
                <text
                  x={(x(z.from) + x(z.to)) / 2}
                  y={top + 15}
                  textAnchor="middle"
                  className="g1q-strip-zone"
                  fill={theme.fg}
                >
                  {ZONE_LABEL[z.key]}
                </text>
              ) : null}
            </g>
          ) : null,
        )}
        <rect x={left} y={top} width={inner} height={bandH} fill="none" stroke={theme.border} />
        <g fill={theme.muted} className="g1q-strip-tick">
          {etaTicks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 3} y2={top} stroke={theme.muted} />
              <text x={x(t)} y={top - 6} textAnchor="middle">
                {t === 0 ? 'η = 0' : String(t)}
              </text>
            </g>
          ))}
        </g>
        {showOpt ? (
          <g data-marker="eta_opt" className="g1q-strip-tick">
            <line
              x1={x(opt)}
              x2={x(opt)}
              y1={top}
              y2={markerRow - 11}
              stroke={theme.positive}
              strokeWidth={2}
            />
            <text x={x(opt)} y={markerRow} textAnchor="middle" fill={theme.fg}>
              η_opt
            </text>
          </g>
        ) : null}
        {showDiv ? (
          <g data-marker="two_eta_opt" className="g1q-strip-tick">
            <line
              x1={x(div)}
              x2={x(div)}
              y1={top}
              y2={markerRow - 11}
              stroke={theme.negative}
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <text x={x(div)} y={markerRow} textAnchor="middle" fill={theme.fg}>
              2η_opt
            </text>
          </g>
        ) : null}
        <g data-layer="eta-marker" fill={theme.fg} stroke={theme.fg}>
          <line x1={x(eta)} x2={x(eta)} y1={top - 2} y2={top + bandH} strokeWidth={2.5} />
          <path d={`M${x(eta)} ${top + bandH}l-5 7h10z`} stroke="none" />
        </g>
        {showContraction ? (
          <g fill={theme.muted} className="g1q-strip-tick" data-layer="factor-axis">
            {rTicks.map((k) => (
              <text
                key={k}
                x={x((1 - k) / a)}
                y={factorRow}
                textAnchor={k === 1 ? 'start' : 'middle'}
              >
                {fmt(k, 0)}
              </text>
            ))}
          </g>
        ) : null}
      </svg>
      <p className="g1q-strip-note">
        Strip: η along the top
        {showContraction ? '; 1 − ηa along the bottom (0 under η_opt, −1 under 2η_opt)' : ''}.
      </p>
    </div>
  );
}

/* ---------- the widget ---------- */

const REGIME_TONE: Record<Regime, 'pos' | 'warn' | 'neg' | 'muted'> = {
  frozen: 'muted',
  monotone: 'pos',
  exact: 'pos',
  oscillating: 'warn',
  bounce: 'warn',
  divergent: 'neg',
};

export default function Gd1dQuadratic({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  useFigureStateParams(figureState, paramsSchema.shape, setParams);

  const q = useMemo(
    () => ({ a: params.a, b: params.b, c: params.c }),
    [params.a, params.b, params.c],
  );
  const star = minimizer(q);
  const win = useMemo(() => plotWindow(q, params.theta0), [q, params.theta0]);
  const iterates = useMemo(
    () => gdIterates(q, params.theta0, params.eta, params.steps),
    [q, params.theta0, params.eta, params.steps],
  );
  const resetKey = `${params.a}|${params.b}|${params.c}|${params.eta}|${params.theta0}|${params.steps}`;
  const player = useStepPlayer(params.steps, resetKey);
  const visible = iterates.slice(0, player.shown + 1);

  const r = contractionFactor(params.a, params.eta);
  const reg = regime(params.a, params.eta);
  const opt = etaOpt(params.a);
  const div = etaDivergence(params.a);
  const e0 = params.theta0 - star;
  const eT = (iterates[params.steps] ?? star) - star;
  const toThousandth = stepsToTolerance(r, 1e-3);
  const leaves = iterates.findIndex((t) => t < win.x[0] || t > win.x[1]);

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );

  // Tick spacing that keeps the axis labels readable at any (a, θ(0)).
  const xStep = niceStep(win.x[0], win.x[1], 5);
  const yStep = niceStep(win.y[0], win.y[1], 4);

  /* ---------- error chart ---------- */
  const errScale = Math.max(Math.abs(e0), 1e-6);
  const errPoints = visible.map((t, i) => [i, t - star] as const);
  // ±|1 − ηa|^t |e(0)|: at most 41 points, cheap enough to recompute each render.
  const envelope = { up: [] as [number, number][], down: [] as [number, number][] };
  for (let t = 0; t <= params.steps; t += 1) {
    const m = Math.abs(r) ** t * Math.abs(e0);
    envelope.up.push([t, m]);
    envelope.down.push([t, -m]);
  }

  /* ---------- readouts ---------- */
  const eta = '\\htmlClass{sym-eta}{\\eta}';
  const theta = '\\htmlClass{sym-theta}{\\theta}';
  const bTerm =
    params.b === 0 ? '' : `${params.b < 0 ? '-' : '+'} ${texNum(Math.abs(params.b), 1)}${theta}`;
  const cTerm =
    params.c === 0 ? '' : `${params.c < 0 ? '-' : '+'} ${texNum(Math.abs(params.c), 1)}`;
  const energyTex = `E(${theta}) = \\tfrac12 (${texNum(params.a, 1)})${theta}^2 ${bTerm} ${cTerm}`;
  const optTex = [
    `${theta}^\\star = -b/a = ${texNum(star)}`,
    `${eta}_{opt} = 1/a = ${texNum(opt, 3)}`,
    `2${eta}_{opt} = ${texNum(div, 3)}`,
  ];
  const factorTex = `1 - ${eta} a = 1 - (${texNum(params.eta)})(${texNum(params.a, 1)}) = ${texNum(r, 3)}`;
  const errTex = `\\lvert e^{(${params.steps})} \\rvert = \\lvert 1 - ${eta} a\\rvert^{${params.steps}}\\,\\lvert e^{(0)}\\rvert = ${sci(Math.abs(eT))}`;

  return (
    <div className="g1q" data-regime={reg}>
      <div className="g1q-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ x: win.x, y: win.y, padding: 0 }}
          preserveAspectRatio={false}
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian
            xAxis={{ lines: xStep, labels: (v) => fmt(v, xStep < 1 ? 1 : 0) }}
            yAxis={{ lines: yStep, labels: (v) => fmt(v, yStep < 1 ? 1 : 0) }}
            subdivisions={false}
          />
          <Plot.OfX y={(t) => energy(q, t)} color={theme.viz[1]} weight={2.5} />
          <Line.Segment
            point1={[star, win.y[0]]}
            point2={[star, win.y[1]]}
            color={theme.boundary}
            weight={1}
            style="dashed"
          />
          <Iterates
            points={visible.map((t) => [t, energy(q, t)] as [number, number])}
            color={theme.field.calculus}
          />
        </Mafs>
        <p className="g1q-legend" aria-hidden="true">
          <span style={{ color: theme.viz[1] }}>— E(θ)</span>
          <span style={{ color: theme.field.calculus }}>■ θ(0) → ● iterates</span>
          <span style={{ color: theme.boundary }}>┆ θ*</span>
        </p>

        <RegimeStrip
          a={params.a}
          eta={params.eta}
          markers={params.markers}
          showContraction={params.showContraction}
          theme={theme}
        />

        <p className="g1q-caption">Error e(t) = θ(t) − θ* by step</p>
        <MiniChart
          label={`Error by step: ${REGIME_LABEL[reg]}; after ${params.steps} steps |e| = ${fmt(Math.abs(eT), 3)}.`}
          height={120}
          x={[0, params.steps]}
          y={[-1.25 * errScale, 1.25 * errScale]}
          testId="g1q-error-chart"
          series={[
            ...(params.showContraction
              ? [
                  {
                    id: 'envelope-up',
                    points: envelope.up,
                    color: theme.muted,
                    width: 1.25,
                    dash: '4 3',
                  },
                  {
                    id: 'envelope-down',
                    points: envelope.down,
                    color: theme.muted,
                    width: 1.25,
                    dash: '4 3',
                  },
                ]
              : []),
            {
              id: 'error',
              points: errPoints,
              color: theme.field.calculus,
              stems: true,
              dots: true,
              noLine: true,
            },
          ]}
        />
      </div>

      <div className="g1q-panel">
        <Param
          label="Step size"
          tex="\eta"
          value={params.eta}
          min={0}
          max={ETA_MAX}
          step={0.01}
          defaultValue={initial.eta}
          onChange={set('eta')}
        />
        {params.markers.length > 0 ? (
          <div className="g1q-presets" role="group" aria-label="Reference step sizes">
            {params.markers.includes('eta_opt') ? (
              <button
                type="button"
                className="widget-btn"
                aria-label={`Set η to η_opt = ${fmt(opt, 3)}`}
                onClick={() => set('eta')(opt)}
              >
                <MathLabel tex={`\\eta = \\eta_{opt} = ${texNum(opt, 3)}`} />
              </button>
            ) : null}
            {params.markers.includes('two_eta_opt') && div <= ETA_MAX ? (
              <button
                type="button"
                className="widget-btn"
                aria-label={`Set η to 2η_opt = ${fmt(div, 3)}`}
                onClick={() => set('eta')(div)}
              >
                <MathLabel tex={`\\eta = 2\\eta_{opt} = ${texNum(div, 3)}`} />
              </button>
            ) : null}
          </div>
        ) : null}
        <PlayerControls player={player} total={params.steps} />

        <div className="g1q-math" data-testid="g1q-readout">
          <MathLabel tex={energyTex} className="g1q-chip" />
          {optTex.map((t) => (
            <MathLabel key={t} tex={t} className="g1q-chip" />
          ))}
          {params.showContraction ? (
            <span data-testid="g1q-factor" className="g1q-chip">
              <MathLabel tex={factorTex} />
            </span>
          ) : null}
          <MathLabel tex={errTex} className="g1q-chip" />
        </div>
        <p className={`g1q-regime g1q-tone-${REGIME_TONE[reg]}`} role="status">
          <span className="g1q-regime-label">Regime:</span>{' '}
          <strong data-testid="g1q-regime">{REGIME_LABEL[reg]}</strong>
          {reg === 'divergent' && leaves > 0 ? ` (θ(${leaves}) leaves the plot)` : ''}
          {Number.isFinite(toThousandth) && reg !== 'exact'
            ? `. Error below 1/1000 of e(0) after ${toThousandth} steps.`
            : reg === 'exact'
              ? '. One step lands on θ*.'
              : '.'}
        </p>
      </div>

      <div className="g1q-controls">
        <div className="g1q-sliders">
          <Param
            label="Curvature"
            tex="a"
            value={params.a}
            min={1}
            max={5}
            step={0.1}
            defaultValue={initial.a}
            onChange={set('a')}
          />
          <Param
            label="Linear term"
            tex="b"
            value={params.b}
            min={-10}
            max={10}
            step={0.5}
            defaultValue={initial.b}
            onChange={set('b')}
          />
          <Param
            label="Start"
            tex="\theta^{(0)}"
            value={params.theta0}
            min={-10}
            max={10}
            step={0.5}
            defaultValue={initial.theta0}
            onChange={set('theta0')}
          />
        </div>
        <Toggle
          label="Contraction factor 1 − ηa"
          checked={params.showContraction}
          onChange={set('showContraction')}
        />
      </div>
    </div>
  );
}
