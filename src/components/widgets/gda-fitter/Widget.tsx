/**
 * `gda-fitter` (lessons 7.2 and 7.3; rebuilds L10 p.15/p.20 and the
 * course-map's shared-Σ ⇒ linear-boundary gap): two-class 2-D points, the
 * GDA maximum-likelihood fit (φ̂, μ̂_k, Σ̂_k or a pooled Σ̂) drawn as 1σ and 2σ
 * ellipses with the priors beside the means, the Bayes decision boundary as
 * the zero level set of the log posterior odds (a curve, or a line when the
 * covariance is shared), and an optional logistic-regression boundary fitted
 * by gradient descent for comparison. In edit mode the reader drags and
 * removes points and watches the fit follow.
 *
 * Mafs draws the plane, ellipses, and polylines; `math.ts` does the fitting;
 * colors come only from `useVizTheme()`. See README.md.
 */
import {
  Coordinates,
  Ellipse,
  Mafs,
  Polyline,
  Text,
  useMovable,
  useTransformContext,
  vec,
} from 'mafs';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { z } from 'zod';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { useSeededRandom } from '../_shared/useSeededRandom';
import { useVizTheme } from '../_shared/useVizTheme';
import { eigenSymmetric2, majorAxisAngle } from '../gaussian-2d-covariance/math';
import type { WidgetProps } from '../types';
import { ADVERSE_FEATURES, FEATURE_LABELS, adverseProjection, type AdverseFeature } from './data';
import { boxFor, domainFor } from './fallback';
import type { Params } from './manifest';
import {
  accuracy,
  applyEdits,
  clipLineToBox,
  fitGda,
  fitLogistic,
  gdaScore,
  linearBoundary,
  lineScore,
  syntheticPoints,
  zeroContour,
  type LabeledPoint,
  type MovedPoint,
  type Sym2,
  type Vec2,
} from './math';

export { manifest } from './manifest';

const PLOT_HEIGHT = 340;
/** Draggable points per class in edit mode; the rest stay static (keyboard order stays short). */
const EDIT_CAP = 60;
const CONTOUR_CELLS = 56;

type Highlight = 'mu' | 'sigma' | 'boundary';

/** What a `<Step figureState>` may send (docs/CONTENT_AUTHORING.md); unknown keys are ignored. */
const figureStateSchema = z.looseObject({
  sharedCovariance: z.boolean().optional(),
  logisticOverlay: z.boolean().optional(),
  showLogisticRegression: z.boolean().optional(),
  highlight: z.enum(['mu', 'sigma', 'boundary']).nullable().optional(),
});

const identity = (p: vec.Vector2): vec.Vector2 => p;
const fmt = (v: number) => (Object.is(v, -0) || Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));
const pct = (v: number) => `${(100 * v).toFixed(1)} %`;
const matrixTex = (m: Sym2) =>
  `\\begin{bmatrix} ${fmt(m.a)} & ${fmt(m.b)} \\\\ ${fmt(m.b)} & ${fmt(m.c)} \\end{bmatrix}`;
const vectorTex = (v: Vec2) => `\\begin{bmatrix} ${fmt(v[0])} \\\\ ${fmt(v[1])} \\end{bmatrix}`;

/* ---------- pixel-space layers (cheaper than hundreds of Mafs <Point>s) ---------- */

function usePixel() {
  const { viewTransform, userTransform } = useTransformContext();
  const matrix = vec.matrixMult(viewTransform, userTransform);
  return (p: Vec2) => vec.transform([p[0], p[1]], matrix);
}

function Diamond({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <path d={`M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`} />;
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
    <g fill={color} fillOpacity={0.55} aria-hidden="true" data-layer={`scatter-${k}`}>
      {points.map((p) => {
        const [cx, cy] = toPx(p.x);
        return k === 1 ? (
          <Diamond key={p.id} cx={cx} cy={cy} r={3.5} />
        ) : (
          <circle key={p.id} cx={cx} cy={cy} r={2.5} />
        );
      })}
    </g>
  );
}

/** The fitted mean as an × marker so it reads without color. */
function MeanMarker({ mu, color, big }: { mu: Vec2; color: string; big: boolean }) {
  const toPx = usePixel();
  const [cx, cy] = toPx(mu);
  const r = big ? 8 : 5;
  return (
    <g
      stroke={color}
      strokeWidth={big ? 3 : 2}
      strokeLinecap="round"
      aria-hidden="true"
      data-layer="mean"
    >
      <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
      <line x1={cx - r} y1={cy + r} x2={cx + r} y2={cy - r} />
    </g>
  );
}

interface DraggablePointProps {
  point: LabeledPoint;
  color: string;
  onMove: (id: number, x: Vec2) => void;
  onRemove: (id: number) => void;
  onSelect: (id: number) => void;
}

/**
 * A focusable, keyboard-movable point built on Mafs' `useMovable` (pointer
 * drag and arrow keys) with an accessible name and a Delete key handler.
 * Mafs' own `<MovablePoint>` has no accessible name, which §7 point 5 needs.
 */
function DraggablePoint({ point, color, onMove, onRemove, onSelect }: DraggablePointProps) {
  const ref = useRef<SVGGElement>(null);
  const toPx = usePixel();
  const move = useCallback((p: vec.Vector2) => onMove(point.id, p), [onMove, point.id]);
  const { dragging } = useMovable({
    gestureTarget: ref as RefObject<Element>,
    onMove: move,
    point: [point.x[0], point.x[1]],
    constrain: identity,
  });

  // use-gesture stops propagation on the element, so React's delegated
  // handlers never see these; listen on the element itself.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onRemove(point.id);
      }
    };
    const onDown = () => el.focus();
    el.addEventListener('keydown', onKey);
    el.addEventListener('pointerdown', onDown);
    return () => {
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerdown', onDown);
    };
  }, [onRemove, point.id]);

  const [cx, cy] = toPx(point.x);
  const label =
    `Class ${point.y} point ${point.id} at (${fmt(point.x[0])}, ${fmt(point.x[1])}). ` +
    'Arrow keys move it; Delete removes it.';
  return (
    <g
      ref={ref}
      tabIndex={0}
      role="button"
      aria-roledescription="draggable point"
      aria-label={label}
      className={dragging ? 'gdf-point gdf-point-dragging' : 'gdf-point'}
      onFocus={() => onSelect(point.id)}
    >
      <circle className="gdf-point-hitbox" cx={cx} cy={cy} r={22} fill="none" pointerEvents="all" />
      <circle className="gdf-point-ring" cx={cx} cy={cy} r={9} fill="none" />
      <g fill={color} stroke={color} strokeWidth={1.5}>
        {point.y === 1 ? <Diamond cx={cx} cy={cy} r={4.5} /> : <circle cx={cx} cy={cy} r={3.5} />}
      </g>
    </g>
  );
}

/* ---------- the widget ---------- */

function withMove(moved: readonly MovedPoint[], id: number, x: Vec2): [number, number, number][] {
  const next: [number, number, number][] = [];
  for (const m of moved) if (m[0] !== id) next.push([m[0], m[1], m[2]]);
  next.push([id, x[0], x[1]]);
  return next;
}

export default function GdaFitter({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();
  const rng = useSeededRandom(params.seed);
  // The highlight is a pure function of the last figureState.
  const highlight = useMemo((): Highlight | null => {
    const parsed = figureStateSchema.safeParse(figureState);
    return parsed.success ? (parsed.data.highlight ?? null) : null;
  }, [figureState]);
  const [selected, setSelected] = useState<number | null>(null);

  const synthetic = params.dataset === 'synthetic';
  const box = boxFor(params.dataset);
  const domain = domainFor(params.dataset);

  // A `<Step figureState>` reveal: apply the toggles it names as params.
  useEffect(() => {
    const parsed = figureStateSchema.safeParse(figureState);
    if (!parsed.success) return;
    const s = parsed.data;
    const patch: Partial<Params> = {};
    if (s.sharedCovariance !== undefined) patch.sharedCovariance = s.sharedCovariance;
    const lr = s.showLogisticRegression ?? s.logisticOverlay;
    if (lr !== undefined) patch.showLogisticRegression = lr;
    if (Object.keys(patch).length > 0) setParams(patch);
  }, [figureState, setParams]);

  const [fx, fy] = params.features;
  const sample = useMemo(
    () =>
      synthetic
        ? syntheticPoints(
            {
              n: params.n,
              prior: params.prior,
              separation: params.separation,
              rotation: params.rotation,
            },
            rng,
          )
        : adverseProjection([fx, fy], params.n, params.seed),
    [
      synthetic,
      params.n,
      params.prior,
      params.separation,
      params.rotation,
      params.seed,
      fx,
      fy,
      rng,
    ],
  );
  const points = useMemo(
    () => applyEdits(sample, params.movedPoints, params.removedPoints),
    [sample, params.movedPoints, params.removedPoints],
  );

  const fit = useMemo(
    () => fitGda(points, params.sharedCovariance),
    [points, params.sharedCovariance],
  );
  const line = useMemo(() => (fit.degenerate || !fit.shared ? null : linearBoundary(fit)), [fit]);
  const boundary = useMemo(() => {
    if (fit.degenerate) return [];
    if (line) {
      const seg = clipLineToBox(line, box);
      return seg ? [seg] : [];
    }
    return zeroContour((x, y) => gdaScore(fit, [x, y]), box, CONTOUR_CELLS);
    // box is derived from params.dataset, which `fit` already depends on through `points`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, line, params.dataset]);
  const logistic = useMemo(
    () => (params.showLogisticRegression && points.length > 0 ? fitLogistic(points) : null),
    [params.showLogisticRegression, points],
  );
  const logisticSegment = useMemo(
    () => (logistic ? clipLineToBox(logistic, box) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logistic, params.dataset],
  );

  const gdaAccuracy = fit.degenerate ? null : accuracy(points, (x) => gdaScore(fit, x));
  const lrAccuracy = logistic ? accuracy(points, (x) => lineScore(logistic, x)) : null;

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );
  const movePoint = useCallback(
    (id: number, x: Vec2) => setParams({ movedPoints: withMove(params.movedPoints, id, x) }),
    [params.movedPoints, setParams],
  );
  const removePoint = useCallback(
    (id: number) => {
      if (params.removedPoints.includes(id)) return;
      setParams({ removedPoints: [...params.removedPoints, id] });
      setSelected((s) => (s === id ? null : s));
    },
    [params.removedPoints, setParams],
  );
  const undoEdits = () => {
    setParams({ movedPoints: [], removedPoints: [] });
    setSelected(null);
  };

  // Edit mode: the first EDIT_CAP points of each class become draggable.
  const { draggable, fixed } = useMemo(() => {
    if (!params.editPoints) return { draggable: [] as LabeledPoint[], fixed: points };
    const count = [0, 0];
    const draggable: LabeledPoint[] = [];
    const fixed: LabeledPoint[] = [];
    for (const p of points) {
      if ((count[p.y] as number) < EDIT_CAP) {
        count[p.y] = (count[p.y] as number) + 1;
        draggable.push(p);
      } else fixed.push(p);
    }
    return { draggable, fixed };
  }, [points, params.editPoints]);
  const selectedPoint = selected === null ? null : (points.find((p) => p.id === selected) ?? null);
  const hasEdits = params.movedPoints.length > 0 || params.removedPoints.length > 0;

  const classColor = [theme.negative, theme.positive] as const;
  const ellipseWeight = highlight === 'sigma' ? 3 : 1.75;
  const ellipseOpacity = highlight === 'boundary' ? 0.4 : 1;
  const boundaryWeight = highlight === 'boundary' ? 4 : 2.5;

  /* ---------- readouts ---------- */
  const [c0, c1] = fit.classes;
  const phiTex = `\\hat\\phi_1 = ${fmt(fit.phi)},\\quad n_1 = ${c1.n},\\quad n_0 = ${c0.n}`;
  const muTex =
    `\\htmlClass{sym-mu}{\\hat\\mu_0} = ${vectorTex(c0.mu)},\\quad ` +
    `\\htmlClass{sym-mu}{\\hat\\mu_1} = ${vectorTex(c1.mu)}`;
  const sigmaTex = fit.shared
    ? `\\htmlClass{sym-sigma}{\\hat\\Sigma} = \\frac{n_0\\hat\\Sigma_0 + n_1\\hat\\Sigma_1}{n} = ${matrixTex(fit.pooled)}`
    : `\\htmlClass{sym-sigma}{\\hat\\Sigma_0} = ${matrixTex(c0.sigma)},\\quad ` +
      `\\htmlClass{sym-sigma}{\\hat\\Sigma_1} = ${matrixTex(c1.sigma)}`;
  const lineTex = line
    ? `\\htmlClass{sym-theta}{\\theta} = \\hat\\Sigma^{-1}(\\hat\\mu_1 - \\hat\\mu_0) = ${vectorTex(line.theta)},\\quad ` +
      `\\theta_0 = ${fmt(line.theta0)},\\qquad \\htmlClass{sym-boundary}{\\theta\\T x + \\theta_0 = 0}`
    : null;
  const lrTex = logistic
    ? `\\text{LR: }\\ \\htmlClass{sym-theta}{\\theta} = ${vectorTex(logistic.theta)},\\quad \\theta_0 = ${fmt(logistic.theta0)}`
    : null;

  const axisNote = synthetic
    ? 'synthetic: two Gaussians, class 0 at −20°'
    : `x: ${FEATURE_LABELS[fx]}, y: ${FEATURE_LABELS[fy]}; both standardized`;

  return (
    <div
      className="gdf"
      data-boundary={fit.degenerate ? 'none' : fit.shared ? 'linear' : 'quadratic'}
      data-logistic={logisticSegment ? 'on' : 'off'}
    >
      <div className="gdf-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ x: [-domain, domain], y: [-domain, domain], padding: 0 }}
          preserveAspectRatio="contain"
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian subdivisions={2} />
          <Scatter points={fixed.filter((p) => p.y === 0)} k={0} color={classColor[0]} />
          <Scatter points={fixed.filter((p) => p.y === 1)} k={1} color={classColor[1]} />
          {fit.degenerate
            ? null
            : ([0, 1] as const).map((k) => {
                const e = eigenSymmetric2(fit.cov[k]);
                const angle = majorAxisAngle(e);
                const s1 = Math.sqrt(Math.max(e.values[0], 0));
                const s2 = Math.sqrt(Math.max(e.values[1], 0));
                const mu = fit.classes[k].mu;
                return (
                  <g key={k} data-layer={`ellipse-${k}`} opacity={ellipseOpacity}>
                    <Ellipse
                      center={[mu[0], mu[1]]}
                      radius={[2 * s1, 2 * s2]}
                      angle={angle}
                      color={classColor[k]}
                      fillOpacity={0.06}
                      weight={ellipseWeight * 0.8}
                    />
                    <Ellipse
                      center={[mu[0], mu[1]]}
                      radius={[s1, s2]}
                      angle={angle}
                      color={classColor[k]}
                      fillOpacity={0.1}
                      weight={ellipseWeight}
                    />
                  </g>
                );
              })}
          {([0, 1] as const).map((k) =>
            fit.classes[k].n > 0 ? (
              <g key={k} opacity={highlight === 'boundary' ? 0.5 : 1}>
                <MeanMarker mu={fit.classes[k].mu} color={theme.fg} big={highlight === 'mu'} />
                <Text
                  x={fit.classes[k].mu[0]}
                  y={fit.classes[k].mu[1]}
                  attach="n"
                  attachDistance={16}
                  size={12}
                >
                  {`φ̂${k} = ${fmt(k === 1 ? fit.phi : 1 - fit.phi)}`}
                </Text>
              </g>
            ) : null,
          )}
          <g data-layer="boundary">
            {boundary.map((poly, i) => (
              <Polyline
                key={i}
                points={poly.map((p) => [p[0], p[1]])}
                color={theme.boundary}
                weight={boundaryWeight}
              />
            ))}
          </g>
          {logisticSegment ? (
            <g data-layer="logistic">
              <Polyline
                points={[logisticSegment[0], logisticSegment[1]].map((p) => [p[0], p[1]])}
                color={theme.viz[3]}
                weight={2}
                strokeStyle="dashed"
              />
            </g>
          ) : null}
          {draggable.map((p) => (
            <DraggablePoint
              key={p.id}
              point={p}
              color={classColor[p.y]}
              onMove={movePoint}
              onRemove={removePoint}
              onSelect={setSelected}
            />
          ))}
        </Mafs>
        <p className="gdf-legend" aria-hidden="true">
          <span className="gdf-key" style={{ color: classColor[0] }}>
            ● class 0
          </span>
          <span className="gdf-key" style={{ color: classColor[1] }}>
            ◆ class 1
          </span>
          <span className="gdf-key">× μ̂ₖ, rings 1σ and 2σ</span>
          <span className="gdf-key" style={{ color: theme.boundary }}>
            — Bayes boundary
          </span>
          {logisticSegment ? (
            <span className="gdf-key" style={{ color: theme.viz[3] }}>
              - - logistic regression
            </span>
          ) : null}
        </p>
        <p className="gdf-axes">{axisNote}</p>
      </div>

      <div className="gdf-panel">
        <div className="gdf-math" data-testid="gdf-readout">
          <MathLabel tex={phiTex} display />
          <MathLabel tex={muTex} display />
          {fit.degenerate ? null : <MathLabel tex={sigmaTex} display />}
          {lineTex ? <MathLabel tex={lineTex} display /> : null}
          {lrTex ? <MathLabel tex={lrTex} display /> : null}
        </div>
        {fit.degenerate ? (
          <p className="gdf-note" role="status" data-testid="gdf-degenerate">
            No boundary: {fit.reason}.
          </p>
        ) : (
          <p className="gdf-note" role="status" data-testid="gdf-accuracy">
            Training accuracy: GDA {pct(gdaAccuracy ?? 0)}
            {lrAccuracy !== null ? `, logistic regression ${pct(lrAccuracy)}` : ''}.
          </p>
        )}
        <div className="gdf-toggles">
          <Toggle
            label="Shared covariance"
            checked={params.sharedCovariance}
            onChange={set('sharedCovariance')}
          />
          <Toggle
            label="Logistic regression"
            checked={params.showLogisticRegression}
            onChange={set('showLogisticRegression')}
          />
          <Toggle label="Edit points" checked={params.editPoints} onChange={set('editPoints')} />
        </div>
        {params.editPoints ? (
          <div className="gdf-actions">
            <p className="gdf-hint">
              Tab to a point, arrow keys move it, Delete removes it (up to {EDIT_CAP} per class are
              draggable).
            </p>
            <button
              type="button"
              className="widget-btn"
              disabled={selectedPoint === null}
              onClick={() => selectedPoint && removePoint(selectedPoint.id)}
            >
              Remove selected point
            </button>
            <button type="button" className="widget-btn" disabled={!hasEdits} onClick={undoEdits}>
              Undo point edits
            </button>
          </div>
        ) : null}
      </div>

      <div className="gdf-controls">
        <div className="gdf-choices">
          <Choice
            label="Dataset"
            value={params.dataset}
            options={[
              { value: 'synthetic', label: 'Synthetic' },
              { value: 'adverse', label: 'ADVERSE cohort' },
            ]}
            onChange={set('dataset')}
          />
          {synthetic ? null : (
            <>
              <Choice
                label="x feature"
                value={fx}
                options={ADVERSE_FEATURES.map((f) => ({ value: f, label: f }))}
                onChange={(v: AdverseFeature) => setParams({ features: [v, fy] })}
              />
              <Choice
                label="y feature"
                value={fy}
                options={ADVERSE_FEATURES.map((f) => ({ value: f, label: f }))}
                onChange={(v: AdverseFeature) => setParams({ features: [fx, v] })}
              />
            </>
          )}
        </div>
        <div className="gdf-sliders">
          <Param
            label={synthetic ? 'Points' : 'Patients'}
            tex="n"
            value={params.n}
            min={50}
            max={400}
            step={10}
            defaultValue={initial.n}
            onChange={set('n')}
          />
          {synthetic ? (
            <>
              <Param
                label="Separation of the means"
                tex="{\lVert \mu_1 - \mu_0 \rVert}"
                value={params.separation}
                min={0.5}
                max={4}
                step={0.1}
                defaultValue={initial.separation}
                onChange={set('separation')}
              />
              <Param
                label="Prior of class 1"
                tex="\phi_1"
                value={params.prior}
                min={0.05}
                max={0.95}
                step={0.05}
                defaultValue={initial.prior}
                onChange={set('prior')}
              />
              <Param
                label="Rotation of class 1's covariance"
                unit="°"
                value={params.rotation}
                min={-90}
                max={90}
                step={5}
                defaultValue={initial.rotation}
                onChange={set('rotation')}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
