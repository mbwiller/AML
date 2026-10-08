/**
 * `inner-product-dial` (lesson 2.3; rebuilds L4 pp.16-17, the unit circle
 * with two vectors and the "inner product vs angle" cosine curve, with
 * A = ∇f and B = Δx): a fixed gradient g = ∇f(θ), a unit step u the reader
 * turns (dial handle on the plot, or the slider), the projection of g on u
 * whose signed length is the directional derivative D_u f(θ) = gᵀu =
 * ‖g‖ cos φ, the half-plane of descent directions {u : gᵀu < 0}, the
 * steepest-descent direction −g/‖g‖, and the rate plotted against the
 * direction of u.
 *
 * Mafs draws the plane; `math.ts` does the geometry; colors come only from
 * `useVizTheme()`. No animation. See README.md.
 */
import { Coordinates, Line, Mafs, Polygon, Text, useTransformContext, vec, Vector } from 'mafs';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { MathLabel } from '../_shared/math-label';
import { Param, Toggle } from '../_shared/Param';
import { useVizTheme, type VizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { G_MAX, params as paramsSchema, type Params } from './manifest';
import {
  angleBetweenDegrees,
  classifyRate,
  cosineCurve,
  cosineForm,
  descentHalfPlane,
  descentIntervals,
  directionalDerivative,
  directionDegrees,
  norm,
  steepestDirections,
  unitFromDegrees,
  viewHalfWidth,
  wrapDegrees,
  type RateKind,
  type Vec2,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 340;
const figureStateSchema = paramsSchema.partial();

const fmt = (v: number, digits = 2) =>
  Number.isFinite(v)
    ? (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits).replace('-', '−')
    : '—';
const deg = (v: number) => `${fmt(v, Number.isInteger(v) ? 0 : 1)}°`;

const KIND_TEXT: Record<RateKind, string> = {
  ascent: 'gᵀu > 0: f increases along u, to first order.',
  descent: 'gᵀu < 0: f decreases along u. A descent direction.',
  level: 'gᵀu = 0: u is perpendicular to g, so f is level along u to first order.',
  critical: 'g = 0: θ is a critical point. Every direction is level to first order.',
};

/** Axis labels at even values, none within 2 of the origin where the unit vectors live. */
const evenLabel = (v: number) =>
  Math.abs(v) > 2 && v % 2 === 0 ? String(v).replace('-', '−') : '';

/** A hollow diamond on the dial at the steepest-descent direction. */
function SteepestMark({ at, color }: { at: Vec2; color: string }) {
  const { viewTransform, userTransform } = useTransformContext();
  const [x, y] = vec.transform([at[0], at[1]], vec.matrixMult(viewTransform, userTransform));
  const r = 7;
  return (
    <polygon
      points={`${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      aria-hidden="true"
      data-layer="steepest-mark"
    />
  );
}

/**
 * A short arrow drawn in pixel space with a small head, for unit vectors:
 * Mafs' `<Vector>` head is sized for long arrows and swallows a unit one.
 */
function Arrow({
  tip,
  color,
  dashed = false,
  layer,
}: {
  tip: Vec2;
  color: string;
  dashed?: boolean;
  layer: string;
}) {
  const { viewTransform, userTransform } = useTransformContext();
  const matrix = vec.matrixMult(viewTransform, userTransform);
  const [x0, y0] = vec.transform([0, 0], matrix);
  const [x1, y1] = vec.transform([tip[0], tip[1]], matrix);
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1e-6) return null;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const head = Math.min(9, 0.45 * len);
  const bx = x1 - head * ux;
  const by = y1 - head * uy;
  const half = 0.55 * head;
  return (
    <g data-layer={layer} aria-hidden="true">
      <line
        x1={x0}
        y1={y0}
        x2={bx}
        y2={by}
        stroke={color}
        strokeWidth={dashed ? 2 : 3}
        strokeDasharray={dashed ? '4 3' : undefined}
        strokeLinecap="round"
      />
      <polygon
        points={`${x1},${y1} ${bx - half * uy},${by + half * ux} ${bx + half * uy},${by - half * ux}`}
        fill={color}
      />
    </g>
  );
}

/* ---------- the dial: ring, handle, drag and keyboard ---------- */

interface DialProps {
  radius: number;
  angle: number;
  color: string;
  ring: string;
  onAngle: (deg: number) => void;
}

function Dial({ radius, angle, color, ring, onAngle }: DialProps) {
  const { viewTransform, userTransform } = useTransformContext();
  const matrix = vec.matrixMult(viewTransform, userTransform);
  const [cx, cy] = vec.transform([0, 0], matrix);
  const [rx] = vec.transform([radius, 0], matrix);
  const r = rx - cx;
  const u = unitFromDegrees(angle);
  const [hx, hy] = vec.transform([radius * u[0], radius * u[1]], matrix);
  const [dragging, setDragging] = useState(false);

  const angleFromPointer = (e: PointerEvent<SVGGElement>) => {
    const svg = e.currentTarget.ownerSVGElement;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    // Pixel y grows downward; the plot's θ₂ axis grows upward.
    onAngle(Math.round(directionDegrees([p.x - cx, cy - p.y])) % 360);
  };

  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 15,
      PageDown: -15,
    };
    if (e.key === 'Home') {
      e.preventDefault();
      onAngle(0);
      return;
    }
    const step = steps[e.key];
    if (step === undefined) return;
    e.preventDefault();
    onAngle(wrapDegrees(Math.round(angle) + step));
  };

  return (
    <g data-layer="dial">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={ring}
        strokeWidth={1.5}
        strokeDasharray="3 5"
        aria-hidden="true"
      />
      <line
        x1={cx}
        y1={cy}
        x2={hx}
        y2={hy}
        stroke={ring}
        strokeWidth={1}
        strokeDasharray="2 4"
        aria-hidden="true"
      />
      <g
        role="slider"
        tabIndex={0}
        aria-label="Direction of u on the dial"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(angle)}
        aria-valuetext={`${Math.round(angle)} degrees`}
        className={dragging ? 'ipd-handle ipd-handle-dragging' : 'ipd-handle'}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus();
          setDragging(true);
          angleFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (dragging) angleFromPointer(e);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        <circle cx={hx} cy={hy} r={22} fill="none" pointerEvents="all" />
        <circle className="ipd-handle-ring" cx={hx} cy={hy} r={13} fill="none" />
        <circle cx={hx} cy={hy} r={8} fill={color} />
      </g>
    </g>
  );
}

/* ---------- the rate against the direction of u, plain SVG ---------- */

const CW = 320;
const CH = 150;
const CM = { l: 38, r: 16, t: 12, b: 24 };

interface CurveProps {
  g: Vec2;
  angle: number;
  rate: number;
  showHalfSpace: boolean;
  theme: VizTheme;
}

function CosineCurve({ g, angle, rate, showHalfSpace, theme }: CurveProps) {
  const ng = norm(g);
  const yMax = Math.max(ng, 1);
  const sx = (d: number) => CM.l + (d / 360) * (CW - CM.l - CM.r);
  const sy = (v: number) => CM.t + ((yMax - v) / (2 * yMax)) * (CH - CM.t - CM.b);
  const d = cosineCurve(g, 120)
    .map(([a, v], i) => `${i === 0 ? 'M' : 'L'}${sx(a).toFixed(1)} ${sy(v).toFixed(1)}`)
    .join('');
  const summary =
    `The rate gᵀu against the direction of u from 0 to 360 degrees: a cosine of amplitude ${fmt(ng)}` +
    `; at ${Math.round(angle)} degrees it is ${fmt(rate)}.`;

  return (
    <svg
      className="ipd-curve"
      viewBox={`0 0 ${CW} ${CH}`}
      role="img"
      aria-label={summary}
      data-testid="ipd-curve"
    >
      {showHalfSpace
        ? descentIntervals(g).map(([a, b]) => (
            <rect
              key={a}
              x={sx(a)}
              y={CM.t}
              width={sx(b) - sx(a)}
              height={CH - CM.t - CM.b}
              fill={theme.negative}
              fillOpacity={0.12}
              data-layer="descent-band"
            />
          ))
        : null}
      {[yMax, 0, -yMax].map((v) => (
        <g key={v}>
          <line
            x1={CM.l}
            x2={CW - CM.r}
            y1={sy(v)}
            y2={sy(v)}
            stroke={v === 0 ? theme.muted : theme.border}
            strokeDasharray={v === 0 ? undefined : '4 3'}
          />
          <text x={CM.l - 4} y={sy(v) + 4} textAnchor="end" fill={theme.muted} className="ipd-tick">
            {v === 0 ? '0' : `${v > 0 ? '' : '−'}${fmt(Math.abs(v), 1)}`}
          </text>
        </g>
      ))}
      {[0, 90, 180, 270, 360].map((t) => (
        <text
          key={t}
          x={sx(t)}
          y={CH - 6}
          textAnchor="middle"
          fill={theme.muted}
          className="ipd-tick"
        >
          {t}°
        </text>
      ))}
      <path d={d} fill="none" stroke={theme.viz[3]} strokeWidth={2} data-layer="curve" />
      <line
        x1={sx(angle)}
        x2={sx(angle)}
        y1={CM.t}
        y2={CH - CM.b}
        stroke={theme.muted}
        strokeDasharray="2 3"
      />
      <circle
        cx={sx(angle)}
        cy={sy(rate)}
        r={5}
        fill={theme.surface}
        stroke={theme.viz[2]}
        strokeWidth={2.5}
      />
    </svg>
  );
}

/* ---------- the widget ---------- */

export default function InnerProductDial({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();

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
  const setAngle = useCallback((a: number) => setParams({ angle: a }), [setParams]);

  const g: Vec2 = params.gradient;
  const [g1, g2] = g;
  const u = useMemo(() => unitFromDegrees(params.angle), [params.angle]);
  const rate = directionalDerivative(g, u);
  const cosRate = cosineForm(g, u);
  const phi = angleBetweenDegrees(g, u);
  const ng = norm(g);
  const steepest = steepestDirections(g);
  const kind = classifyRate(g, u);
  const w = viewHalfWidth(g);
  // The plot keeps square units, so a wide container shows more than ±w in θ₁;
  // clip the half-plane to a box that covers any aspect ratio.
  const box = useMemo(() => ({ x: [-4 * w, 4 * w] as const, y: [-4 * w, 4 * w] as const }), [w]);
  const half = useMemo(() => descentHalfPlane(g, box), [g, box]);
  const proj: [number, number] = [rate * u[0], rate * u[1]];
  const rateColor = rate < 0 ? theme.negative : theme.positive;
  // The dial is the circle of radius ‖g‖ (or 1 when ‖g‖ < 1): the handle at
  // ‖g‖u has the length of g, as on L4 p.16 where both vectors share a circle.
  const dialRadius = Math.max(ng, 1);

  const thetaTex = String.raw`\htmlClass{sym-theta}{\theta}`;

  return (
    <div className="ipd" data-testid="ipd" data-kind={kind}>
      <div className="ipd-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ x: [-w, w], y: [-w, w], padding: 0 }}
          preserveAspectRatio="contain"
          pan={false}
          zoom={false}
          onClick={(p) => setAngle(Math.round(directionDegrees([p[0], p[1]])) % 360)}
        >
          <Coordinates.Cartesian
            xAxis={{ lines: 1, labels: evenLabel }}
            yAxis={{ lines: 1, labels: evenLabel }}
            subdivisions={false}
          />
          {params.showHalfSpace && half.length > 2 ? (
            <>
              <Polygon
                points={half.map(([x, y]) => [x, y] as vec.Vector2)}
                color={theme.negative}
                fillOpacity={0.1}
                weight={0}
              />
              <Line.ThroughPoints
                point1={[0, 0]}
                point2={[-g2, g1]}
                color={theme.boundary}
                style="dashed"
                weight={1.5}
              />
              <Text
                x={-0.62 * w * (steepest.ascent?.[0] ?? 0) - 0.3 * w * (steepest.ascent?.[1] ?? 0)}
                y={-0.62 * w * (steepest.ascent?.[1] ?? 0) + 0.3 * w * (steepest.ascent?.[0] ?? 0)}
                color={theme.negative}
                size={13}
              >
                gᵀu &lt; 0
              </Text>
            </>
          ) : null}
          {/* the projection of g on u: signed length gᵀu along u */}
          {ng > 0 ? (
            <>
              <Line.Segment point1={[g1, g2]} point2={proj} color={theme.muted} style="dashed" />
              <Line.Segment
                point1={[0, 0]}
                point2={proj}
                color={rateColor}
                weight={5}
                opacity={0.7}
              />
            </>
          ) : null}
          {steepest.descent ? (
            <>
              <Arrow tip={steepest.descent} color={theme.negative} dashed layer="steepest" />
              <SteepestMark
                at={[dialRadius * steepest.descent[0], dialRadius * steepest.descent[1]]}
                color={theme.negative}
              />
              <Text
                x={dialRadius * steepest.descent[0]}
                y={dialRadius * steepest.descent[1]}
                attachDistance={14}
                attach={steepest.descent[0] >= 0 ? 'e' : 'w'}
                color={theme.negative}
                size={13}
              >
                steepest descent
              </Text>
            </>
          ) : null}
          {ng > 0 ? (
            <>
              <Vector tip={[g1, g2]} color={theme.viz[3]} weight={3} />
              <Text
                x={g1}
                y={g2}
                attach={g1 >= 0 ? 'e' : 'w'}
                attachDistance={10}
                color={theme.viz[3]}
                size={15}
              >
                g
              </Text>
            </>
          ) : null}
          <Arrow tip={u} color={theme.viz[2]} layer="u" />
          <Text
            x={u[0]}
            y={u[1]}
            attach={u[0] >= 0 ? 'e' : 'w'}
            attachDistance={8}
            color={theme.viz[2]}
            size={15}
          >
            u
          </Text>
          <Dial
            radius={dialRadius}
            angle={params.angle}
            color={theme.viz[2]}
            ring={theme.muted}
            onAngle={setAngle}
          />
        </Mafs>
        <p className="ipd-legend" aria-hidden="true">
          <span style={{ color: theme.viz[3] }}>→ g = ∇f(θ)</span>
          <span style={{ color: theme.viz[2] }}>
            → unit step u; drag the dial, radius max(‖g‖, 1)
          </span>
          <span style={{ color: rateColor }}>▬ projection of g on u, signed length gᵀu</span>
          {steepest.descent ? (
            <span style={{ color: theme.negative }}>⇢ steepest descent −g/‖g‖</span>
          ) : null}
        </p>
      </div>

      <div className="ipd-panel">
        <dl className="ipd-readout">
          <div>
            <dt>
              <MathLabel tex={`g = \\nabla f(${thetaTex})`} aria-label="Gradient g" />
            </dt>
            <dd>
              <output data-testid="ipd-g">
                ({fmt(g1, 1)}, {fmt(g2, 1)})
              </output>
              <span className="ipd-aside"> ‖g‖ = {fmt(ng)}</span>
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel tex="u" aria-label="Unit step u" />
            </dt>
            <dd>
              <output data-testid="ipd-u">
                ({fmt(u[0])}, {fmt(u[1])})
              </output>
              <span className="ipd-aside"> ϑ = {deg(params.angle)}</span>
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel tex="\varphi" aria-label="Angle between u and g" />
            </dt>
            <dd>
              <output data-testid="ipd-phi">
                {Number.isNaN(phi) ? 'undefined' : deg(Math.round(phi * 10) / 10)}
              </output>
              <span className="ipd-aside"> angle between u and g</span>
            </dd>
          </div>
          <div className="ipd-rate-row">
            <dt>
              <MathLabel
                tex={`D_u f(${thetaTex}) = g^\\top u`}
                aria-label="Directional derivative g transpose u"
              />
            </dt>
            <dd>
              <output data-testid="ipd-rate">{fmt(rate)}</output>
            </dd>
          </div>
          <div>
            <dt>
              <MathLabel
                tex="\lVert g \rVert \cos\varphi"
                aria-label="Norm of g times cosine of phi"
              />
            </dt>
            <dd>
              <output data-testid="ipd-cos">{fmt(cosRate)}</output>
              <span className="ipd-aside"> the same number</span>
            </dd>
          </div>
          {steepest.descent ? (
            <div>
              <dt>
                <MathLabel tex="-g / \lVert g \rVert" aria-label="Steepest descent direction" />
              </dt>
              <dd>
                <output data-testid="ipd-steepest">
                  ({fmt(steepest.descent[0])}, {fmt(steepest.descent[1])})
                </output>
                <span className="ipd-aside"> steepest descent, rate −‖g‖</span>
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="ipd-kind" data-testid="ipd-kind" aria-live="polite">
          {KIND_TEXT[kind]}
        </p>
        {params.showCosineCurve ? (
          <CosineCurve
            g={g}
            angle={params.angle}
            rate={rate}
            showHalfSpace={params.showHalfSpace}
            theme={theme}
          />
        ) : null}
      </div>

      <div className="ipd-controls">
        <div className="ipd-sliders">
          <Param
            label="Direction of u"
            tex="\vartheta"
            unit="°"
            value={params.angle}
            min={0}
            max={359}
            step={1}
            defaultValue={initial.angle}
            onChange={setAngle}
          />
          <Param
            label="Gradient, first component"
            tex="g_1"
            value={g1}
            min={-G_MAX}
            max={G_MAX}
            step={0.5}
            defaultValue={initial.gradient[0]}
            onChange={(v) => setParams({ gradient: [v, g2] })}
          />
          <Param
            label="Gradient, second component"
            tex="g_2"
            value={g2}
            min={-G_MAX}
            max={G_MAX}
            step={0.5}
            defaultValue={initial.gradient[1]}
            onChange={(v) => setParams({ gradient: [g1, v] })}
          />
        </div>
        <div className="ipd-toggles">
          <Toggle
            label="Rate against direction"
            checked={params.showCosineCurve}
            onChange={set('showCosineCurve')}
          />
          <Toggle
            label="Descent half-plane"
            checked={params.showHalfSpace}
            onChange={set('showHalfSpace')}
          />
        </div>
      </div>
    </div>
  );
}
