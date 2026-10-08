/**
 * `linear-bias-probe` (lesson 1.2; L2 pp.22–25, the linear model class and
 * its inductive biases): a model linear in θ on chosen VASCO features,
 * fitted by least squares on the 300 trial patients and on the whole
 * population (n → ∞), against the true Emax dose–response of the
 * generative model. Three panels: the (dose, baseline) input plane with the
 * model's and the truth's contours and a draggable +10 mg probe; the dose
 * slice at the probe's baseline; and the residuals by arm with the
 * systematic pattern that remains with infinitely many patients.
 *
 * Plain SVG (axes need titles; three panels share scales); the math is in
 * `math.ts`, panel geometry in `fallback.ts`. Colors only from
 * `useVizTheme()`. See README.md.
 */
import { useCallback, useEffect, useMemo, useRef, type PointerEvent } from 'react';

import { trueMean } from '@/lib/datasets/vasco';

import { MathLabel } from '../_shared/math-label';
import { Param, Toggle } from '../_shared/Param';
import { PlotAxes } from '../_shared/PlotAxes';
import { formatNumber, frameScales, polylinePath, sampleCurve, ticks } from '../_shared/plot-scale';
import { useVizTheme } from '../_shared/useVizTheme';
import { zeroContour, type Vec2 } from '../gda-fitter/math';
import type { WidgetProps } from '../types';
import { vascoPatients } from './data';
import {
  BASELINE_DOMAIN,
  DOSE_DOMAIN,
  OUTCOME_DOMAIN,
  PANEL,
  RESIDUAL_DOMAIN,
  RESIDUAL_PANEL,
  jitter,
} from './fallback';
import { params as paramsSchema, type Params } from './manifest';
import {
  FEATURES,
  FEATURE_LABELS,
  armMeanResiduals,
  armMeans,
  doseStep,
  fitPopulation,
  fitSample,
  fitTex,
  meanResidualCurve,
  predict,
  squaredBias,
  trainingMse,
  type Feature,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const STEP_MG = 10;
const CONTOUR_LEVELS = ticks(-45, 25, 5);
const figureStateSchema = paramsSchema.partial();
const PLANE_BOX = { x: DOSE_DOMAIN, y: BASELINE_DOMAIN };

let truthContourCache: Vec2[][][] | null = null;
/** The truth never changes, so its contours are computed once per page. */
function truthContourLines(): Vec2[][][] {
  truthContourCache ??= CONTOUR_LEVELS.map((c) =>
    zeroContour((d, bb) => trueMean(d, bb) - c, PLANE_BOX, 40),
  );
  return truthContourCache;
}

function Arrow({
  from,
  to,
  color,
  dashed = false,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
  dashed?: boolean;
}) {
  const [x0, y0] = from;
  const [x1, y1] = to;
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return null;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const head = Math.min(7, len / 2);
  const hx = x1 - ux * head;
  const hy = y1 - uy * head;
  return (
    <g stroke={color} fill={color}>
      <line
        x1={x0}
        y1={y0}
        x2={hx}
        y2={hy}
        strokeWidth={2}
        strokeDasharray={dashed ? '4 3' : undefined}
      />
      <path
        d={`M${x1} ${y1}L${hx - uy * 4} ${hy + ux * 4}L${hx + uy * 4} ${hy - ux * 4}Z`}
        stroke="none"
      />
    </g>
  );
}

const fmt = (v: number) => formatNumber(v, 2);
const signed = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v));

export default function LinearBiasProbe({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const patients = vascoPatients();
  const model = useMemo(
    () => ({ features: params.features, interaction: params.showInteraction }),
    [params.features, params.showInteraction],
  );
  const fit = useMemo(() => fitSample(model, patients), [model, patients]);
  const pop = useMemo(() => fitPopulation(model), [model]);
  const bias2 = useMemo(() => squaredBias(pop), [pop]);
  const mse = useMemo(() => trainingMse(fit, patients), [fit, patients]);
  const means = useMemo(() => armMeans(patients), [patients]);
  const residualMeans = useMemo(() => armMeanResiduals(fit, patients), [fit, patients]);

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

  const toggleFeature = (f: Feature) => (on: boolean) => {
    const next = FEATURES.filter((g) => (g === f ? on : params.features.includes(g)));
    setParams({ features: next });
  };

  const d0 = params.probeDose;
  const b = params.probeBaseline;
  const fHat = (d: number, bb: number) => predict(fit, d, bb);
  const stepModel = doseStep(fHat, d0, b, STEP_MG);
  const stepTruth = doseStep(trueMean, d0, b, STEP_MG);

  /* ---------- panel 1: the input plane ---------- */
  const plane = frameScales(PANEL, DOSE_DOMAIN, BASELINE_DOMAIN);
  const modelContours = useMemo(
    () => CONTOUR_LEVELS.map((c) => zeroContour((d, bb) => predict(fit, d, bb) - c, PLANE_BOX, 40)),
    [fit],
  );
  const truthContours = useMemo(() => truthContourLines(), []);
  const contourPath = (lines: readonly (readonly [number, number])[][]) =>
    lines
      .map((line) =>
        line
          .map(
            ([d, bb], i) =>
              `${i === 0 ? 'M' : 'L'}${plane.x(d).toFixed(1)} ${plane.y(bb).toFixed(1)}`,
          )
          .join(''),
      )
      .join('');

  const planeRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const moveProbe = (e: PointerEvent<SVGElement>) => {
    const svg = planeRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const d = Math.min(30, Math.max(0, Math.round(plane.x.invert(pt.x) / 2.5) * 2.5));
    const bb = Math.min(190, Math.max(120, Math.round(plane.y.invert(pt.y))));
    setParams({ probeDose: d, probeBaseline: bb });
  };

  /* ---------- panel 2: the dose slice ---------- */
  const slice = frameScales(PANEL, DOSE_DOMAIN, OUTCOME_DOMAIN);
  const curve = (f: (d: number) => number) =>
    polylinePath(sampleCurve(f, DOSE_DOMAIN[0], DOSE_DOMAIN[1], 120), slice.x, slice.y);

  /* ---------- panel 3: residuals ---------- */
  const resid = frameScales(RESIDUAL_PANEL, DOSE_DOMAIN, RESIDUAL_DOMAIN);

  const axisColor = { grid: theme.border, text: theme.fg, muted: theme.muted };
  const modelColor = theme.viz[5];
  const truthColor = theme.viz[0];
  const eqTex = fitTex(fit);

  return (
    <div className="lbp" data-features={params.features.join(',')}>
      <div className="lbp-panels">
        <figure className="lbp-panel">
          <figcaption className="lbp-caption">
            Input plane: contours of the prediction every 5 mmHg
          </figcaption>
          <svg
            ref={planeRef}
            viewBox={`0 0 ${PANEL.width} ${PANEL.height}`}
            className="lbp-svg"
            role="img"
            aria-label={`Contours of the fitted model${params.showTruth ? ' and of the true mean' : ''} over dose and baseline, with the probe at ${d0} mg and ${b} mmHg`}
            data-testid="lbp-plane"
          >
            <PlotAxes
              frame={PANEL}
              x={plane.x}
              y={plane.y}
              xStep={10}
              yStep={10}
              xTitle="dose D (mg)"
              yTitle="baseline B (mmHg)"
              color={axisColor}
            />
            <g fill={theme.muted} fillOpacity={0.3} aria-hidden="true">
              {patients.map((p, i) =>
                p.baseline < BASELINE_DOMAIN[0] || p.baseline > BASELINE_DOMAIN[1] ? null : (
                  <circle
                    key={i}
                    cx={plane.x(p.dose + jitter(i) * 0.6)}
                    cy={plane.y(p.baseline)}
                    r={1.6}
                  />
                ),
              )}
            </g>
            {params.showTruth ? (
              <path
                d={contourPath(truthContours.flat())}
                fill="none"
                stroke={truthColor}
                strokeWidth={1.25}
                strokeDasharray="5 3"
                data-layer="truth-contours"
              />
            ) : null}
            <path
              d={contourPath(modelContours.flat())}
              fill="none"
              stroke={modelColor}
              strokeWidth={1.5}
              data-layer="model-contours"
            />
            <Arrow
              from={[plane.x(d0), plane.y(b)]}
              to={[plane.x(d0 + STEP_MG), plane.y(b)]}
              color={theme.fg}
            />
            <circle
              cx={plane.x(d0)}
              cy={plane.y(b)}
              r={5}
              fill={theme.surface}
              stroke={theme.fg}
              strokeWidth={2}
            />
            <circle
              className="lbp-handle"
              cx={plane.x(d0)}
              cy={plane.y(b)}
              r={22}
              fill={theme.fg}
              fillOpacity={0}
              aria-hidden="true"
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragging.current) moveProbe(e);
              }}
              onPointerUp={() => {
                dragging.current = false;
              }}
              onPointerCancel={() => {
                dragging.current = false;
              }}
            />
          </svg>
        </figure>

        <figure className="lbp-panel">
          <figcaption className="lbp-caption">Dose slice at B = {b} mmHg</figcaption>
          <svg
            viewBox={`0 0 ${PANEL.width} ${PANEL.height}`}
            className="lbp-svg"
            role="img"
            aria-label={`Change in systolic pressure against dose: patients, arm means, the fitted model${params.showTruth ? ', and the true Emax mean' : ''} at baseline ${b} mmHg`}
            data-testid="lbp-slice"
          >
            <PlotAxes
              frame={PANEL}
              x={slice.x}
              y={slice.y}
              xStep={10}
              yStep={10}
              xTitle="dose D (mg)"
              yTitle="ΔSBP (mmHg)"
              color={axisColor}
            />
            <g fill={theme.muted} fillOpacity={0.3} aria-hidden="true">
              {patients.map((p, i) =>
                p.y < OUTCOME_DOMAIN[0] || p.y > OUTCOME_DOMAIN[1] ? null : (
                  <circle key={i} cx={slice.x(p.dose + jitter(i))} cy={slice.y(p.y)} r={1.8} />
                ),
              )}
            </g>
            <g fill={theme.fg} aria-hidden="true">
              {means.map(({ dose, mean }) => (
                <rect key={dose} x={slice.x(dose) - 4} y={slice.y(mean) - 4} width={8} height={8} />
              ))}
            </g>
            {params.showTruth ? (
              <path
                d={curve((d) => trueMean(d, b))}
                fill="none"
                stroke={truthColor}
                strokeWidth={2.5}
                strokeDasharray="7 4"
                data-layer="truth"
              />
            ) : null}
            {params.showPopulationFit ? (
              <path
                d={curve((d) => predict(pop, d, b))}
                fill="none"
                stroke={modelColor}
                strokeWidth={1.75}
                strokeDasharray="2 3"
                data-layer="population-fit"
              />
            ) : null}
            <path
              d={curve((d) => predict(fit, d, b))}
              fill="none"
              stroke={modelColor}
              strokeWidth={2.5}
              data-layer="fit"
            />
            <Arrow
              from={[slice.x(d0), slice.y(fHat(d0, b))]}
              to={[slice.x(d0 + STEP_MG), slice.y(fHat(d0 + STEP_MG, b))]}
              color={theme.fg}
            />
            {params.showTruth ? (
              <Arrow
                from={[slice.x(d0), slice.y(trueMean(d0, b))]}
                to={[slice.x(d0 + STEP_MG), slice.y(trueMean(d0 + STEP_MG, b))]}
                color={theme.fg}
                dashed
              />
            ) : null}
          </svg>
        </figure>

        <figure className="lbp-panel">
          <figcaption className="lbp-caption">
            Residuals y − ŷ by arm; dotted: their mean with n → ∞
          </figcaption>
          <svg
            viewBox={`0 0 ${RESIDUAL_PANEL.width} ${RESIDUAL_PANEL.height}`}
            className="lbp-svg"
            role="img"
            aria-label="Residuals of the fitted model by dose arm, the arm means of the residuals, and the mean residual with infinitely many patients"
            data-testid="lbp-residuals"
          >
            <PlotAxes
              frame={RESIDUAL_PANEL}
              x={resid.x}
              y={resid.y}
              xStep={10}
              yStep={10}
              xTitle="dose D (mg)"
              yTitle="residual (mmHg)"
              color={axisColor}
            />
            <g fill={theme.muted} fillOpacity={0.3} aria-hidden="true">
              {patients.map((p, i) => {
                const r = p.y - predict(fit, p.dose, p.baseline);
                if (r < RESIDUAL_DOMAIN[0] || r > RESIDUAL_DOMAIN[1]) return null;
                return <circle key={i} cx={resid.x(p.dose + jitter(i))} cy={resid.y(r)} r={1.8} />;
              })}
            </g>
            <path
              d={polylinePath(
                sampleCurve((d) => meanResidualCurve(pop, d), 0, 40, 120),
                resid.x,
                resid.y,
              )}
              fill="none"
              stroke={modelColor}
              strokeWidth={2.5}
              strokeDasharray="2 3"
              data-layer="bias-curve"
            />
            <g fill={theme.fg} aria-hidden="true">
              {residualMeans.map(({ dose, mean }) => (
                <rect key={dose} x={resid.x(dose) - 4} y={resid.y(mean) - 4} width={8} height={8} />
              ))}
            </g>
          </svg>
        </figure>

        <div className="lbp-readouts">
          <div className="lbp-equation" data-testid="lbp-equation">
            <MathLabel tex={eqTex} />
          </div>
          <dl className="lbp-stats">
            <dt>
              Model’s change, {d0} → {d0 + STEP_MG} mg
            </dt>
            <dd data-testid="lbp-step-model">{signed(stepModel)} mmHg</dd>
            {params.showTruth ? (
              <>
                <dt>
                  True change, {d0} → {d0 + STEP_MG} mg
                </dt>
                <dd data-testid="lbp-step-truth">{signed(stepTruth)} mmHg</dd>
              </>
            ) : null}
            <dt>Squared bias, n → ∞</dt>
            <dd data-testid="lbp-bias">{fmt(bias2)} mmHg²</dd>
            <dt>Training MSE, 300 patients</dt>
            <dd data-testid="lbp-mse">{fmt(mse)} mmHg²</dd>
          </dl>
          <ul className="lbp-legend" aria-label="Legend">
            <li>
              <svg width="28" height="10" aria-hidden="true">
                <line x1="0" x2="28" y1="5" y2="5" stroke={modelColor} strokeWidth={2.5} />
              </svg>
              model fitted on the 300 patients
            </li>
            {params.showPopulationFit ? (
              <li>
                <svg width="28" height="10" aria-hidden="true">
                  <line
                    x1="0"
                    x2="28"
                    y1="5"
                    y2="5"
                    stroke={modelColor}
                    strokeWidth={1.75}
                    strokeDasharray="2 3"
                  />
                </svg>
                best model in the class (n → ∞)
              </li>
            ) : null}
            {params.showTruth ? (
              <li>
                <svg width="28" height="10" aria-hidden="true">
                  <line
                    x1="0"
                    x2="28"
                    y1="5"
                    y2="5"
                    stroke={truthColor}
                    strokeWidth={2.5}
                    strokeDasharray="7 4"
                  />
                </svg>
                true mean f*(D, B)
              </li>
            ) : null}
            <li>
              <svg width="28" height="10" aria-hidden="true">
                <rect x="10" y="1" width="8" height="8" fill={theme.fg} />
              </svg>
              arm means
            </li>
          </ul>
        </div>
      </div>

      <div className="lbp-controls">
        <fieldset className="lbp-features">
          <legend className="param-choice-legend">Features (with an intercept)</legend>
          {FEATURES.map((f) => (
            <Toggle
              key={f}
              label={FEATURE_LABELS[f]}
              checked={params.features.includes(f)}
              onChange={toggleFeature(f)}
            />
          ))}
        </fieldset>
        <div className="lbp-toggles">
          <Toggle
            label="Interaction: dose feature × B"
            checked={params.showInteraction}
            onChange={set('showInteraction')}
          />
          <Toggle label="True mean" checked={params.showTruth} onChange={set('showTruth')} />
          <Toggle
            label="Best fit with n → ∞"
            checked={params.showPopulationFit}
            onChange={set('showPopulationFit')}
          />
        </div>
        <div className="lbp-sliders">
          <Param
            label="Probe dose"
            tex="D"
            unit="mg"
            value={params.probeDose}
            min={0}
            max={30}
            step={2.5}
            defaultValue={initial.probeDose}
            onChange={set('probeDose')}
            format={(v) => v.toFixed(1)}
          />
          <Param
            label="Probe baseline"
            tex="B"
            unit="mmHg"
            value={params.probeBaseline}
            min={120}
            max={190}
            step={1}
            defaultValue={initial.probeBaseline}
            onChange={set('probeBaseline')}
          />
        </div>
      </div>
    </div>
  );
}
