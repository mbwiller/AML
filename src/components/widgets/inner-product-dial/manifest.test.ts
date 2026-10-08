import { validateWidgetParams } from '../manifests';
import { manifest } from './manifest';

describe('inner-product-dial manifest', () => {
  it('accepts exactly the props lesson 2.3 passes', () => {
    const result = validateWidgetParams(manifest, {
      gradient: [3, 4],
      showCosineCurve: true,
      showHalfSpace: true,
    });
    expect(result.ok, result.errors.join('\n')).toBe(true);
    expect(result.params).toMatchObject({ gradient: [3, 4], angle: 120 });
  });

  it('rejects unknown and out-of-range props', () => {
    expect(validateWidgetParams(manifest, { grad: [1, 1] }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { gradient: [6, 0] }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { gradient: [1, 2, 3] }).ok).toBe(false);
    expect(validateWidgetParams(manifest, { angle: -1 }).ok).toBe(false);
  });

  it('renders a token-colored SVG fallback', () => {
    const svg = manifest.fallback(manifest.params.parse({}));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
    expect(svg).toMatch(/var\(--viz-negative\)/);
    expect(svg).toMatch(/signed length 1\.96/);
  });
});
