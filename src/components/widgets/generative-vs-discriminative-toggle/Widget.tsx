/**
 * `generative-vs-discriminative-toggle` (lesson 6.1; rebuilds the L8 p.33 /
 * L9 p.2 pair of illustrations and the course-map widget idea for L8): the
 * same ADVERSE patients classified two ways. Generative: class-conditional
 * Gaussians p(x | y) times a prior p(y = 1) that the reader sets, Bayes
 * boundary where the posterior odds are 1. Discriminative: logistic
 * regression's p(y | x), fitted directly. The prior slider moves the first
 * boundary and leaves the second where it is; the readout says why.
 *
 * Fitting is imported from `gda-fitter/math` (not duplicated); the prior
 * swap and the geometry are in `math.ts` and `scene.ts`. Mafs draws the
 * plane; colors come only from `useVizTheme()`. See README.md.
 */
import { Coordinates, Ellipse, Mafs, Polygon, Polyline, useTransformContext, vec } from 'mafs';
import { useCallback, useEffect, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { useVizTheme } from '../_shared/useVizTheme';
import { ADVERSE_FEATURES, FEATURE_LABELS, type AdverseFeature } from '../gda-fitter/data';
import { eigenSymmetric2, majorAxisAngle } from '../gaussian-2d-covariance/math';
import type { WidgetProps } from '../types';
import { params as paramsSchema, type Params } from './manifest';
import {
  angleBetween,
  bayesScore,
  boundaryMove,
  countPositive,
  lineScore,
  priorShift,
  type LabeledPoint,
  type Vec2,
} from './math';
import {
  DOMAIN,
  bayesBoundary,
  fitDiscriminative,
  fitGenerative,
  logisticBoundary,
  samplePoints,
  type Boundary,
} from './scene';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 340;
const figureStateSchema = paramsSchema.partial();

const fmt = (v: number, digits = 2) => {
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return (0).toFixed(digits);
  return v < 0 ? `−${s}` : s;
};
const signed = (v: number, digits = 2) => (v > 0 ? `+${fmt(v, digits)}` : fmt(v, digits));
const tex = (v: number, digits = 2) => fmt(v, digits).replace('−', '-');
const pct = (v: number) => `${(100 * v).toFixed(1)}%`;

/* ---------- pixel-space layers ---------- */

function usePixel() {
  const { viewTransform, userTransform } = useTransformContext();
  const matrix = vec.matrixMult(viewTransform, userTransform);
  return (p: Vec2) => vec.transform([p[0], p[1]], matrix);
}

function Scatter({
  points,
  k,
  color,
}: {
  points: readonly LabeledPoint[];
  k: 0 | 1;
  color: string;
}) {
  const toPx = usePixel();
  return (
    <g
      fill={color}
      fillOpacity={k === 1 ? 0.85 : 0.4}
      aria-hidden="true"
      data-layer={`scatter-${k}`}
    >
      {points.map((p) => {
        const [cx, cy] = toPx(p.x);
        return k === 1 ? (
          <path
            key={p.id}
            d={`M${cx} ${cy - 4}L${cx + 4} ${cy}L${cx} ${cy + 4}L${cx - 4} ${cy}Z`}
          />
        ) : (
          <circle key={p.id} cx={cx} cy={cy} r={2.3} />
        );
      })}
    </g>
  );
}

function MeanMarker({ mu, color }: { mu: Vec2; color: string }) {
  const toPx = usePixel();
  const [cx, cy] = toPx(mu);
  return (
    <g stroke={color} strokeWidth={2.5} strokeLinecap="round" aria-hidden="true" data-layer="mean">
      <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} />
      <line x1={cx - 6} y1={cy + 6} x2={cx + 6} y2={cy - 6} />
    </g>
  );
}

function BoundaryLines({
  boundary,
  color,
  dashed,
  layer,
}: {
  boundary: Boundary;
  color: string;
  dashed: boolean;
  layer: string;
}) {
  return (
    <g data-layer={layer} data-style={dashed ? 'dashed' : 'solid'}>
      {boundary.polylines.map((pl, i) => (
        <Polyline
          key={i}
          points={pl.map((p) => [p[0], p[1]])}
          color={color}
          weight={dashed ? 2 : 3}
          strokeStyle={dashed ? 'dashed' : 'solid'}
        />
      ))}
    </g>
  );
}

/* ---------- the widget ---------- */

export default function GenerativeVsDiscriminativeToggle({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();

  // A revealed <Step figureState> may set any param (e.g. {"model":"discriminative"}).
  useEffect(() => {
    if (!figureState || typeof figureState !== 'object') return;
    const parsed = figureStateSchema.safeParse(figureState);
    if (!parsed.success) return;
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

  const [fx, fy] = params.features;
  const points = useMemo(
    () => samplePoints({ features: [fx, fy], n: params.n, seed: params.seed }),
    [fx, fy, params.n, params.seed],
  );
  const fit = useMemo(
    () => fitGenerative(points, params.sharedCovariance),
    [points, params.sharedCovariance],
  );
  const lrLine = useMemo(() => fitDiscriminative(points), [points]);
  const lr = useMemo(() => logisticBoundary(lrLine), [lrLine]);
  const bayes = useMemo(() => bayesBoundary(fit, params.prior), [fit, params.prior]);
  const bayesAtPhi = useMemo(() => bayesBoundary(fit, fit.phi), [fit]);

  const generative = params.model === 'generative';
  const active = generative ? bayes : lr;
  const other = generative ? lr : bayes;
  const activeColor = generative ? theme.boundary : theme.viz[3];
  const otherColor = generative ? theme.viz[3] : theme.boundary;

  const n = points.length;
  const c1 = fit.classes[1];
  const flaggedBayes = fit.degenerate
    ? 0
    : countPositive(points, (x) => bayesScore(fit, params.prior, x));
  const flaggedLr = countPositive(points, (x) => lineScore(lrLine, x));
  const delta = priorShift(fit.phi, params.prior);
  const move = bayesAtPhi.line ? boundaryMove(bayesAtPhi.line, delta) : null;
  const angle = bayes.line ? angleBetween(bayesAtPhi.line ?? bayes.line, lrLine) : null;
  // "Near" φ̂: within about one slider step either side, so the authored 0.06 counts for φ̂ ≈ 0.065.
  const near = Math.abs(params.prior - fit.phi) < 0.0076;
  const flaggedAtPhi = fit.degenerate
    ? 0
    : countPositive(points, (x) => bayesScore(fit, fit.phi, x));
  const phiText = fmt(fit.phi, 3);

  const formula = generative
    ? String.raw`\log\frac{\Prob(y=\htmlClass{sym-pos}{1}\mid x)}{\Prob(y=\htmlClass{sym-neg}{0}\mid x)} = \underbrace{\log\frac{p(x\mid y=1)}{p(x\mid y=0)}}_{\text{fitted }\htmlClass{sym-mu}{\hat\mu_k},\ \htmlClass{sym-sigma}{\hat\Sigma}} + \underbrace{\log\frac{\pi}{1-\pi}}_{\pi\,=\,${tex(params.prior, 3)}}`
    : String.raw`\Prob(y=\htmlClass{sym-pos}{1}\mid x) = \sigma\big(\htmlClass{sym-theta}{\theta}\T x + \theta_0\big),\quad \htmlClass{sym-theta}{\theta} = (${tex(lrLine.theta[0])},\ ${tex(lrLine.theta[1])})\T,\ \theta_0 = ${tex(lrLine.theta0)}`;

  let why: string;
  if (generative) {
    if (fit.degenerate) {
      why = `No Bayes boundary: ${fit.reason ?? 'the fit is degenerate'}.`;
    } else if (near) {
      why =
        `At π ≈ φ̂ = ${phiText} the generative model uses the event rate it estimated from these ${n} patients` +
        (angle !== null
          ? `, and its boundary nearly coincides with logistic regression’s (normals ${angle.toFixed(1)}° apart): both are linear in x and fitted to the same data. `
          : '; with separate covariances its boundary is a curve, while logistic regression stays a line. ') +
        (flaggedBayes === 0
          ? 'With events this rare no patient’s posterior p(y = 1 | x) reaches 1/2, so the Bayes rule flags no one.'
          : `The Bayes rule flags ${flaggedBayes} of ${n}.`);
    } else {
      const direction = delta > 0 ? 'toward the no-event mean' : 'away from the no-event mean';
      why =
        `p(x | y) did not change; only the prior did. Bayes’ rule adds log π/(1 − π) to the log odds, so moving π from φ̂ = ${phiText} to ${fmt(params.prior, 3)} adds Δ = ${signed(delta)} at every x. ` +
        `The boundary is where the log odds are 0, so it slides ${direction}` +
        (move !== null ? ` by ${fmt(Math.abs(move))} standard deviations` : '') +
        `: the Bayes rule now flags ${flaggedBayes} of ${n} patients, against ${flaggedAtPhi} at π = φ̂. Logistic regression (dashed) has no prior to change and stays put.`;
    }
  } else {
    why =
      `Logistic regression fits p(y | x) directly. The ${pct(fit.phi)} event rate is already inside θ₀ = ${fmt(lrLine.theta0)}, learned from the same patients, and there is no separate p(y) to set: sliding π does not move this boundary. ` +
      (params.showOther ? 'The dashed line is the generative boundary at the current π.' : '');
  }

  const region = active.region.length > 2 ? active.region : null;
  const axisNote = `x: ${FEATURE_LABELS[fx]}, y: ${FEATURE_LABELS[fy]}; both standardized`;
  const priorLabel = 'Prior p(y = 1)';

  return (
    <div
      className="gvd"
      data-model={params.model}
      data-boundary={
        generative ? (fit.degenerate ? 'none' : fit.shared ? 'linear' : 'quadratic') : 'linear'
      }
    >
      <div className="gvd-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ x: [-DOMAIN, DOMAIN], y: [-DOMAIN, DOMAIN], padding: 0 }}
          preserveAspectRatio="contain"
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian subdivisions={2} />
          {region ? (
            <g data-layer="region">
              <Polygon
                points={region.map((p) => [p[0], p[1]])}
                color={theme.positive}
                fillOpacity={0.1}
                weight={0}
              />
            </g>
          ) : null}
          <Scatter points={points.filter((p) => p.y === 0)} k={0} color={theme.negative} />
          <Scatter points={points.filter((p) => p.y === 1)} k={1} color={theme.positive} />
          {generative && !fit.degenerate
            ? ([0, 1] as const).map((k) => {
                const e = eigenSymmetric2(fit.cov[k]);
                const mu = fit.classes[k].mu;
                return (
                  <g key={k} data-layer={`density-${k}`}>
                    <Ellipse
                      center={[mu[0], mu[1]]}
                      radius={[
                        Math.sqrt(Math.max(e.values[0], 0)),
                        Math.sqrt(Math.max(e.values[1], 0)),
                      ]}
                      angle={majorAxisAngle(e)}
                      color={k === 1 ? theme.positive : theme.negative}
                      fillOpacity={0.06}
                      weight={2}
                    />
                    <MeanMarker mu={mu} color={theme.fg} />
                  </g>
                );
              })
            : null}
          {params.showOther ? (
            <BoundaryLines
              boundary={other}
              color={otherColor}
              dashed
              layer={generative ? 'logistic' : 'bayes'}
            />
          ) : null}
          <BoundaryLines
            boundary={active}
            color={activeColor}
            dashed={false}
            layer={generative ? 'bayes' : 'logistic'}
          />
        </Mafs>
        <p className="gvd-legend" aria-hidden="true">
          <span style={{ color: theme.negative }}>● no event (y = 0)</span>
          <span style={{ color: theme.positive }}>◆ event (y = 1)</span>
          <span style={{ color: theme.boundary }}>{generative ? '—' : '- -'} Bayes boundary</span>
          <span style={{ color: theme.viz[3] }}>
            {generative ? '- -' : '—'} logistic regression
          </span>
          {generative ? <span>× μ̂ₖ, rings 1σ</span> : null}
          <span>shaded: classified as event</span>
        </p>
        <p className="gvd-axes">{axisNote}</p>
      </div>

      <div className="gvd-panel">
        <Choice
          label="Model"
          value={params.model}
          options={[
            { value: 'generative', label: 'Generative: p(x | y) p(y)' },
            { value: 'discriminative', label: 'Discriminative: p(y | x)' },
          ]}
          onChange={set('model')}
        />
        <div className="gvd-math">
          <MathLabel tex={formula} display />
        </div>
        <Param
          label={priorLabel}
          tex="\pi"
          value={params.prior}
          min={0.01}
          max={0.99}
          step={0.005}
          defaultValue={initial.prior}
          onChange={set('prior')}
          format={(v) => v.toFixed(3)}
        />
        <div className="gvd-actions">
          <button
            type="button"
            className="widget-btn"
            onClick={() => setParams({ prior: Math.round(fit.phi * 200) / 200 })}
          >
            Set π to the sample rate φ̂ = {fmt(fit.phi, 3)}
          </button>
        </div>
        <dl className="gvd-stats" data-testid="gvd-stats">
          <dt>Events in the sample</dt>
          <dd>
            {c1.n} of {n} ({pct(fit.phi)})
          </dd>
          <dt>Flagged by the Bayes rule</dt>
          <dd data-testid="gvd-flagged-bayes">
            {fit.degenerate ? '—' : `${flaggedBayes} of ${n}`}
          </dd>
          <dt>Flagged by logistic regression</dt>
          <dd data-testid="gvd-flagged-lr">
            {flaggedLr} of {n}
          </dd>
          <dt>Prior shift Δ = logit π − logit φ̂</dt>
          <dd data-testid="gvd-delta">{signed(delta)}</dd>
        </dl>
        <p className="gvd-why" role="status" aria-live="polite" data-testid="gvd-why">
          {why}
        </p>
      </div>

      <div className="gvd-controls">
        <div className="gvd-toggles">
          <Toggle
            label="Shared covariance"
            checked={params.sharedCovariance}
            onChange={set('sharedCovariance')}
          />
          <Toggle
            label="Show the other model dashed"
            checked={params.showOther}
            onChange={set('showOther')}
          />
        </div>
        <div className="gvd-choices">
          <Choice
            label="x feature"
            value={fx}
            options={ADVERSE_FEATURES.filter((f) => f !== fy).map((f) => ({ value: f, label: f }))}
            onChange={(v: AdverseFeature) => setParams({ features: [v, fy] })}
          />
          <Choice
            label="y feature"
            value={fy}
            options={ADVERSE_FEATURES.filter((f) => f !== fx).map((f) => ({ value: f, label: f }))}
            onChange={(v: AdverseFeature) => setParams({ features: [fx, v] })}
          />
        </div>
        <Param
          label="Patients"
          tex="n"
          value={params.n}
          min={100}
          max={1000}
          step={50}
          defaultValue={initial.n}
          onChange={set('n')}
        />
      </div>
    </div>
  );
}
