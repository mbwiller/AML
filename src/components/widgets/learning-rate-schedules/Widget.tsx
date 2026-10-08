/**
 * `learning-rate-schedules` (lesson 2.5; rebuilds L5 p.11 and the
 * Robbins–Monro argument of der-2-5-8): gradient descent with a decaying
 * step size ηₜ on a loss whose gradient never exceeds G = 1. Three charts by
 * iteration t: the distance to the minimum, the step size ηₜ, and the
 * cumulative budget Σηₛ (with Σηₛ²) against the distance that has to be
 * covered. The selected schedule is drawn bold, the other three faint; a
 * table gives each schedule's infinite sums in closed form, whether it meets
 * the Robbins–Monro conditions, and where it ends up.
 *
 * React draws plain SVG via `MiniChart`; `math.ts` computes; colors come from
 * `useVizTheme()`. See README.md.
 */
import { useCallback, useId, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { MiniChart, type ChartSeries } from '../_shared/plot-kit/MiniChart';
import { PlayerControls } from '../_shared/plot-kit/PlayerControls';
import { useFigureStateParams } from '../_shared/plot-kit/useFigureStateParams';
import { useStepPlayer } from '../_shared/plot-kit/useStepPlayer';
import { useVizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { params as paramsSchema, type Params } from './manifest';
import {
  ARRIVAL_FRACTION,
  arrivalStep,
  infiniteSum,
  infiniteSumOfSquares,
  partialSums,
  robbinsMonro,
  runSchedule,
  SCHEDULES,
  stallDistance,
  stepSizes,
  type Schedule,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const LABEL: Record<Schedule, string> = {
  constant: 'η₀',
  inverse: 'η₀/(t+1)',
  'inverse-square': 'η₀/(t+1)²',
  exponential: 'η₀e^(−βt)',
};

const NAME: Record<Schedule, string> = {
  constant: 'Constant',
  inverse: 'Inverse',
  'inverse-square': 'Inverse-square',
  exponential: 'Exponential',
};

const FORMULA: Record<Schedule, string> = {
  constant: '\\eta_t = \\eta_0',
  inverse: '\\eta_t = \\tfrac{\\eta_0}{t + 1}',
  'inverse-square': '\\eta_t = \\tfrac{\\eta_0}{(t + 1)^2}',
  exponential: '\\eta_t = \\eta_0\\, e^{-\\beta t}',
};

/** Dash patterns so the four series differ by more than color (STYLE_GUIDE.md §8). */
const DASH: Record<Schedule, string | undefined> = {
  constant: '2 4',
  inverse: undefined,
  'inverse-square': '8 4',
  exponential: '5 2 1 2',
};

const fmt = (v: number, d = 2) => {
  if (!Number.isFinite(v)) return '∞';
  return (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d)).replace('-', '−');
};
const tex = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '\\infty');

interface Run {
  schedule: Schedule;
  etas: number[];
  sums: number[];
  squares: number[];
  dist: number[];
  arrived: number | null;
}

export default function LearningRateSchedules({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const tableId = useId();
  useFigureStateParams(figureState, paramsSchema.shape, setParams);
  const { schedule, eta0, beta, start: d0, steps: T } = params;

  const color: Record<Schedule, string> = {
    constant: theme.viz[1],
    inverse: theme.viz[0],
    'inverse-square': theme.viz[2],
    exponential: theme.viz[5],
  };

  const runs = useMemo(() => {
    const out = {} as Record<Schedule, Run>;
    for (const s of SCHEDULES) {
      const etas = stepSizes(s, eta0, beta, T);
      const its = runSchedule(s, eta0, beta, d0, T);
      out[s] = {
        schedule: s,
        etas,
        sums: partialSums(etas),
        squares: partialSums(etas.map((e) => e * e)),
        dist: its.map((theta) => Math.abs(theta)),
        arrived: arrivalStep(its, ARRIVAL_FRACTION * d0),
      };
    }
    return out;
  }, [eta0, beta, d0, T]);

  const stride = Math.max(1, Math.round(T / 100));
  const player = useStepPlayer(T, `${schedule}|${eta0}|${beta}|${d0}|${T}`, 45, stride);
  const shown = player.shown;

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );

  /** Downsample long series for drawing (every k-th point plus the last shown). */
  const pts = (ys: readonly number[], upTo: number): [number, number][] => {
    const k = Math.max(1, Math.floor(upTo / 300));
    const out: [number, number][] = [];
    for (let t = 0; t <= upTo && t < ys.length; t += k) out.push([t, ys[t] ?? 0]);
    const last = Math.min(upTo, ys.length - 1);
    if (out.at(-1)?.[0] !== last) out.push([last, ys[last] ?? 0]);
    return out;
  };

  const seriesFor = (pick: (r: Run) => number[]): ChartSeries[] => {
    const others = SCHEDULES.filter((s) => s !== schedule).map((s) => ({
      id: s,
      points: pts(pick(runs[s]), shown),
      color: color[s],
      width: 1.25,
      opacity: 0.45,
      dash: DASH[s],
    }));
    return [
      ...others,
      {
        id: schedule,
        points: pts(pick(runs[schedule]), shown),
        color: color[schedule],
        width: 3,
        dash: DASH[schedule],
      },
    ];
  };

  const sel = runs[schedule];
  const total = infiniteSum(schedule, eta0, beta);
  const totalSq = infiniteSumOfSquares(schedule, eta0, beta);
  const rm = robbinsMonro(schedule);
  const finalDist = sel.dist[T] ?? d0;
  const outcome =
    sel.arrived !== null
      ? `arrives within 10% of the starting distance at t = ${sel.arrived}`
      : Number.isFinite(total) && total < d0
        ? `stalls: Σηₜ = ${fmt(total)} < ${fmt(d0, 1)}, so it can never get closer than ${fmt(stallDistance(d0, total))}`
        : `still ${fmt(finalDist)} from θ* after ${T} steps (Σηₜ so far ${fmt(sel.sums[T] ?? 0)})`;

  const readouts = [
    FORMULA[schedule],
    `\\textstyle\\sum_{t \\ge 0} \\eta_t = ${tex(total)}`,
    `\\textstyle\\sum_{t \\ge 0} \\eta_t^2 = ${tex(totalSq, 3)}`,
  ];

  return (
    <div
      className="lrs"
      data-schedule={schedule}
      data-arrived={sel.arrived === null ? 'no' : 'yes'}
    >
      <div className="lrs-charts">
        <p className="lrs-caption">Distance to the minimum |θ(t) − θ*|</p>
        <MiniChart
          label={`Distance to the minimum by iteration; ${NAME[schedule]} schedule: ${outcome}.`}
          height={140}
          x={[0, T]}
          y={[0, 1.08 * d0]}
          testId="lrs-distance-chart"
          series={seriesFor((r) => r.dist)}
        />
        <p className="lrs-caption">Step size ηₜ</p>
        <MiniChart
          label={`Step size by iteration, starting at η₀ = ${fmt(eta0)}.`}
          height={84}
          x={[0, T]}
          y={[0, 1.08 * eta0]}
          testId="lrs-eta-chart"
          series={seriesFor((r) => r.etas)}
        />
        {params.showCumulative ? (
          <>
            <p className="lrs-caption">
              Cumulative Σ<sub>s&lt;t</sub> ηₛ (solid) and Σ<sub>s&lt;t</sub> ηₛ² (thin) against the
              distance to cover
            </p>
            <MiniChart
              label={`Cumulative step sizes for the ${NAME[schedule]} schedule against the distance ${fmt(d0, 1)} to the minimum.`}
              height={130}
              x={[0, T]}
              y={[0, 2 * d0]}
              testId="lrs-cumulative-chart"
              rules={[
                {
                  y: d0,
                  color: theme.fg,
                  dash: '6 3',
                  label: `distance to cover = ${fmt(d0, 1)}`,
                },
              ]}
              series={[
                ...seriesFor((r) => r.sums),
                {
                  id: `${schedule}-squares`,
                  points: pts(sel.squares, shown),
                  color: color[schedule],
                  width: 1.25,
                },
              ]}
            />
          </>
        ) : null}
      </div>

      <div className="lrs-panel">
        <Choice
          label="Schedule"
          value={schedule}
          options={SCHEDULES.map((s) => ({ value: s, label: `${NAME[s]} ${LABEL[s]}` }))}
          onChange={set('schedule')}
        />
        <div className="lrs-math" data-testid="lrs-readout">
          {readouts.map((t) => (
            <MathLabel key={t} tex={t} className="lrs-chip" />
          ))}
        </div>
        <p className="lrs-outcome" role="status" data-testid="lrs-outcome">
          {NAME[schedule]}: {outcome}.
        </p>
        <Param
          label="Initial step size"
          tex="\eta_0"
          value={eta0}
          min={0.1}
          max={3}
          step={0.05}
          defaultValue={initial.eta0}
          onChange={set('eta0')}
        />
        <Param
          label="Starting distance"
          tex="|\theta^{(0)} - \theta^\star|"
          value={d0}
          min={1}
          max={30}
          step={0.5}
          defaultValue={initial.start}
          onChange={set('start')}
        />
        <div className="lrs-sliders">
          <Param
            label="Decay rate"
            tex="\beta"
            value={beta}
            min={0.01}
            max={1}
            step={0.01}
            defaultValue={initial.beta}
            onChange={set('beta')}
          />
          <Param
            label="Iterations"
            tex="T"
            value={T}
            min={20}
            max={1000}
            step={10}
            defaultValue={initial.steps}
            onChange={set('steps')}
          />
        </div>
        <Toggle
          label="Cumulative sums"
          checked={params.showCumulative}
          onChange={set('showCumulative')}
        />
        <PlayerControls player={player} total={T} unit="Iteration" />
      </div>

      <div className="lrs-controls">
        <p className="lrs-caption" id={tableId}>
          Robbins–Monro: Σηₜ = ∞ and Σηₜ² &lt; ∞ (gradient bounded by G = 1)
        </p>
        <div className="lrs-table-wrap">
          <table className="lrs-table" data-testid="lrs-table" aria-labelledby={tableId}>
            <thead>
              <tr>
                <th scope="col">Schedule</th>
                <th scope="col">Σηₜ</th>
                <th scope="col">Σηₜ²</th>
                <th scope="col">Both?</th>
                <th scope="col">After {T} steps</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULES.map((s) => {
                const r = runs[s];
                const both = robbinsMonro(s);
                return (
                  <tr key={s} aria-current={s === schedule ? 'true' : undefined}>
                    <th scope="row">
                      <svg width="22" height="10" aria-hidden="true" className="lrs-key">
                        <line
                          x1="1"
                          x2="21"
                          y1="5"
                          y2="5"
                          stroke={color[s]}
                          strokeWidth={3}
                          strokeDasharray={DASH[s]}
                        />
                      </svg>
                      {NAME[s]}
                    </th>
                    <td>{fmt(infiniteSum(s, eta0, beta))}</td>
                    <td>{fmt(infiniteSumOfSquares(s, eta0, beta), 3)}</td>
                    <td>{both.sumDiverges && both.squaresConverge ? 'yes' : 'no'}</td>
                    <td data-testid={`lrs-result-${s}`}>
                      {r.arrived !== null
                        ? `arrived (t = ${r.arrived})`
                        : `${fmt(r.dist[T] ?? d0)} away`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="lrs-note">
          {rm.sumDiverges ? '' : 'Finite Σηₜ: the iterates stay within G·Σηₜ of θ(0). '}
          Loss: E(θ) = √(1 + θ²) − 1, slope below 1 everywhere, curvature 1 at θ* = 0.
        </p>
      </div>
    </div>
  );
}
