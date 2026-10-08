import { validateWidgetParams } from '../manifests';
import { manifest } from './manifest';

describe('dgp-sampler manifest', () => {
  it('accepts exactly the props lesson 2.1 passes', () => {
    const result = validateWidgetParams(manifest, {
      alpha: 0,
      beta: 1,
      sigmaX: 1,
      sigmaEps: 1,
      n: 20,
      showConditionalMean: true,
    });
    expect(result.ok, result.errors.join('\n')).toBe(true);
    expect(result.params).toMatchObject({ n: 20, seed: 1, curve: 'r2' });
  });

  it('rejects unknown and out-of-range props', () => {
    expect(validateWidgetParams(manifest, { sigma: 1 }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { sigmaEps: -1 }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { n: 2.5 }).ok).toBe(false);
  });

  it('renders a token-colored SVG fallback', () => {
    const svg = manifest.fallback(manifest.params.parse({}));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
    expect(svg.match(/<circle/g)).toHaveLength(20);
    expect(svg).toMatch(/var\(--viz-4\)/);
  });
});
