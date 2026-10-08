/**
 * `mse-bowl-gd` (lessons 1.4 and 2.4; rebuilds L4 pp.37–41 and 44–46 and the Lecture
 * 4 companion's gradient-descent run, cells 18–23): the contours of the
 * empirical risk R̂(θ_bmi, θ_one) of the companion's 20 patients, the
 * gradient-descent path from θ⁽⁰⁾ with play / step / run-to-stop controls,
 * the least-squares minimum, the iteration count under the chosen stopping
 * rule, and a standardization toggle that turns the long flat valley
 * (κ ≈ 474) into a round bowl (κ = 1), with the iteration counts of both
 * side by side. Optionally the data with the current line and residuals.
 *
 * Plain SVG at the measured width with equal units on both axes, so the
 * ellipses have their true shape (`geometry.ts`, shared with the fallback);
 * math in `math.ts`; colors only from `useVizTheme()`. See README.md.
 */
import { Pause, Play, SkipForward, StepForward, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { z } from 'zod';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { useVizTheme } from '../_shared/useVizTheme';
import { fixed, formatTick, linearScale, pathData } from '../line-fit-playground/plot';
import { useElementWidth } from '../line-fit-playground/useElementWidth';
import type { WidgetProps } from '../types';
import {
  bowlFrame,
  contourPolylines,
  pathPixels,
  stepDots,
  windowPoints,
  type BowlFrame,
} from './geometry';
import { ETA_RANGE, INIT_RANGE, LOG_TOLERANCE_RANGE, type Params } from './manifest';
import {
  iterate,
  risk,
  STOPPING_RULES,
  toRawCoordinates,
  type StoppingRule,
  type Vec2,
} from './math';
import { bowlModel, type BowlModel } from './model';
import './styles.css';

export { manifest } from './manifest';

/** Bowl height: taller beside the side panel (two columns), shorter on phones. */
const BOWL_HEIGHT = { wide: 380, narrow: 280 } as const;
const FIT_HEIGHT = 150;
/** Runs of at most this many iterations play one step per STEP_MS; longer runs play in log time. */
const LINEAR_MAX = 60;
const STEP_MS = 80;
const LOG_DURATION_MS = 5000;

/** What a `<Step figureState>` may send; unknown keys are ignored. */
const figureStateSchema = z.looseObject({
  eta: z.number().positive().max(2).optional(),
  standardize: z.boolean().optional(),
  stopping: z.enum(STOPPING_RULES).optional(),
  tolerance: z.number().positive().max(1).optional(),
  init: z.tuple([z.number().min(-20).max(20), z.number().min(-20).max(20)]).optional(),
  showResiduals: z.boolean().optional(),
});

const RULE_LABEL: Record<StoppingRule, string> = {
  'parameter-change': 'Parameter change',
  'gradient-norm': 'Gradient norm',
  'loss-change': 'Loss change',
};

const RULE_TEST: Record<StoppingRule, string> = {
  'parameter-change': '‖θ⁽ᵗ⁺¹⁾ − θ⁽ᵗ⁾‖',
  'gradient-norm': '‖∇R̂(θ⁽ᵗ⁾)‖',
  'loss-change': '|R̂(θ⁽ᵗ⁺¹⁾) − R̂(θ⁽ᵗ⁾)|',
};

const count = (n: number) => n.toLocaleString('en-US');
const sci = (v: number) => {
  const e = Math.log10(v);
  return Number.isInteger(e) ? `1e${fixed(e, 0)}` : minusExp(v.toExponential(1));
};
function minusExp(text: string) {
  return text.replace('e-', 'e−').replace('e+', 'e');
}

function iterationAt(ms: number, n: number): number {
  if (n <= LINEAR_MAX) return Math.floor(ms / STEP_MS);
  return Math.round((n + 1) ** Math.min(1, ms / LOG_DURATION_MS)) - 1;
}

function timeFor(t: number, n: number): number {
  if (n <= LINEAR_MAX) return t * STEP_MS;
  return (LOG_DURATION_MS * Math.log(t + 1)) / Math.log(n + 1);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function statusText(m: BowlModel, p: Params): string {
  const run = m.run;
  if (run.status === 'converged') {
    return `Stopped after ${count(run.iterations)} iterations: ${RULE_TEST[p.stopping]} ≤ ${sci(p.tolerance)}.`;
  }
  if (run.status === 'diverged') {
    return `Diverged at iteration ${count(run.iterations)}: η = ${fixed(p.eta, 2)} is above 2/λ_max = ${fixed(2 / m.lambdaMax, 3)}.`;
  }
  return `No stop within ${count(run.iterations)} iterations (the cap).`;
}

function BowlPlot({
  fr,
  model,
  t,
  init,
  feature,
  summary,
}: {
  fr: BowlFrame;
  model: BowlModel;
  t: number;
  init: Vec2;
  feature: string;
  summary: string;
}) {
  const theme = useVizTheme();
  const clipId = useId();
  const { inner } = fr;
  const contours = useMemo(
    () => contourPolylines(fr, model.h, model.star),
    // fr changes identity every render; its domain and size determine the contours.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fr.sx.domain[0], fr.sx.domain[1], fr.sy.domain[0], fr.sy.domain[1], fr.width, model],
  );
  const path = pathPixels(fr, model.run, t);
  const dots = stepDots(fr, model.run, t);
  const cur = iterate(model.run, t);
  const clampPx = (v: number) => Math.max(-1e4, Math.min(1e4, v));
  const cx = clampPx(fr.sx(cur[0]));
  const cy = clampPx(fr.sy(cur[1]));
  const sx = fr.sx(model.star[0]);
  const sy = fr.sy(model.star[1]);

  return (
    <svg
      width={fr.width}
      height={fr.height}
      viewBox={`0 0 ${fr.width} ${fr.height}`}
      role="img"
      aria-label={summary}
      className="mbg-svg"
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
        <rect
          x={inner.x0}
          y={inner.y0}
          width={inner.x1 - inner.x0}
          height={inner.y1 - inner.y0}
          fill="none"
          stroke={theme.border}
        />
        {fr.xTicks.map((v) => (
          <text key={`x${v}`} x={fr.sx(v)} y={inner.y1 + 15} textAnchor="middle">
            {formatTick(v, fr.xStep)}
          </text>
        ))}
        {fr.yTicks.map((v) => (
          <text key={`y${v}`} x={inner.x0 - 6} y={fr.sy(v) + 4} textAnchor="end">
            {formatTick(v, fr.yStep)}
          </text>
        ))}
        <text x={(inner.x0 + inner.x1) / 2} y={fr.height - 4} textAnchor="middle">
          θ
          <tspan baselineShift="sub" fontSize={9}>
            {feature}
          </tspan>
        </text>
        <text
          transform={`translate(11 ${(inner.y0 + inner.y1) / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          θ
          <tspan baselineShift="sub" fontSize={9}>
            one
          </tspan>
        </text>
      </g>
      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        <g data-layer="contours" fill="none" stroke={theme.viz[1]} strokeOpacity={0.55}>
          {contours.map((pts, i) => (
            <path key={i} d={pathData(pts, true)} />
          ))}
        </g>
        <path
          data-layer="path"
          d={pathData(path.map(([x, y]) => [clampPx(x), clampPx(y)] as const))}
          fill="none"
          stroke={theme.viz[3]}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <g data-layer="steps" fill={theme.viz[3]}>
          {dots.map(([x, y], i) => (
            <circle key={i} cx={clampPx(x)} cy={clampPx(y)} r={2.25} />
          ))}
        </g>
      </g>
      <g aria-hidden="true">
        <circle
          data-layer="start"
          cx={fr.sx(init[0])}
          cy={fr.sy(init[1])}
          r={5}
          fill={theme.surface}
          stroke={theme.fg}
          strokeWidth={1.5}
        />
        <g data-layer="minimum" stroke={theme.fg} strokeWidth={2} strokeLinecap="round">
          <line x1={sx - 6} y1={sy - 6} x2={sx + 6} y2={sy + 6} />
          <line x1={sx - 6} y1={sy + 6} x2={sx + 6} y2={sy - 6} />
        </g>
        <circle
          data-layer="current"
          cx={cx}
          cy={cy}
          r={5}
          fill={theme.viz[3]}
          stroke={theme.surface}
          strokeWidth={1.5}
        />
      </g>
    </svg>
  );
}

function FitPlot({ model, theta, width }: { model: BowlModel; theta: Vec2; width: number }) {
  const theme = useVizTheme();
  const clipId = useId();
  const m = { top: 6, right: 8, bottom: 30, left: 40 };
  const sx = linearScale([-0.09, 0.1], [m.left, width - m.right]);
  const sy = linearScale([0, 1.1], [FIT_HEIGHT - m.bottom, m.top]);
  const xs = [-0.05, 0, 0.05];
  const xStep = 0.05;
  const ys = [0, 0.5, 1];
  const line = theta;
  const yAt = (x: number) => line[0] * x + line[1];
  return (
    <svg
      width={width}
      height={FIT_HEIGHT}
      viewBox={`0 0 ${width} ${FIT_HEIGHT}`}
      className="mbg-svg"
      role="img"
      aria-label={`The 20 patients with the current line: slope ${fixed(line[0], 3)}, intercept ${fixed(line[1], 3)}.`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={m.left}
            y={m.top}
            width={width - m.left - m.right}
            height={FIT_HEIGHT - m.top - m.bottom}
          />
        </clipPath>
      </defs>
      <g aria-hidden="true" fontSize={10} fill={theme.muted}>
        {ys.map((v) => (
          <g key={v}>
            <line x1={m.left} x2={width - m.right} y1={sy(v)} y2={sy(v)} stroke={theme.border} />
            <text x={m.left - 5} y={sy(v) + 3.5} textAnchor="end">
              {formatTick(v, 0.5)}
            </text>
          </g>
        ))}
        {xs.map((v) => (
          <text key={v} x={sx(v)} y={FIT_HEIGHT - m.bottom + 13} textAnchor="middle">
            {formatTick(v, xStep)}
          </text>
        ))}
        <text x={(m.left + width - m.right) / 2} y={FIT_HEIGHT - 3} textAnchor="middle">
          bmi (scaled) → progression / 300
        </text>
      </g>
      <g clipPath={`url(#${clipId})`} aria-hidden="true">
        <g data-layer="fit-residuals" stroke={theme.viz[4]} strokeWidth={1.25}>
          {model.raw.x.map((x, i) => (
            <line key={i} x1={sx(x)} x2={sx(x)} y1={sy(model.raw.y[i] as number)} y2={sy(yAt(x))} />
          ))}
        </g>
        <line
          data-layer="fit-line"
          x1={sx(-0.09)}
          y1={sy(yAt(-0.09))}
          x2={sx(0.1)}
          y2={sy(yAt(0.1))}
          stroke={theme.viz[5]}
          strokeWidth={2}
        />
      </g>
      <g data-layer="fit-points" fill={theme.viz[0]} aria-hidden="true">
        {model.raw.x.map((x, i) => (
          <circle key={i} cx={sx(x)} cy={sy(model.raw.y[i] as number)} r={3} />
        ))}
      </g>
    </svg>
  );
}

export default function MseBowlGd({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const [bowlRef, bowlWidth] = useElementWidth<HTMLDivElement>(520);
  const [sideRef, sideWidth] = useElementWidth<HTMLDivElement>(300);

  const model = useMemo(() => bowlModel(params), [params]);
  const n = model.run.iterations;
  const runKey = [
    params.dataset,
    params.standardize,
    params.eta,
    params.init[0],
    params.init[1],
    params.stopping,
    params.tolerance,
    params.maxIterations,
  ].join('|');

  const [cursor, setCursor] = useState<{ key: string; t: number } | null>(null);
  const [playing, setPlaying] = useState<{ key: string; from: number } | null>(null);
  const t = cursor && cursor.key === runKey ? Math.min(cursor.t, n) : n;
  const isPlaying = playing !== null && playing.key === runKey;

  useEffect(() => {
    if (!playing || playing.key !== runKey) return;
    let raf = 0;
    let start: number | null = null;
    const offset = timeFor(playing.from, n);
    const tick = (now: number) => {
      if (start === null) start = now - offset;
      const next = Math.min(n, iterationAt(now - start, n));
      setCursor({ key: runKey, t: next });
      if (next >= n) {
        setPlaying(null);
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing, runKey, n]);

  // A `<Step figureState>` reveal: apply the params it names.
  useEffect(() => {
    const parsed = figureStateSchema.safeParse(figureState);
    if (!parsed.success) return;
    const patch: Partial<Params> = {};
    const s = parsed.data;
    if (s.eta !== undefined) patch.eta = s.eta;
    if (s.standardize !== undefined) patch.standardize = s.standardize;
    if (s.stopping !== undefined) patch.stopping = s.stopping;
    if (s.tolerance !== undefined) patch.tolerance = s.tolerance;
    if (s.init !== undefined) patch.init = s.init;
    if (s.showResiduals !== undefined) patch.showResiduals = s.showResiduals;
    if (Object.keys(patch).length > 0) setParams(patch);
  }, [figureState, setParams]);

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );

  const play = () => {
    if (isPlaying) {
      setPlaying(null);
      return;
    }
    if (prefersReducedMotion()) {
      setCursor({ key: runKey, t: n });
      return;
    }
    setPlaying({ key: runKey, from: t >= n ? 0 : t });
    if (t >= n) setCursor({ key: runKey, t: 0 });
  };
  const step = () => {
    setPlaying(null);
    setCursor({ key: runKey, t: t >= n ? 0 : t + 1 });
  };
  const toEnd = () => {
    setPlaying(null);
    setCursor({ key: runKey, t: n });
  };
  const restart = () => {
    setPlaying(null);
    setCursor({ key: runKey, t: 0 });
  };

  const feature = params.standardize ? 'z' : 'bmi';
  const theta = iterate(model.run, t);
  const thetaRisk = risk(model.data, theta);
  const rawTheta = params.standardize ? toRawCoordinates(theta, model.standardization) : theta;
  const rawStar = params.standardize
    ? toRawCoordinates(model.star, model.standardization)
    : model.star;

  const fr = bowlFrame(
    windowPoints(model.run, params.init, model.star),
    bowlWidth,
    bowlWidth < 480 ? BOWL_HEIGHT.narrow : BOWL_HEIGHT.wide,
  );
  const status = statusText(model, params);
  const summary =
    `Contours of the mean squared error over θ_${feature} and θ_one, with the gradient-descent ` +
    `path at iteration ${count(t)} of ${count(n)}. ${status}`;

  const h = model.h;
  const updateTex =
    `\\htmlClass{sym-theta}{\\theta}^{(t+1)} = \\htmlClass{sym-theta}{\\theta}^{(t)} - ` +
    `\\htmlClass{sym-eta}{\\eta}\\,\\nabla_\\theta \\hat R(\\htmlClass{sym-theta}{\\theta}^{(t)}),\\quad ` +
    `\\htmlClass{sym-eta}{\\eta} = ${fixed(params.eta, 2)}`;
  const hessianTex = `H = \\tfrac{2}{n}X\\T X = \\begin{bmatrix} ${fixed(h.a, 4)} & ${fixed(h.b, 4)} \\\\ ${fixed(h.b, 4)} & ${fixed(h.c, 4)} \\end{bmatrix}`;
  const kappaTex = `\\kappa(H) = \\lambda_{\\max} / \\lambda_{\\min} = ${model.kappa >= 100 ? fixed(model.kappa, 0) : fixed(model.kappa, 2)}`;
  const otherStatus =
    model.other.run.status === 'converged'
      ? `${count(model.other.run.iterations)} iterations`
      : model.other.run.status === 'diverged'
        ? `diverges at iteration ${count(model.other.run.iterations)}`
        : `no stop within ${count(model.other.run.iterations)} iterations`;
  const otherName = params.standardize ? 'the raw bmi feature' : 'the standardized feature';
  const kappaOther =
    model.other.kappa >= 100 ? fixed(model.other.kappa, 0) : fixed(model.other.kappa, 2);

  const logTol = Math.log10(params.tolerance);

  return (
    <div
      className="mbg"
      data-standardize={params.standardize ? 'true' : 'false'}
      data-status={model.run.status}
      data-iterations={n}
      data-t={t}
      data-playing={isPlaying ? 'true' : 'false'}
      data-theta={`${theta[0]},${theta[1]}`}
    >
      <div className="mbg-bowl" ref={bowlRef}>
        <BowlPlot
          fr={fr}
          model={model}
          t={t}
          init={params.init}
          feature={feature}
          summary={summary}
        />
        <p className="mbg-legend" aria-hidden="true">
          <span>○ start θ⁽⁰⁾</span>
          <span>× least squares θ̂</span>
          <span style={{ color: theme.viz[3] }}>— gradient-descent path</span>
          <span style={{ color: theme.viz[1] }}>◯ level sets of the MSE (each 0.4× the last)</span>
        </p>
      </div>

      <div className="mbg-side" ref={sideRef}>
        <div className="mbg-math">
          <MathLabel tex={updateTex} display />
          <MathLabel tex={hessianTex} display />
          <MathLabel tex={kappaTex} display />
        </div>
        <p className="mbg-status" role="status" data-testid="mbg-status">
          {status}
        </p>
        <table className="mbg-table" data-testid="mbg-readout">
          <thead>
            <tr>
              <th scope="col">
                <span className="mbg-sr">Point</span>
              </th>
              <th scope="col">θ_{feature}</th>
              <th scope="col">θ_one</th>
              <th scope="col">MSE</th>
            </tr>
          </thead>
          <tbody>
            <tr data-testid="mbg-current">
              <th scope="row">θ⁽ᵗ⁾</th>
              <td>{fixed(theta[0], 4)}</td>
              <td>{fixed(theta[1], 4)}</td>
              <td>{thetaRisk.toFixed(6)}</td>
            </tr>
            <tr data-testid="mbg-star">
              <th scope="row">θ̂</th>
              <td>{fixed(model.star[0], 4)}</td>
              <td>{fixed(model.star[1], 4)}</td>
              <td>{model.starRisk.toFixed(6)}</td>
            </tr>
          </tbody>
        </table>
        {params.standardize ? (
          <p className="mbg-note" data-testid="mbg-raw-units">
            In raw bmi units: θ⁽ᵗ⁾ is slope {fixed(rawTheta[0], 4)}, intercept{' '}
            {fixed(rawTheta[1], 4)}; θ̂ is {fixed(rawStar[0], 4)}, {fixed(rawStar[1], 4)}.
          </p>
        ) : null}
        <p className="mbg-note" data-testid="mbg-compare">
          Same η, start, and rule on {otherName} (κ = {kappaOther}): {otherStatus}.
        </p>
        {params.showResiduals ? (
          <FitPlot model={model} theta={rawTheta} width={Math.max(200, sideWidth)} />
        ) : null}
      </div>

      <div className="mbg-controls">
        <div className="mbg-transport" role="group" aria-label="Playback">
          <button type="button" className="widget-btn" onClick={play}>
            {isPlaying ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="widget-btn" onClick={step}>
            <StepForward size={14} aria-hidden="true" />
            Step
          </button>
          <button type="button" className="widget-btn" onClick={toEnd} disabled={t >= n}>
            <SkipForward size={14} aria-hidden="true" />
            Run to stop
          </button>
          <button type="button" className="widget-btn" onClick={restart} disabled={t === 0}>
            <RotateCcw size={14} aria-hidden="true" />
            Restart path
          </button>
        </div>
        <Param
          label="Iteration"
          tex="t"
          value={t}
          min={0}
          max={Math.max(1, n)}
          step={1}
          defaultValue={n}
          onChange={(v) => {
            setPlaying(null);
            setCursor({ key: runKey, t: v });
          }}
          format={(v) => count(v)}
        />
        <div className="mbg-sliders">
          <Param
            label="Learning rate"
            tex="\eta"
            value={params.eta}
            min={ETA_RANGE.min}
            max={ETA_RANGE.max}
            step={ETA_RANGE.step}
            defaultValue={initial.eta}
            onChange={set('eta')}
          />
          <Param
            label="Tolerance"
            tex="\epsilon"
            value={logTol}
            min={LOG_TOLERANCE_RANGE.min}
            max={LOG_TOLERANCE_RANGE.max}
            step={LOG_TOLERANCE_RANGE.step}
            defaultValue={Math.log10(initial.tolerance)}
            onChange={(v) => setParams({ tolerance: 10 ** v })}
            format={(v) => sci(10 ** v)}
          />
          <Param
            label={`Start θ_${feature}`}
            tex={`\\theta^{(0)}_{\\text{${feature}}}`}
            value={params.init[0]}
            min={INIT_RANGE.x.min}
            max={INIT_RANGE.x.max}
            step={INIT_RANGE.x.step}
            defaultValue={initial.init[0]}
            onChange={(v) => setParams({ init: [v, params.init[1]] })}
          />
          <Param
            label="Start θ_one"
            tex="\theta^{(0)}_{\text{one}}"
            value={params.init[1]}
            min={INIT_RANGE.one.min}
            max={INIT_RANGE.one.max}
            step={INIT_RANGE.one.step}
            defaultValue={initial.init[1]}
            onChange={(v) => setParams({ init: [params.init[0], v] })}
          />
        </div>
        <div className="mbg-choices">
          <Choice
            label="Stopping rule"
            value={params.stopping}
            options={STOPPING_RULES.map((r) => ({ value: r, label: RULE_LABEL[r] }))}
            onChange={set('stopping')}
          />
          <div className="mbg-toggles">
            <Toggle
              label="Standardize bmi"
              checked={params.standardize}
              onChange={set('standardize')}
            />
            <Toggle
              label="Data and residuals"
              checked={params.showResiduals}
              onChange={set('showResiduals')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
