/**
 * `hessian-classifier` (lesson 2.3; rebuilds the second-order test stated on
 * L4 p.30, the 1-D picture of L4 pp.27-28, and the saddle points named on
 * L5 p.13): level sets of f(x) = ½xᵀHx with H = Q diag(λ₁, λ₂) Qᵀ, the
 * eigenvectors q₁, q₂, the critical point at 0 classified from the signs of
 * the eigenvalues (minimum, maximum, saddle, or degenerate), the matrix H and
 * its eigenvalues recomputed from it, and the 1-D slices of f along each
 * eigenvector. For a singular H the reader can add a term beyond second order
 * along the flat eigenvector (¼z⁴, −¼z⁴, ⅓z³) and watch the actual critical
 * point change while the Hessian does not.
 *
 * Mafs draws the plane; `math.ts` (with the shared eigen helper and contour
 * routine) does the math; colors come only from `useVizTheme()`. No
 * animation. See README.md.
 */
import { Coordinates, Line, Mafs, Point, Polyline, Text, Vector } from 'mafs';
import { useCallback, useEffect, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { useVizTheme, type VizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { HALF } from './fallback';
import { LAMBDA_MAX, params as paramsSchema, type Params } from './manifest';
import {
  actualKind,
  classifyHessian,
  contourLevels,
  levelSets,
  makeSurface,
  slice,
  type ActualKind,
  type CriticalKind,
  type HigherOrder,
  type Surface,
  type Vec2,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const PLOT_HEIGHT = 340;
const figureStateSchema = paramsSchema.partial();
/**
 * Contours are traced over a box wider than the ±HALF view: the plot keeps
 * square units, so a wide (or, on phones, tall) container shows more.
 */
const REACH = 1.6 * HALF;
const BOX = { x: [-REACH, REACH] as const, y: [-REACH, REACH] as const };

const fmt = (v: number, digits = 2) =>
  (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits).replace('-', '−');
const tex = (v: number, digits = 2) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits);

const TEST_TEXT: Record<CriticalKind, { title: string; body: string }> = {
  minimum: {
    title: 'Minimum',
    body: 'Both eigenvalues are positive, so H is positive definite: f rises in every direction (der-2-3-6).',
  },
  maximum: {
    title: 'Maximum',
    body: 'Both eigenvalues are negative, so H is negative definite: f falls in every direction (der-2-3-7).',
  },
  saddle: {
    title: 'Saddle',
    body: 'One eigenvalue is positive and one negative: f rises along one eigenvector and falls along the other (der-2-3-7).',
  },
  degenerate: {
    title: 'Degenerate',
    body: 'An eigenvalue is 0, so the second-order test is silent: terms beyond second order decide.',
  },
};

const ACTUAL_TEXT: Record<ActualKind, string> = {
  'strict-minimum': 'a strict local minimum',
  'strict-maximum': 'a strict local maximum',
  saddle: 'a saddle point (neither a minimum nor a maximum)',
  'non-strict-minimum': 'a minimum that is not strict: f is flat along a line through it',
  'non-strict-maximum': 'a maximum that is not strict: f is flat along a line through it',
  constant: 'not isolated: f is 0 everywhere',
};

const TERM_OPTIONS: { value: HigherOrder; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'quartic', label: '+¼ z⁴' },
  { value: 'negQuartic', label: '−¼ z⁴' },
  { value: 'cubic', label: '⅓ z³' },
];

function termTex(term: HigherOrder, k: 0 | 1): string {
  const z = `(q_${k + 1}^\\top x)`;
  switch (term) {
    case 'quartic':
      return ` + \\tfrac14 ${z}^4`;
    case 'negQuartic':
      return ` - \\tfrac14 ${z}^4`;
    case 'cubic':
      return ` + \\tfrac13 ${z}^3`;
    default:
      return '';
  }
}

/**
 * Where to put an eigenvector's label so it stays inside a 360 px plot:
 * centered just above the tip of a mostly horizontal arrow (offset along the
 * upward normal, in plot units), beside the tip of a mostly vertical one.
 * Only Mafs' horizontal `attach` is used; its vertical offsets run opposite
 * to the plot's y axis.
 */
function labelPlacement(q: Vec2): {
  x: number;
  y: number;
  attach?: 'e' | 'w';
  attachDistance?: number;
} {
  const tip: Vec2 = [1.5 * q[0], 1.5 * q[1]];
  if (Math.abs(q[0]) >= Math.abs(q[1])) {
    const up: Vec2 = q[0] >= 0 ? [-q[1], q[0]] : [q[1], -q[0]];
    return { x: tip[0] + 0.4 * up[0], y: tip[1] + 0.4 * up[1] };
  }
  return { x: tip[0], y: tip[1], attach: q[0] >= 0 ? 'e' : 'w', attachDistance: 12 };
}

/* ---------- 1-D slices along the eigenvectors, plain SVG ---------- */

const SW = 320;
const SH = 140;
const SM = { l: 34, r: 10, t: 10, b: 22 };

function Slices({ s, colors, theme }: { s: Surface; colors: [string, string]; theme: VizTheme }) {
  const ts = Array.from({ length: 121 }, (_, i) => -HALF + (2 * HALF * i) / 120);
  const curves = ([0, 1] as const).map((k) => ts.map((t) => slice(s, k, t)));
  const all = curves.flat();
  // The range always contains 0 (f at the critical point) and is at least 1 tall.
  let yHi = Math.max(0, ...all);
  let yLo = Math.min(0, ...all);
  if (yHi - yLo < 1) {
    if (yHi > -yLo) yHi = yLo + 1;
    else yLo = yHi - 1;
  }
  const sx = (t: number) => SM.l + ((t + HALF) / (2 * HALF)) * (SW - SM.l - SM.r);
  const sy = (v: number) => SM.t + ((yHi - v) / (yHi - yLo)) * (SH - SM.t - SM.b);
  const path = (vals: number[]) =>
    vals
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(ts[i] ?? 0).toFixed(1)} ${sy(v).toFixed(1)}`)
      .join('');
  const describe = (k: 0 | 1) => {
    const a = slice(s, k, -1);
    const b = slice(s, k, 1);
    return `along q${k + 1}, f(−q${k + 1}) = ${fmt(a)} and f(q${k + 1}) = ${fmt(b)}`;
  };
  return (
    <svg
      className="hc-slices"
      viewBox={`0 0 ${SW} ${SH}`}
      role="img"
      aria-label={`f along each eigenvector through the critical point, t from −${HALF} to ${HALF}: ${describe(0)}; ${describe(1)}.`}
      data-testid="hc-slices"
    >
      {[...new Set([yHi, 0, yLo])].map((v) => (
        <g key={v}>
          <line
            x1={SM.l}
            x2={SW - SM.r}
            y1={sy(v)}
            y2={sy(v)}
            stroke={v === 0 ? theme.muted : theme.border}
          />
          <text x={SM.l - 4} y={sy(v) + 4} textAnchor="end" fill={theme.muted} className="hc-tick">
            {v === 0 ? '0' : fmt(v, 1)}
          </text>
        </g>
      ))}
      {[-HALF, 0, HALF].map((t) => (
        <text
          key={t}
          x={sx(t)}
          y={SH - 6}
          textAnchor="middle"
          fill={theme.muted}
          className="hc-tick"
        >
          {t === 0 ? 't = 0' : fmt(t, 0)}
        </text>
      ))}
      <path
        d={path(curves[0] ?? [])}
        fill="none"
        stroke={colors[0]}
        strokeWidth={2.5}
        data-layer="slice-1"
      />
      <path
        d={path(curves[1] ?? [])}
        fill="none"
        stroke={colors[1]}
        strokeWidth={2.5}
        strokeDasharray="6 4"
        data-layer="slice-2"
      />
    </svg>
  );
}

/* ---------- the widget ---------- */

export default function HessianClassifier({
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

  const [l1, l2] = params.eigenvalues;
  const s = useMemo(
    () => makeSurface(l1, l2, params.rotation, params.higherOrder),
    [l1, l2, params.rotation, params.higherOrder],
  );
  const kind = classifyHessian(s.h);
  const actual = actualKind(s);
  const sets = useMemo(
    () => (params.showLevelSets ? levelSets(s, BOX, contourLevels(s.eigen, HALF), 96) : []),
    [s, params.showLevelSets],
  );

  const qColors: [string, string] = [theme.viz[2], theme.viz[0]];
  const qColor = (k: number) => (k === 0 ? qColors[0] : qColors[1]);
  const [q1, q2] = s.vectors;
  const matrixTex =
    `H = Q\\Lambda Q^\\top = \\begin{bmatrix} ${tex(s.h.a)} & ${tex(s.h.b)} \\\\ ` +
    `${tex(s.h.b)} & ${tex(s.h.c)} \\end{bmatrix}`;
  const fTex = `f(x) = \\tfrac12\\, x^\\top H x${termTex(params.higherOrder, s.flat)}`;
  const eigTex = `\\operatorname{eig}(H) = \\{${tex(s.eigen.values[0])},\\ ${tex(s.eigen.values[1])}\\}`;
  const detTex =
    `\\det H = ${tex(s.h.a * s.h.c - s.h.b * s.h.b)},\\quad ` + `\\tr H = ${tex(s.h.a + s.h.c)}`;
  const test = TEST_TEXT[kind];

  return (
    <div className="hc" data-testid="hc" data-kind={kind} data-actual={actual}>
      <div className="hc-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ x: [-HALF, HALF], y: [-HALF, HALF], padding: 0 }}
          preserveAspectRatio="contain"
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian
            xAxis={{ lines: 1, labels: (v) => (v === 0 ? '' : String(v).replace('-', '−')) }}
            yAxis={{ lines: 1, labels: (v) => (v === 0 ? '' : String(v).replace('-', '−')) }}
            subdivisions={2}
          />
          {sets.flatMap(({ level, lines }) =>
            lines.map((line, i) => (
              <Polyline
                key={`${level}-${i}`}
                points={line.map(([x, y]) => [x, y])}
                color={level === 0 ? theme.boundary : level > 0 ? theme.viz[1] : theme.viz[5]}
                weight={level === 0 ? 3 : 1.75}
                fillOpacity={0}
                strokeStyle={level < 0 ? 'dashed' : 'solid'}
                svgPolylineProps={
                  { 'data-level': level > 0 ? 'pos' : level < 0 ? 'neg' : 'zero' } as object
                }
              />
            )),
          )}
          {params.showEigenvectors ? (
            <>
              {s.vectors.map((q, k) => (
                <Line.ThroughPoints
                  key={k}
                  point1={[0, 0]}
                  point2={[q[0], q[1]]}
                  color={qColor(k)}
                  opacity={0.35}
                  style="dashed"
                  weight={1}
                />
              ))}
              <Vector tip={[1.5 * q1[0], 1.5 * q1[1]]} color={qColors[0]} weight={3} />
              <Vector tip={[1.5 * q2[0], 1.5 * q2[1]]} color={qColors[1]} weight={3} />
              <Text {...labelPlacement(q1)} color={qColors[0]} size={14}>
                {`q₁, λ₁ = ${fmt(l1, 1)}`}
              </Text>
              <Text {...labelPlacement(q2)} color={qColors[1]} size={14}>
                {`q₂, λ₂ = ${fmt(l2, 1)}`}
              </Text>
            </>
          ) : null}
          <Point x={0} y={0} color={theme.fg} />
        </Mafs>
        <p className="hc-legend" aria-hidden="true">
          {params.showLevelSets ? (
            <>
              <span style={{ color: theme.viz[1] }}>━ f &gt; 0</span>
              <span style={{ color: theme.viz[5] }}>╍ f &lt; 0</span>
              <span style={{ color: theme.boundary }}>━ f = 0</span>
            </>
          ) : null}
          <span>● critical point x = 0</span>
        </p>
      </div>

      <div className="hc-panel">
        <div className="hc-verdict" data-testid="hc-verdict">
          <p className="hc-verdict-title">
            Second-order test: <strong data-testid="hc-kind">{test.title}</strong>
          </p>
          <p className="hc-verdict-body">{test.body}</p>
          <p className="hc-verdict-body" data-testid="hc-actual">
            This f has {ACTUAL_TEXT[actual]} at x = 0.
          </p>
        </div>
        <div className="hc-math">
          <MathLabel tex={fTex} display />
          <MathLabel tex={matrixTex} display />
          <MathLabel tex={eigTex} display />
          <MathLabel tex={detTex} display />
        </div>
        <Slices s={s} colors={qColors} theme={theme} />
        <p className="hc-legend" aria-hidden="true">
          <span style={{ color: qColors[0] }}>━ f(t q₁)</span>
          <span style={{ color: qColors[1] }}>╍ f(t q₂)</span>
        </p>
      </div>

      <div className="hc-controls">
        <div className="hc-sliders">
          <Param
            label="First eigenvalue"
            tex="\lambda_1"
            value={l1}
            min={-LAMBDA_MAX}
            max={LAMBDA_MAX}
            step={0.1}
            defaultValue={initial.eigenvalues[0]}
            onChange={(v) => setParams({ eigenvalues: [v, l2] })}
          />
          <Param
            label="Second eigenvalue"
            tex="\lambda_2"
            value={l2}
            min={-LAMBDA_MAX}
            max={LAMBDA_MAX}
            step={0.1}
            defaultValue={initial.eigenvalues[1]}
            onChange={(v) => setParams({ eigenvalues: [l1, v] })}
          />
          <Param
            label="Rotation of the eigenvectors"
            unit="°"
            value={params.rotation}
            min={-90}
            max={90}
            step={1}
            defaultValue={initial.rotation}
            onChange={set('rotation')}
          />
        </div>
        <Choice
          label={`Term beyond second order, along the flatter eigenvector q${s.flat + 1} (z = q${s.flat + 1}ᵀx)`}
          value={params.higherOrder}
          options={TERM_OPTIONS}
          onChange={set('higherOrder')}
        />
        <div className="hc-toggles">
          <Toggle
            label="Level sets"
            checked={params.showLevelSets}
            onChange={set('showLevelSets')}
          />
          <Toggle
            label="Eigenvectors"
            checked={params.showEigenvectors}
            onChange={set('showEigenvectors')}
          />
        </div>
      </div>
    </div>
  );
}
