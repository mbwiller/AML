import { validateWidgetParams } from '../manifests';
import { manifest } from './manifest';

describe('hessian-classifier manifest', () => {
  it('accepts exactly the props lesson 2.3 passes', () => {
    const result = validateWidgetParams(manifest, {
      eigenvalues: [2, -1],
      rotation: 30,
      showLevelSets: true,
    });
    expect(result.ok, result.errors.join('\n')).toBe(true);
    expect(result.params).toMatchObject({
      eigenvalues: [2, -1],
      rotation: 30,
      higherOrder: 'none',
    });
  });

  it('rejects unknown and out-of-range props', () => {
    expect(validateWidgetParams(manifest, { lambda: [1, 1] }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { eigenvalues: [4, 0] }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { rotation: 120 }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { higherOrder: 'sextic' }).ok).toBe(false);
  });

  it('renders a token-colored SVG fallback with level sets', () => {
    const svg = manifest.fallback(manifest.params.parse({ eigenvalues: [2, -1], rotation: 30 }));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
    expect(svg).toMatch(/<polyline/);
    expect(svg).toMatch(/var\(--viz-boundary\)/);
    expect(svg).toMatch(/a saddle/);
  });
});
