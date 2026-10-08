/**
 * `sgd-noise` (lesson 2.5; rebuilds L5 p.14's "noisy but unbiased" and
 * der-2-5-9): a seeded least-squares problem in two parameters. In the
 * arrows view, K minibatch steps −η g_B fan out from a draggable probe point,
 * with their average, the full-gradient step −η∇R̂, and the theoretical 2σ
 * ellipse of the tips (covariance η²Σ₁/b); readouts compare the average with
 * ∇R̂ and the spread with √(tr Σ₁/b). In the path view, constant-step SGD
 * wanders around θ̂ next to the GD path (the noise floor).
 *
 * Mafs draws the plane; `math.ts` computes; seeded draws come from
 * `createSeededRandom` (d3-random's LCG); colors come from `useVizTheme()`.
 * See README.md.
 */
import { Coordinates, Ellipse, Mafs, useTransformContext, vec } from 'mafs';
import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { MovablePoint } from '../_shared/plot-kit/MovablePoint';
import { PlayerControls } from '../_shared/plot-kit/PlayerControls';
import { useFigureStateParams } from '../_shared/plot-kit/useFigureStateParams';
import { useStepPlayer } from '../_shared/plot-kit/useStepPlayer';
import { useVizTheme } from '../_shared/useVizTheme';
import { eigenSymmetric2, majorAxisAngle } from '../gaussian-2d-covariance/math';
import type { WidgetProps } from '../types';
import { params as paramsSchema, type Params } from './manifest';
import {
  fullGradient,
  gdPath,
  hessian,
  leastSquares,
  makeProblem,
  meanVec,
  minibatchCovariance,
  noiseFloor,
  rmsSpread,
  sampleMinibatchGradients,
  sgdPath,
  singleExampleCovariance,
  theoreticalSpread,
  WINDOW,
  type Vec2,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 340;

const fmt = (v: number, d = 2) =>
  (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d)).replace('-', '−');
const tex = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d));
const snap = (v: number) => Math.round(v * 10) / 10;

/* ---------- pixel-space layers ---------- */

function usePixel() {
  const { viewTransform, userTransform } = useTransformContext();
  const m = vec.matrixMult(viewTransform, userTransform);
  return (p: Vec2) => {
    const [x, y] = vec.transform([p[0], p[1]], m);
    return [Math.min(Math.max(x, -4000), 4000), Math.min(Math.max(y, -4000), 4000)] as const;
  };
}

/** Line segments from `from` to each tip, with a dot at the tip. */
function Fan({ from, tips, color }: { from: Vec2; tips: readonly Vec2[]; color: string }) {
  const toPx = usePixel();
  const [x0, y0] = toPx(from);
  return (
    <g data-layer="samples" aria-hidden="true" stroke={color} fill={color}>
      {tips.map((t, i) => {
        const [x, y] = toPx(t);
        return (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x} y2={y} strokeWidth={1.25} strokeOpacity={0.4} />
            <circle cx={x} cy={y} r={2.5} stroke="none" fillOpacity={0.7} />
          </g>
        );
      })}
    </g>
  );
}

/** A thick arrow (line + head) in pixel space; `dashed` for the sample average. */
function Arrow({
  from,
  to,
  color,
  dashed = false,
  layer,
}: {
  from: Vec2;
  to: Vec2;
  color: string;
  dashed?: boolean;
  layer: string;
}) {
  const toPx = usePixel();
  const [x0, y0] = toPx(from);
  const [x1, y1] = toPx(to);
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return null;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const hx = x1 - ux * 9;
  const hy = y1 - uy * 9;
  return (
    <g data-layer={layer} aria-hidden="true">
      <line
        x1={x0}
        y1={y0}
        x2={hx}
        y2={hy}
        stroke={color}
        strokeWidth={3}
        strokeDasharray={dashed ? '6 4' : undefined}
      />
      <polygon
        points={`${x1},${y1} ${hx - uy * 5},${hy + ux * 5} ${hx + uy * 5},${hy - ux * 5}`}
        fill={color}
      />
    </g>
  );
}

function PathLine({
  points,
  color,
  dashed = false,
  layer,
}: {
  points: readonly Vec2[];
  color: string;
  dashed?: boolean;
  layer: string;
}) {
  const toPx = usePixel();
  return (
    <g data-layer={layer} aria-hidden="true">
      <polyline
        points={points
          .map((p) =>
            toPx(p)
              .map((v) => v.toFixed(1))
              .join(','),
          )
          .join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={dashed ? 2 : 1.5}
        strokeDasharray={dashed ? '6 4' : undefined}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Cross({ at, color }: { at: Vec2; color: string }) {
  const toPx = usePixel();
  const [x, y] = toPx(at);
  return (
    <g
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      data-layer="theta-hat"
      aria-hidden="true"
    >
      <line x1={x - 6} y1={y - 6} x2={x + 6} y2={y + 6} />
      <line x1={x - 6} y1={y + 6} x2={x + 6} y2={y - 6} />
    </g>
  );
}

/* ---------- the widget ---------- */

export default function SgdNoise({ params, initial, setParams, figureState }: WidgetProps<Params>) {
  const theme = useVizTheme();
  useFigureStateParams(figureState, paramsSchema.shape, setParams);

  const { n, eta, draws: K, replacement, seed, drawSeed } = params;
  const b = Math.min(params.batchSize, n);
  const problem = useMemo(() => makeProblem(n, seed), [n, seed]);
  const hat = useMemo(() => leastSquares(problem), [problem]);
  const H = useMemo(() => hessian(problem), [problem]);
  const [ox, oy] = params.probe;
  const probe: Vec2 = [hat[0] + ox, hat[1] + oy];
  const [px, py] = probe;

  const g = useMemo(() => fullGradient(problem, [px, py]), [problem, px, py]);
  const sigma1 = useMemo(() => singleExampleCovariance(problem, [px, py]), [problem, px, py]);
  const samples = useMemo(
    () => sampleMinibatchGradients(problem, [px, py], b, K, drawSeed, replacement),
    [problem, px, py, b, K, drawSeed, replacement],
  );
  const samples1 = useMemo(
    () =>
      b === 1 ? samples : sampleMinibatchGradients(problem, [px, py], 1, K, drawSeed, replacement),
    [samples, b, problem, px, py, K, drawSeed, replacement],
  );
  const mean = meanVec(samples);
  const spread = rmsSpread(samples, g);
  const spread1 = rmsSpread(samples1, g);
  const theory = theoreticalSpread(sigma1, n, b, replacement);
  const theory1 = theoreticalSpread(sigma1, n, 1, replacement);

  // Theoretical 2σ ellipse of the tips: Cov(θ − ηg_B) = η² Cov(g_B).
  const tipCov = minibatchCovariance(sigma1, n, b, replacement);
  const tipEig = eigenSymmetric2({
    a: eta * eta * tipCov.a,
    b: eta * eta * tipCov.b,
    c: eta * eta * tipCov.c,
  });
  const tipAngle = majorAxisAngle(tipEig);

  // Level sets of R̂: ½dᵀHd = c through the probe, scaled.
  const hEig = useMemo(() => eigenSymmetric2(H), [H]);
  const c0 = 0.5 * (H.a * ox * ox + 2 * H.b * ox * oy + H.c * oy * oy);
  const levels = [0.25, 0.5, 0.75, 1, 1.5].map((s) => Math.max(c0, 0.05) * s * s);

  /* ---------- path view ---------- */
  const isPath = params.view === 'path';
  const T = params.pathSteps;
  const sgd = useMemo(
    () => (isPath ? sgdPath(problem, [px, py], eta, b, T, drawSeed, replacement) : []),
    [isPath, problem, px, py, eta, b, T, drawSeed, replacement],
  );
  const gd = useMemo(
    () => (isPath ? gdPath(problem, [px, py], eta, T) : []),
    [isPath, problem, px, py, eta, T],
  );
  const player = useStepPlayer(
    T,
    `${n}|${seed}|${px}|${py}|${eta}|${b}|${T}|${drawSeed}|${replacement}|${params.view}`,
    60,
    Math.max(1, Math.round(T / 80)),
  );

  const set = useCallback(
    <K2 extends keyof Params>(key: K2) =>
      (value: Params[K2]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );
  const clampProbe = useCallback(
    (p: [number, number]): [number, number] => [
      Math.min(Math.max(p[0], hat[0] - WINDOW), hat[0] + WINDOW),
      Math.min(Math.max(p[1], hat[1] - WINDOW), hat[1] + WINDOW),
    ],
    [hat],
  );
  const moveProbe = useCallback(
    (p: [number, number]) => setParams({ probe: [snap(p[0] - hat[0]), snap(p[1] - hat[1])] }),
    [setParams, hat],
  );

  const tips = samples.map(([gx, gy]) => [px - eta * gx, py - eta * gy] as Vec2);
  const fullTip: Vec2 = [px - eta * g[0], py - eta * g[1]];
  const meanTip: Vec2 = [px - eta * mean[0], py - eta * mean[1]];
  const gap = Math.hypot(mean[0] - g[0], mean[1] - g[1]);

  const gradTex = `\\nabla \\hat R(\\htmlClass{sym-theta}{\\theta}) = (${tex(g[0])},\\ ${tex(g[1])})`;
  const meanTex = `\\bar g = \\tfrac{1}{${K}}\\textstyle\\sum_k g_{B_k} = (${tex(mean[0])},\\ ${tex(mean[1])})`;
  const spreadTex =
    `\\sqrt{\\tfrac{1}{${K}}\\textstyle\\sum_k \\lVert g_{B_k} - \\nabla\\hat R \\rVert^2} = ${tex(spread)},\\quad ` +
    `\\sqrt{\\tr \\Sigma_1 / b} = ${tex(theory)}` +
    (replacement ? '' : `\\ \\text{(}\\times\\sqrt{\\tfrac{n-b}{n-1}}\\text{)}`);

  const sgdFloor = isPath ? noiseFloor(sgd.slice(0, player.shown + 1), hat) : 0;
  const gdEnd = gd[Math.min(player.shown, gd.length - 1)] ?? probe;
  const gdDist = Math.hypot(gdEnd[0] - hat[0], gdEnd[1] - hat[1]);

  return (
    <div className="sgn" data-view={params.view} data-batch={b}>
      <div className="sgn-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{
            x: [hat[0] - WINDOW, hat[0] + WINDOW],
            y: [hat[1] - WINDOW, hat[1] + WINDOW],
            padding: 0,
          }}
          preserveAspectRatio="contain"
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian subdivisions={false} />
          {levels.map((c) => (
            <Ellipse
              key={c}
              center={[hat[0], hat[1]]}
              radius={[Math.sqrt((2 * c) / hEig.values[0]), Math.sqrt((2 * c) / hEig.values[1])]}
              angle={majorAxisAngle(hEig)}
              color={theme.viz[1]}
              fillOpacity={0}
              weight={1}
              strokeOpacity={0.6}
            />
          ))}
          <Cross at={hat} color={theme.positive} />
          {isPath ? (
            <>
              <PathLine
                points={gd.slice(0, player.shown + 1)}
                color={theme.fg}
                dashed
                layer="gd-path"
              />
              <PathLine
                points={sgd.slice(0, player.shown + 1)}
                color={theme.field.calculus}
                layer="sgd-path"
              />
            </>
          ) : (
            <>
              <Fan from={probe} tips={tips} color={theme.viz[0]} />
              {tipEig.values[0] > 0 ? (
                <Ellipse
                  center={[fullTip[0], fullTip[1]]}
                  radius={[
                    2 * Math.sqrt(Math.max(tipEig.values[0], 0)),
                    2 * Math.sqrt(Math.max(tipEig.values[1], 0)),
                  ]}
                  angle={tipAngle}
                  color={theme.viz[0]}
                  fillOpacity={0.06}
                  weight={1.25}
                  strokeStyle="dashed"
                />
              ) : null}
              {params.showMeanGradient ? (
                <Arrow from={probe} to={fullTip} color={theme.fg} layer="full-gradient" />
              ) : null}
              {/* Drawn last so the dashed average stays visible where it meets ∇R̂. */}
              <Arrow from={probe} to={meanTip} color={theme.field.ml} dashed layer="sample-mean" />
            </>
          )}
          <MovablePoint
            point={probe}
            onMove={moveProbe}
            constrain={clampProbe}
            color={theme.fg}
            fill={theme.surface}
            testId="sgn-probe"
            label={`Probe point θ at (${fmt(px)}, ${fmt(py)}). Arrow keys move it.`}
          />
        </Mafs>
        <p className="sgn-legend" aria-hidden="true">
          <span style={{ color: theme.positive }}>× θ̂ (least squares)</span>
          {isPath ? (
            <>
              <span style={{ color: theme.field.calculus }}>— SGD, constant η</span>
              <span>- - GD</span>
            </>
          ) : (
            <>
              <span style={{ color: theme.viz[0] }}>— steps −η g_B, 2σ ellipse</span>
              <span style={{ color: theme.field.ml }}>- - their average</span>
              {params.showMeanGradient ? <span>➜ −η ∇R̂</span> : null}
            </>
          )}
        </p>
      </div>

      <div className="sgn-panel">
        <Choice
          label="View"
          value={params.view}
          options={[
            { value: 'arrows', label: 'Gradients at a point' },
            { value: 'path', label: 'SGD path' },
          ]}
          onChange={set('view')}
        />
        <Param
          label="Batch size"
          tex="b"
          value={b}
          min={1}
          max={n}
          step={1}
          defaultValue={Math.min(initial.batchSize, n)}
          onChange={set('batchSize')}
        />
        {isPath ? (
          <>
            <PlayerControls player={player} total={T} />
            <p className="sgn-readout" role="status" data-testid="sgn-floor">
              RMS distance to θ̂ over the second half of the SGD path: {fmt(sgdFloor, 3)}; GD is{' '}
              {fmt(gdDist, 3)} away. The SGD floor grows with η and shrinks with b.
            </p>
          </>
        ) : (
          <>
            <Param
              label="Minibatches drawn"
              tex="K"
              value={K}
              min={1}
              max={400}
              step={1}
              defaultValue={initial.draws}
              onChange={set('draws')}
            />
            <div className="sgn-math" data-testid="sgn-readout">
              <MathLabel tex={gradTex} className="sgn-chip" />
              <MathLabel tex={meanTex} className="sgn-chip" />
              <MathLabel tex={spreadTex} className="sgn-chip" />
            </div>
            <p className="sgn-readout" role="status">
              Average vs full gradient: off by <strong data-testid="sgn-gap">{fmt(gap, 3)}</strong>.
              Spread <strong data-testid="sgn-spread">{fmt(spread, 3)}</strong>, which is{' '}
              <strong data-testid="sgn-ratio">{fmt(spread1 / Math.max(spread, 1e-12), 2)}</strong>×
              smaller than at b = 1 (theory √b = {fmt(theory1 / Math.max(theory, 1e-12), 2)}).
            </p>
          </>
        )}
        <div className="sgn-actions">
          <button
            type="button"
            className="widget-btn"
            onClick={() => setParams({ drawSeed: drawSeed + 1 })}
          >
            <RefreshCw size={14} aria-hidden="true" />
            New draws
          </button>
        </div>
      </div>

      <div className="sgn-controls">
        <div className="sgn-sliders">
          <Param
            label="Step size"
            tex="\eta"
            value={eta}
            min={0.01}
            max={0.5}
            step={0.01}
            defaultValue={initial.eta}
            onChange={set('eta')}
          />
          <Param
            label="Training examples"
            tex="n"
            value={n}
            min={10}
            max={400}
            step={10}
            defaultValue={initial.n}
            onChange={set('n')}
          />
        </div>
        <div className="sgn-toggles">
          <Toggle
            label="Full gradient ∇R̂"
            checked={params.showMeanGradient}
            onChange={set('showMeanGradient')}
          />
          <Toggle
            label="Sample with replacement"
            checked={replacement}
            onChange={set('replacement')}
          />
        </div>
      </div>
    </div>
  );
}
