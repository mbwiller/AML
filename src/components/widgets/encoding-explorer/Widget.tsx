/**
 * `encoding-explorer` (lesson 1.1; rebuilds the L2 pp.9–10 poll on how to
 * represent the zip codes 10040–10044): one categorical column encoded as an
 * integer code, a standardized code, one-hot, or one-hot with the first
 * column dropped; the design matrix X it produces (with or without the
 * intercept column), its column count and rank, the least-squares fit of a
 * target per category, and which encodings can reproduce every target.
 * With one-hot and an intercept the reader slides along the null direction
 * (1, −1, …, −1) and watches θ change while the predictions stay put.
 *
 * The math is in `math.ts`; the chart geometry in `chart.ts`. Colors come
 * only from `useVizTheme()`. See README.md.
 */
import { useCallback, useEffect, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Choice, Param, Toggle } from '../_shared/Param';
import { useVizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { CHART, chartBars, gridTicks, yToPx } from './chart';
import { activeEncoding } from './fallback';
import { params as paramsSchema, type Params } from './manifest';
import {
  ENCODING_LABELS,
  defaultTargets,
  designMatrix,
  leastSquares,
  numericCodes,
  shiftAlongNull,
  summarize,
  targetsFor,
  type Encoding,
  type LeastSquares,
} from './math';
import './styles.css';

export { manifest } from './manifest';

const figureStateSchema = paramsSchema.partial();

/** Fixed two decimals with a real minus sign and no "−0.00". */
function fmt(v: number, digits = 2): string {
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return (0).toFixed(digits);
  return v < 0 ? `−${s}` : s;
}

/** A design-matrix entry: integers as is, others to two decimals. */
function cell(v: number): string {
  return Number.isInteger(v) ? fmt(v, 0) : fmt(v);
}

const texNum = (v: number) => fmt(v).replace('−', '-');

function modelTex(encoding: Encoding, intercept: boolean, K: number): string {
  const t = (j: number | string) => `\\htmlClass{sym-theta}{\\theta_{${j}}}`;
  const head = `\\htmlClass{sym-yhat}{\\hat y_k} = `;
  const b0 = intercept ? `${t(0)} + ` : '';
  switch (encoding) {
    case 'integer':
      return `${head}${b0}${t(1)}\\, c_k`;
    case 'standardized':
      return `${head}${b0}${t(1)}\\, \\frac{c_k - m}{s}`;
    case 'one-hot':
      return `${head}${b0}\\sum_{j=1}^{${K}} ${t('j')}\\,\\ind{j = k}`;
    case 'one-hot-drop-first':
      return `${head}${b0}\\sum_{j=2}^{${K}} ${t('j')}\\,\\ind{j = k}`;
  }
}

function explain(
  encoding: Encoding,
  intercept: boolean,
  fit: LeastSquares,
  categories: readonly string[],
): string {
  const K = categories.length;
  const first = categories[0] ?? '';
  const fits = fit.exact
    ? 'These targets are reproduced exactly.'
    : `These targets cannot all be reproduced: the largest miss is ${fmt(fit.maxAbsResidual)}.`;
  switch (encoding) {
    case 'integer':
    case 'standardized': {
      const lead =
        encoding === 'standardized'
          ? 'Standardizing is an affine change of the code, so the predictions are those of the integer code; only θ differs. '
          : '';
      return intercept
        ? `${lead}Neighboring categories differ by the same θ₁, so the predictions are equally spaced and ordered by the code: a middle category can never be the highest. ${fits}`
        : `${lead}Without θ₀ the line must pass through 0 where the code is 0. ${fits}`;
    }
    case 'one-hot':
      return intercept
        ? `The ${K} indicator columns add up to the intercept column, so X has ${fit.p} columns but rank ${fit.rank}. The predictions are unique; θ is not: add c to θ₀ and subtract c from every θₖ and nothing changes. Slide c below.`
        : `ŷₖ = θₖ: every category has its own parameter, so any targets are reachable and θ is unique. ${fits}`;
    case 'one-hot-drop-first':
      return intercept
        ? `${first} is the reference category: θ₀ is its prediction and each θₖ is the difference from it. ${fit.p} columns, rank ${fit.rank}: θ is unique. ${fits}`
        : `Without θ₀ the reference category ${first} has an all-zero row, so its prediction is pinned at 0. ${fits}`;
  }
}

export default function EncodingExplorer({
  params,
  initial,
  setParams,
  figureState,
}: WidgetProps<Params>) {
  const theme = useVizTheme();

  // A revealed <Step figureState> may set any param.
  useEffect(() => {
    if (!figureState || typeof figureState !== 'object') return;
    const parsed = figureStateSchema.safeParse(figureState);
    if (!parsed.success) return;
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    ) as Partial<Params>;
    if (Object.keys(patch).length > 0) setParams(patch);
  }, [figureState, setParams]);

  const { categories, intercept } = params;
  const K = categories.length;
  const encoding = activeEncoding(params);
  const y = useMemo(() => targetsFor(K, params.targets), [K, params.targets]);
  const initialY = useMemo(() => targetsFor(K, initial.targets), [K, initial.targets]);

  const design = useMemo(
    () => designMatrix(categories, encoding, intercept),
    [categories, encoding, intercept],
  );
  const fit = useMemo(() => leastSquares(design.X, y), [design, y]);
  const theta = useMemo(
    () => shiftAlongNull(fit.theta, fit.nullDirection, params.shift),
    [fit, params.shift],
  );
  const summary = useMemo(
    () => params.encodings.map((e) => summarize(categories, e, intercept, y)),
    [params.encodings, categories, intercept, y],
  );
  const bars = useMemo(() => chartBars(categories, y, fit.fitted), [categories, y, fit.fitted]);
  const codes = useMemo(() => numericCodes(categories), [categories]);
  const numericNote =
    encoding === 'integer' || encoding === 'standardized'
      ? codes[0] === 0 && categories[0] !== '0'
        ? 'Code cₖ = position 0, 1, …, K − 1 (the categories are not numbers).'
        : 'Code cₖ = the category read as a number.'
      : null;

  const setTarget = useCallback(
    (k: number) => (value: number) => {
      const next = targetsFor(K, params.targets);
      next[k] = value;
      setParams({ targets: next });
    },
    [K, params.targets, setParams],
  );

  const thetaTex =
    `\\htmlClass{sym-theta}{\\hat\\theta}${fit.unique || params.shift === 0 ? '' : ' + c\\,v'} = (` +
    theta.map(texNum).join(',\\ ') +
    ')^{\\T}';
  const nullTex = fit.nullDirection
    ? `v = (${fit.nullDirection.map((v) => texNum(v).replace('.00', '')).join(',\\ ')})^{\\T},\\quad X v = 0`
    : null;

  const inner = CHART.width - CHART.left - CHART.right;

  return (
    <div
      className="encx"
      data-encoding={encoding}
      data-columns={fit.p}
      data-rank={fit.rank}
      data-exact={fit.exact ? 'yes' : 'no'}
      data-unique={fit.unique ? 'yes' : 'no'}
    >
      <div className="encx-controls">
        {params.encodings.length > 1 ? (
          <Choice
            label="Encoding"
            value={encoding}
            options={params.encodings.map((e) => ({ value: e, label: ENCODING_LABELS[e] }))}
            onChange={(v: Encoding) => setParams({ encoding: v, shift: 0 })}
          />
        ) : null}
        <Toggle
          label="Intercept column θ₀"
          checked={intercept}
          onChange={(v) => setParams({ intercept: v, shift: 0 })}
        />
      </div>

      <div className="encx-matrix-block">
        <div className="encx-scroll">
          <table className="encx-matrix" data-testid="encx-matrix">
            <caption>
              Design matrix X ({K} × {fit.p}) beside the targets y and the fit ŷ
            </caption>
            <thead>
              <tr>
                <th scope="col">category</th>
                {design.names.map((name, j) => (
                  <th
                    key={name}
                    scope="col"
                    className={design.kinds[j] === 'intercept' ? 'encx-col-intercept' : undefined}
                  >
                    {name}
                  </th>
                ))}
                <th scope="col" className="encx-col-y">
                  y
                </th>
                <th scope="col" className="encx-col-y">
                  ŷ
                </th>
              </tr>
            </thead>
            <tbody>
              {design.X.map((row, k) => (
                <tr key={categories[k]}>
                  <th scope="row">{categories[k]}</th>
                  {row.map((v, j) => (
                    <td
                      key={j}
                      className={
                        design.kinds[j] === 'intercept'
                          ? 'encx-col-intercept'
                          : v === 1 && encoding.startsWith('one-hot')
                            ? 'encx-one'
                            : undefined
                      }
                    >
                      {cell(v)}
                    </td>
                  ))}
                  <td className="encx-col-y">{fmt(y[k] ?? 0, 1)}</td>
                  <td className="encx-col-y">{fmt(fit.fitted[k] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {numericNote ? <p className="encx-hint">{numericNote}</p> : null}
        <p className="encx-shape" data-testid="encx-shape">
          {fit.p} columns · rank {fit.rank} · θ {fit.unique ? 'unique' : 'not unique'} ·{' '}
          {fit.exact ? 'fits every target' : 'misses some targets'}
        </p>
        <div className="encx-math">
          <MathLabel tex={modelTex(encoding, intercept, K)} display />
          <MathLabel tex={thetaTex} display />
          {nullTex ? <MathLabel tex={nullTex} display /> : null}
        </div>
        <p className="encx-note" role="status" aria-live="polite" data-testid="encx-note">
          {explain(encoding, intercept, fit, categories)}
        </p>
        {fit.nullDirection ? (
          <Param
            label="Shift c along the null direction"
            tex="c"
            value={params.shift}
            min={-5}
            max={5}
            step={0.5}
            defaultValue={initial.shift}
            onChange={(v) => setParams({ shift: v })}
          />
        ) : null}
      </div>

      <div className="encx-chart-block">
        <svg
          className="encx-chart"
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          role="img"
          aria-label={`Targets and fitted values: ${categories
            .map((c, k) => `${c} target ${fmt(y[k] ?? 0, 1)}, fit ${fmt(fit.fitted[k] ?? 0)}`)
            .join('; ')}`}
        >
          <g data-layer="grid">
            {gridTicks().map((t) => (
              <g key={t.v}>
                <line
                  x1={CHART.left}
                  x2={CHART.left + inner}
                  y1={t.y}
                  y2={t.y}
                  stroke={theme.border}
                />
                <text
                  x={CHART.left - 4}
                  y={t.y + 4}
                  textAnchor="end"
                  fill={theme.muted}
                  fontSize={10}
                >
                  {t.v}
                </text>
              </g>
            ))}
          </g>
          <g data-layer="fit" fill={theme.viz[1]} fillOpacity={0.55}>
            {bars.map((b) => (
              <rect
                key={b.k}
                className="encx-bar"
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
              />
            ))}
          </g>
          <g data-layer="clip" fill={theme.fg}>
            {bars
              .filter((b) => b.clipped)
              .map((b) => {
                const yy = b.clipped === 'above' ? CHART.top : yToPx(0);
                const dir = b.clipped === 'above' ? -1 : 1;
                return (
                  <path
                    key={b.k}
                    d={`M${b.cx - 5} ${yy}L${b.cx + 5} ${yy}L${b.cx} ${yy + 7 * dir}Z`}
                  />
                );
              })}
          </g>
          <g data-layer="targets" fill={theme.surface} stroke={theme.fg} strokeWidth={2}>
            {bars.map((b) => (
              <circle key={b.k} className="encx-dot" cx={b.cx} cy={b.ty} r={4.5} />
            ))}
          </g>
          <g fill={theme.fg} fontSize={10} textAnchor="middle">
            {bars.map((b) => (
              <text key={b.k} x={b.cx} y={CHART.height - 8}>
                {b.label}
              </text>
            ))}
          </g>
        </svg>
        <p className="encx-legend" aria-hidden="true">
          <span>○ target y</span>
          <span style={{ color: theme.viz[1] }}>▮ fitted ŷ</span>
          <span>▲ ŷ off the scale</span>
        </p>

        <div className="encx-scroll">
          <table className="encx-summary" data-testid="encx-summary">
            <caption>Every offered encoding, {intercept ? 'with' : 'without'} an intercept</caption>
            <thead>
              <tr>
                <th scope="col">encoding</th>
                <th scope="col">
                  <abbr title="columns">p</abbr>
                </th>
                <th scope="col">rank</th>
                <th scope="col">unique θ</th>
                <th scope="col">exact</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr
                  key={s.encoding}
                  data-encoding={s.encoding}
                  className={s.encoding === encoding ? 'encx-active' : undefined}
                >
                  <th scope="row">{ENCODING_LABELS[s.encoding]}</th>
                  <td>{s.p}</td>
                  <td>{s.rank}</td>
                  <td>{s.unique ? '✓ yes' : '✗ no'}</td>
                  <td data-testid={`encx-exact-${s.encoding}`}>{s.exact ? '✓ yes' : '✗ no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="encx-targets">
        {categories.map((c, k) => (
          <Param
            key={c}
            label={`Target for ${c}`}
            tex={`y_{${k + 1}}`}
            value={y[k] ?? 0}
            min={0}
            max={10}
            step={0.1}
            defaultValue={initialY[k] ?? defaultTargets(K)[k] ?? 0}
            onChange={setTarget(k)}
          />
        ))}
      </div>
    </div>
  );
}
