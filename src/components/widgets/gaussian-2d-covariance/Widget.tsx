/**
 * `gaussian-2d-covariance` (lesson 7.1; rebuilds L10 p.12 and the p.14
 * quartet): σx, σy, ρ sliders; a seeded scatter from N(0, Σ); the 1σ and 2σ
 * level-set ellipses; the eigenvectors scaled by √λ; the matrix Σ, its
 * eigenvalues, and its determinant typeset live beside the plot.
 *
 * Mafs draws the plane, ellipses, and vectors; D3 (d3-random) supplies the
 * seeded draws; the math is in `math.ts`. Colors come only from
 * `useVizTheme()`. See README.md.
 */
import { Coordinates, Ellipse, Mafs, Vector, useTransformContext, vec } from 'mafs';
import { useCallback, useMemo } from 'react';

import { MathLabel } from '../_shared/math-label';
import { Param, Toggle } from '../_shared/Param';
import { useSeededRandom } from '../_shared/useSeededRandom';
import { useVizTheme } from '../_shared/useVizTheme';
import type { WidgetProps } from '../types';
import { DOMAIN } from './fallback';
import type { Params } from './manifest';
import {
  covarianceMatrix,
  determinant,
  eigenSymmetric2,
  majorAxisAngle,
  standardNormals,
  transformSamples,
  type Vec2,
} from './math';

export { manifest } from './manifest';

const PLOT_HEIGHT = 360;
const VIEW = { x: [-DOMAIN, DOMAIN] as [number, number], y: [-DOMAIN, DOMAIN] as [number, number] };

/** One `<g>` of circles in pixel space; cheaper than 400 Mafs `<Point>`s. */
function Scatter({ points, color }: { points: readonly Vec2[]; color: string }) {
  const { viewTransform, userTransform } = useTransformContext();
  const matrix = vec.matrixMult(viewTransform, userTransform);
  return (
    <g fill={color} fillOpacity={0.5} aria-hidden="true" data-layer="scatter">
      {points.map((p, i) => {
        const [cx, cy] = vec.transform([p[0], p[1]], matrix);
        return <circle key={i} cx={cx} cy={cy} r={2.5} />;
      })}
    </g>
  );
}

const fmt = (v: number) => (Object.is(v, -0) ? '0.00' : v.toFixed(2));

export default function Gaussian2dCovariance({ params, initial, setParams }: WidgetProps<Params>) {
  const theme = useVizTheme();
  const rng = useSeededRandom(params.seed);

  const sigma = useMemo(
    () => covarianceMatrix(params.sigmaX, params.sigmaY, params.rho),
    [params.sigmaX, params.sigmaY, params.rho],
  );
  const eigen = useMemo(() => eigenSymmetric2(sigma), [sigma]);
  const angle = majorAxisAngle(eigen);
  const det = determinant(sigma);

  // Standard normals depend only on (n, seed); Σ changes re-use them.
  const z = useMemo(() => standardNormals(params.n, rng), [params.n, rng]);
  const points = useMemo(
    () => (params.showSamples ? transformSamples(z, sigma) : []),
    [z, sigma, params.showSamples],
  );

  const set = useCallback(
    <K extends keyof Params>(key: K) =>
      (value: Params[K]) =>
        setParams({ [key]: value } as Partial<Params>),
    [setParams],
  );

  const [l1, l2] = eigen.values;
  const [v1, v2] = eigen.vectors;
  const s1 = Math.sqrt(Math.max(l1, 0));
  const s2 = Math.sqrt(Math.max(l2, 0));

  const matrixTex =
    `\\htmlClass{sym-sigma}{\\Sigma} = \\begin{bmatrix} ${fmt(sigma.a)} & ${fmt(sigma.b)} \\\\ ` +
    `${fmt(sigma.b)} & ${fmt(sigma.c)} \\end{bmatrix}`;
  const eigenTex =
    `\\lambda_1 = ${fmt(l1)},\\quad \\lambda_2 = ${fmt(l2)},\\quad ` +
    `\\det\\htmlClass{sym-sigma}{\\Sigma} = ${fmt(det)}`;

  return (
    <div className="g2c">
      <div className="g2c-plot">
        <Mafs
          height={PLOT_HEIGHT}
          viewBox={{ ...VIEW, padding: 0 }}
          preserveAspectRatio="contain"
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian subdivisions={2} />
          {points.length > 0 ? <Scatter points={points} color={theme.viz[0]} /> : null}
          <Ellipse
            center={[0, 0]}
            radius={[2 * s1, 2 * s2]}
            angle={angle}
            color={theme.viz[1]}
            fillOpacity={0.06}
            weight={1.5}
          />
          <Ellipse
            center={[0, 0]}
            radius={[s1, s2]}
            angle={angle}
            color={theme.viz[1]}
            fillOpacity={0.12}
            weight={2}
          />
          {params.showEigenvectors ? (
            <>
              <Vector tip={[s1 * v1[0], s1 * v1[1]]} color={theme.viz[3]} weight={2.5} />
              <Vector tip={[s2 * v2[0], s2 * v2[1]]} color={theme.viz[3]} weight={2.5} />
            </>
          ) : null}
        </Mafs>
        <p className="g2c-legend" aria-hidden="true">
          <span className="g2c-key" style={{ color: theme.viz[0] }}>
            ● samples
          </span>
          <span className="g2c-key" style={{ color: theme.viz[1] }}>
            ◯ 1σ and 2σ level sets
          </span>
          {params.showEigenvectors ? (
            <span className="g2c-key" style={{ color: theme.viz[3] }}>
              → eigenvectors, length √λ
            </span>
          ) : null}
        </p>
      </div>

      <div className="g2c-panel">
        {params.showMatrix ? (
          <div className="g2c-math" data-testid="g2c-matrix">
            <MathLabel tex={matrixTex} display />
            <MathLabel tex={eigenTex} display />
          </div>
        ) : null}

        <div className="g2c-params">
          <Param
            label="Standard deviation of x"
            tex="\sigma_x"
            value={params.sigmaX}
            min={0.2}
            max={3}
            step={0.05}
            defaultValue={initial.sigmaX}
            onChange={set('sigmaX')}
          />
          <Param
            label="Standard deviation of y"
            tex="\sigma_y"
            value={params.sigmaY}
            min={0.2}
            max={3}
            step={0.05}
            defaultValue={initial.sigmaY}
            onChange={set('sigmaY')}
          />
          <Param
            label="Correlation"
            tex="\rho"
            value={params.rho}
            min={-0.95}
            max={0.95}
            step={0.05}
            defaultValue={initial.rho}
            onChange={set('rho')}
          />
          <Param
            label="Samples"
            tex="n"
            value={params.n}
            min={0}
            max={400}
            step={10}
            defaultValue={initial.n}
            onChange={set('n')}
          />
          <div className="g2c-toggles">
            <Toggle
              label="Eigenvectors"
              checked={params.showEigenvectors}
              onChange={set('showEigenvectors')}
            />
            <Toggle label="Matrix" checked={params.showMatrix} onChange={set('showMatrix')} />
            <Toggle label="Samples" checked={params.showSamples} onChange={set('showSamples')} />
          </div>
        </div>
      </div>
    </div>
  );
}
