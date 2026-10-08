/**
 * `true-vs-empirical-risk` (lesson 2.2; L4 pp.5–10, true risk vs the
 * empirical error): the constant model f_θ(x) = θ on one VASCO arm. Top:
 * the true risk R(θ) (closed form from the generative model) and the
 * training risk R̂(θ) on n patients, as curves over θ, with their minimizers
 * θ* and θ̂ and the gap R(θ̂) − R̂(θ̂). "Resample" draws a fresh training
 * set, so R̂ wobbles around R. Bottom: one dot per training set for
 * R̂(θ) − R(θ) at the scored θ, with its running mean against the
 * expected value (0 for a θ fixed in advance, −2σ²/n for θ̂ = ȳ).
 *
 * Plain SVG; the math is in `math.ts`, panel geometry in `fallback.ts`.
 * Colors only from `useVizTheme()`. See README.md.
 */
import { Shuffle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { PlotAxes } from '../_shared/PlotAxes';
import {
  formatNumber,
  frameScales,
  linearScale,
  polylinePath,
  sampleCurve,
} from '../_shared/plot-scale';
import { useVizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { trialArm } from './data';
import { HISTORY_PANEL, RISK_MAX, RISK_PANEL, thetaDomain } from './fallback';
import { params as paramsSchema, type Params } from './manifest';
import {
  armTruth,
  empiricalRisk,
  expectedGap,
  mean,
  sampleStats,
  scoreDraw,
  scoredTheta,
  trainingSet,
  trueRisk,
  type DrawRecord,
  type ThetaMode,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const figureStateSchema = paramsSchema.partial();
const MAX_HISTORY = 2000;
const BATCH = 100;

const fmt = (v: number) => formatNumber(v, 2);

const MODE_OPTIONS: readonly { value: ThetaMode; label: string }[] = [
  { value: 'true-mean', label: 'true mean θ*' },
  { value: 'fixed', label: 'θ fixed by the slider' },
  { value: 'fitted', label: 'fitted mean ȳ' },
];

/** Half-width of the history axis: about four standard deviations of R̂(θ*). */
function historyHalfWidth(variance: number, n: number): number {
  const sd = variance * Math.sqrt(2 / n);
  return Math.max(20, Math.ceil((4 * sd) / 10) * 10);
}

/** Deterministic vertical spread for the history dots. */
const spread = (i: number) => ((((i * 0.7548776662) % 1) + 1) % 1) * 2 - 1;

interface History {
  key: string;
  lastDraw: number;
  records: DrawRecord[];
}

export default function TrueVsEmpiricalRisk({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const { arm, n, seed, draw, thetaMode, thetaOffset } = params;
  const truth = useMemo(() => armTruth(arm), [arm]);
  const trial = trialArm(arm);

  const sample = useMemo(
    () => trainingSet(arm, n, seed, draw, trial.ys),
    [arm, n, seed, draw, trial.ys],
  );
  const stats = useMemo(() => sampleStats(sample.ys), [sample]);
  const theta = scoredTheta(thetaMode, truth, stats, thetaOffset);

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );

  // A revealed <Step figureState> may set any param.
  useEffect(() => {
    if (!figureState || typeof figureState !== 'object') return;
    const parsed = figureStateSchema.safeParse(figureState);
    if (parsed.success) {
      const patch = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      ) as Partial<Params>;
      if (Object.keys(patch).length > 0) setParams(patch);
    }
  }, [figureState, setParams]);

  // The record of every training set drawn under the current settings. It
  // restarts (with just the current draw) whenever the settings change or the
  // draw index moves other than by the resample buttons (reset, state link).
  const key = `${arm}|${n}|${seed}|${thetaMode}|${thetaOffset}`;
  const current = useMemo(
    () => scoreDraw(draw, sample.ys, truth, thetaMode, thetaOffset),
    [draw, sample, truth, thetaMode, thetaOffset],
  );
  const [history, setHistory] = useState<History>(() => ({
    key,
    lastDraw: draw,
    records: [current],
  }));
  if (history.key !== key || history.lastDraw !== draw) {
    setHistory({ key, lastDraw: draw, records: [current] });
  }

  const resample = (count: number) => {
    const fresh: DrawRecord[] = [];
    for (let k = 1; k <= count; k++) {
      const d = draw + k;
      const { ys } = trainingSet(arm, n, seed, d, trial.ys);
      fresh.push(scoreDraw(d, ys, truth, thetaMode, thetaOffset));
    }
    const records = [...history.records, ...fresh].slice(-MAX_HISTORY);
    setHistory({ key, lastDraw: draw + count, records });
    setParams({ draw: draw + count });
  };

  /* ---------- risk curves ---------- */
  const domain = thetaDomain(truth);
  const risk = frameScales(RISK_PANEL, domain, [0, RISK_MAX]);
  const curve = (f: (t: number) => number) =>
    polylinePath(sampleCurve(f, domain[0], domain[1], 160), risk.x, risk.y);
  const inDomain = (t: number) => t >= domain[0] && t <= domain[1];
  const thetaHat = stats.mean;
  const trainAtHat = empiricalRisk(stats, thetaHat);
  const trueAtHat = trueRisk(truth, thetaHat);
  const trainAtTheta = empiricalRisk(stats, theta);
  const trueAtTheta = trueRisk(truth, theta);
  /** Is θ̂ left of θ*? Labels go on the outside of the pair. */
  const hatLeft = thetaHat < truth.mean;

  /* ---------- history ---------- */
  const half = historyHalfWidth(truth.variance, n);
  const hx = linearScale(
    [-half, half],
    [HISTORY_PANEL.margin.left, HISTORY_PANEL.width - HISTORY_PANEL.margin.right],
  );
  const hFrame = {
    x: hx,
    y: linearScale(
      [-1, 1],
      [HISTORY_PANEL.height - HISTORY_PANEL.margin.bottom, HISTORY_PANEL.margin.top],
    ),
  };
  const diffs = history.records.map((r) => r.train - r.true);
  const meanDiff = mean(diffs);
  const expected = expectedGap(thetaMode, truth, n);
  const clampX = (v: number) => Math.min(half, Math.max(-half, v));

  const axisColor = { grid: theme.border, text: theme.fg, muted: theme.muted };
  const trueColor = theme.viz[0];
  const trainColor = theme.viz[5];
  const sourceLabel = sample.fromTrial
    ? n === trial.ys.length
      ? `the trial’s ${n} ${arm} patients`
      : `the first ${n} of the trial’s ${arm} patients`
    : `fresh training set #${draw} from the generative model`;

  return (
    <div className="tver" data-theta-mode={thetaMode} data-draw={draw}>
      <div className="tver-top">
        <figure className="tver-panel">
          <figcaption className="tver-caption">
            Risk of the constant model f<sub>θ</sub>(x) = θ, {n} patients: {sourceLabel}
          </figcaption>
          <svg
            viewBox={`0 0 ${RISK_PANEL.width} ${RISK_PANEL.height}`}
            className="tver-svg"
            role="img"
            aria-label={`True risk R(θ) with minimum ${fmt(truth.variance)} at θ* = ${fmt(truth.mean)}, and training risk R̂(θ) with minimum ${fmt(trainAtHat)} at θ̂ = ${fmt(thetaHat)}`}
            data-testid="tver-risk"
          >
            <PlotAxes
              frame={RISK_PANEL}
              x={risk.x}
              y={risk.y}
              xStep={5}
              yStep={50}
              xTitle="θ, the predicted ΔSBP (mmHg)"
              yTitle="risk (mmHg²)"
              color={axisColor}
            />
            {params.showTrainingRisk ? (
              <g stroke={trainColor} aria-hidden="true" data-layer="rug">
                {sample.ys.filter(inDomain).map((v, i) => (
                  <line key={i} x1={risk.x(v)} x2={risk.x(v)} y1={risk.y(0)} y2={risk.y(0) - 7} />
                ))}
              </g>
            ) : null}
            {params.showTrueRisk ? (
              <g data-layer="true-risk">
                <path
                  d={curve((t) => trueRisk(truth, t))}
                  fill="none"
                  stroke={trueColor}
                  strokeWidth={2.5}
                  strokeDasharray="7 4"
                />
                <line
                  x1={risk.x(truth.mean)}
                  x2={risk.x(truth.mean)}
                  y1={risk.y(0)}
                  y2={risk.y(truth.variance)}
                  stroke={trueColor}
                  strokeDasharray="2 3"
                />
                <text
                  x={risk.x(truth.mean) + (hatLeft ? 5 : -5)}
                  y={risk.y(truth.variance * 0.4)}
                  textAnchor={hatLeft ? 'start' : 'end'}
                  fontSize={13}
                  fill={trueColor}
                  aria-hidden="true"
                >
                  θ*
                </text>
              </g>
            ) : null}
            {params.showTrainingRisk ? (
              <g data-layer="training-risk">
                <path
                  d={curve((t) => empiricalRisk(stats, t))}
                  fill="none"
                  stroke={trainColor}
                  strokeWidth={2.5}
                />
                {inDomain(thetaHat) ? (
                  <line
                    x1={risk.x(thetaHat)}
                    x2={risk.x(thetaHat)}
                    y1={risk.y(0)}
                    y2={risk.y(Math.min(trainAtHat, RISK_MAX))}
                    stroke={trainColor}
                    strokeDasharray="2 3"
                  />
                ) : null}
                {inDomain(thetaHat) ? (
                  <text
                    x={risk.x(thetaHat) + (hatLeft ? -5 : 5)}
                    y={risk.y(truth.variance * 0.4)}
                    textAnchor={hatLeft ? 'end' : 'start'}
                    fontSize={13}
                    fill={trainColor}
                    aria-hidden="true"
                  >
                    ȳ
                  </text>
                ) : null}
              </g>
            ) : null}
            {params.showTrueRisk && params.showTrainingRisk && inDomain(thetaHat) ? (
              <g data-layer="gap">
                <line
                  x1={risk.x(thetaHat)}
                  x2={risk.x(thetaHat)}
                  y1={risk.y(Math.min(trainAtHat, RISK_MAX))}
                  y2={risk.y(Math.min(trueAtHat, RISK_MAX))}
                  stroke={theme.fg}
                  strokeWidth={3}
                />
                <text
                  x={risk.x(thetaHat) + (hatLeft ? -7 : 7)}
                  y={risk.y(Math.min(Math.max(trainAtHat, trueAtHat), RISK_MAX)) - 8}
                  textAnchor={hatLeft ? 'end' : 'start'}
                  fontSize={12}
                  fill={theme.fg}
                  aria-hidden="true"
                >
                  gap
                </text>
              </g>
            ) : null}
            {inDomain(theta) ? (
              <g fill={theme.surface} stroke={theme.fg} strokeWidth={2} aria-hidden="true">
                {params.showTrueRisk && trueAtTheta <= RISK_MAX ? (
                  <circle cx={risk.x(theta)} cy={risk.y(trueAtTheta)} r={4.5} />
                ) : null}
                {params.showTrainingRisk && trainAtTheta <= RISK_MAX ? (
                  <rect x={risk.x(theta) - 4} y={risk.y(trainAtTheta) - 4} width={8} height={8} />
                ) : null}
              </g>
            ) : null}
          </svg>
        </figure>

        <div className="tver-readouts">
          <MathLabel
            className="tver-formula"
            tex={String.raw`\hat R(\theta) = \tfrac{1}{n}\textstyle\sum_{i} \big(\ey{i} - \theta\big)^2, \quad R(\theta) = (\theta - \mu)^2 + \sigma^2`}
          />
          <dl className="tver-stats">
            <dt>
              <MathLabel tex={String.raw`\theta^\star = \mu`} /> true mean
            </dt>
            <dd data-testid="tver-theta-star">{fmt(truth.mean)}</dd>
            <dt>
              <MathLabel tex={String.raw`R(\theta^\star) = \sigma^2`} /> noise floor
            </dt>
            <dd data-testid="tver-sigma2">{fmt(truth.variance)}</dd>
            <dt>
              <MathLabel tex={String.raw`\hat\theta = \bar y`} /> fitted mean
            </dt>
            <dd data-testid="tver-theta-hat">{fmt(thetaHat)}</dd>
            <dt>
              <MathLabel tex={String.raw`\hat R(\hat\theta)`} /> training risk
            </dt>
            <dd data-testid="tver-train-hat">{fmt(trainAtHat)}</dd>
            <dt>
              <MathLabel tex={String.raw`R(\hat\theta)`} /> true risk
            </dt>
            <dd data-testid="tver-true-hat">{fmt(trueAtHat)}</dd>
            <dt>
              <MathLabel tex={String.raw`R(\hat\theta) - \hat R(\hat\theta)`} /> gap
            </dt>
            <dd data-testid="tver-gap">{fmt(trueAtHat - trainAtHat)}</dd>
          </dl>
          <p className="tver-scored">
            Scored θ = <span data-testid="tver-theta">{fmt(theta)}</span>: training risk{' '}
            <span data-testid="tver-train">{fmt(trainAtTheta)}</span>, true risk{' '}
            <span data-testid="tver-true">{fmt(trueAtTheta)}</span> mmHg²
          </p>
          <ul className="tver-legend" aria-label="Legend">
            <li>
              <svg width="28" height="10" aria-hidden="true">
                <line
                  x1="0"
                  x2="28"
                  y1="5"
                  y2="5"
                  stroke={trueColor}
                  strokeWidth={2.5}
                  strokeDasharray="7 4"
                />
              </svg>
              <span>
                true risk <MathLabel tex="R(\theta)" />
              </span>
            </li>
            <li>
              <svg width="28" height="10" aria-hidden="true">
                <line x1="0" x2="28" y1="5" y2="5" stroke={trainColor} strokeWidth={2.5} />
              </svg>
              <span>
                training risk <MathLabel tex={String.raw`\hat R(\theta)`} />; ticks: the patients’ y
              </span>
            </li>
            <li>
              <svg width="28" height="10" aria-hidden="true">
                <circle
                  cx="9"
                  cy="5"
                  r="4"
                  fill={theme.surface}
                  stroke={theme.fg}
                  strokeWidth={1.5}
                />
                <rect
                  x="16"
                  y="1"
                  width="8"
                  height="8"
                  fill={theme.surface}
                  stroke={theme.fg}
                  strokeWidth={1.5}
                />
              </svg>
              the scored θ on each curve
            </li>
          </ul>
        </div>
      </div>

      <div className="tver-bottom">
        <figure className="tver-panel tver-history">
          <figcaption className="tver-caption">
            Training minus true risk at the scored θ, one dot per training set (
            {history.records.length} {history.records.length === 1 ? 'set' : 'sets'}): mean{' '}
            <span data-testid="tver-mean-diff">{fmt(meanDiff)}</span>, expected{' '}
            <span data-testid="tver-expected-diff">{fmt(expected)}</span> mmHg²
          </figcaption>
          <svg
            viewBox={`0 0 ${HISTORY_PANEL.width} ${HISTORY_PANEL.height}`}
            className="tver-svg"
            role="img"
            aria-label={`${history.records.length} training sets; the mean of training minus true risk is ${fmt(meanDiff)}, expected ${fmt(expected)}`}
            data-testid="tver-history"
          >
            <PlotAxes
              frame={HISTORY_PANEL}
              x={hFrame.x}
              y={hFrame.y}
              xStep={half >= 100 ? 50 : half >= 40 ? 20 : 10}
              yStep={0}
              xGrid
              xTitle="training risk − true risk (mmHg²)"
              color={axisColor}
            />
            <line
              x1={hx(0)}
              x2={hx(0)}
              y1={HISTORY_PANEL.margin.top}
              y2={HISTORY_PANEL.height - HISTORY_PANEL.margin.bottom}
              stroke={theme.fg}
              strokeWidth={1.25}
            />
            <g fill={trainColor} fillOpacity={0.45} aria-hidden="true" data-layer="history">
              {diffs.map((d, i) => (
                <circle key={i} cx={hx(clampX(d))} cy={hFrame.y(spread(i) * 0.85)} r={2.5} />
              ))}
            </g>
            <line
              x1={hx(clampX(expected))}
              x2={hx(clampX(expected))}
              y1={HISTORY_PANEL.margin.top}
              y2={HISTORY_PANEL.height - HISTORY_PANEL.margin.bottom}
              stroke={trueColor}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            <line
              x1={hx(clampX(meanDiff))}
              x2={hx(clampX(meanDiff))}
              y1={HISTORY_PANEL.margin.top}
              y2={HISTORY_PANEL.height - HISTORY_PANEL.margin.bottom}
              stroke={trainColor}
              strokeWidth={2.5}
            />
          </svg>
          <p className="tver-history-key">
            Solid line: the mean over the sets drawn. Dashed: its expected value,{' '}
            {thetaMode === 'fitted' ? '−2σ²/n for the fitted mean' : '0 for a θ fixed in advance'}.
          </p>
        </figure>

        <div className="tver-controls">
          {params.resample ? (
            <div className="tver-buttons">
              <button type="button" className="widget-btn" onClick={() => resample(1)}>
                <Shuffle size={14} aria-hidden="true" />
                Resample
              </button>
              <button type="button" className="widget-btn" onClick={() => resample(BATCH)}>
                <Shuffle size={14} aria-hidden="true" />
                Resample {BATCH}×
              </button>
            </div>
          ) : null}
          <Choice
            label="Which θ is scored"
            value={thetaMode}
            options={MODE_OPTIONS}
            onChange={set('thetaMode')}
          />
          <div className="tver-sliders">
            <Param
              label="Patients per training set"
              tex="n"
              value={n}
              min={2}
              max={500}
              step={1}
              defaultValue={initial.n}
              onChange={set('n')}
            />
            {thetaMode === 'fixed' ? (
              <Param
                label="Fixed θ"
                tex="\theta"
                unit="mmHg"
                value={truth.mean + thetaOffset}
                min={truth.mean - 10}
                max={truth.mean + 10}
                step={0.25}
                defaultValue={truth.mean + initial.thetaOffset}
                onChange={(v) => setParams({ thetaOffset: Math.round((v - truth.mean) * 4) / 4 })}
                format={(v) => formatNumber(v, 2)}
              />
            ) : null}
          </div>
          <div className="tver-toggles">
            <Toggle
              label="True risk"
              checked={params.showTrueRisk}
              onChange={set('showTrueRisk')}
            />
            <Toggle
              label="Training risk"
              checked={params.showTrainingRisk}
              onChange={set('showTrainingRisk')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
