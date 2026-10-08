import { manifests, validateWidgetParams } from './manifests';
import { registry } from './registry';

describe('widget manifests', () => {
  it('registry and manifests list the same names, and each manifest matches its key', () => {
    expect(Object.keys(manifests).sort()).toEqual(Object.keys(registry).sort());
    for (const [name, m] of Object.entries(manifests)) {
      expect(m.name).toBe(name);
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.challenge.length).toBeGreaterThan(0);
      expect(m.height).toBeGreaterThan(0);
    }
  });

  it('every param has a default, so `<Widget name>` alone is valid', () => {
    for (const m of Object.values(manifests)) {
      const result = validateWidgetParams(m, {});
      expect(result.ok, m.name).toBe(true);
      expect(Object.keys(result.params).sort()).toEqual(Object.keys(m.params.shape).sort());
    }
  });

  it('rejects unknown and out-of-range props with readable messages', () => {
    const m = manifests['gaussian-2d-covariance'];
    if (!m) throw new Error('gaussian-2d-covariance manifest missing');
    const unknown = validateWidgetParams(m, { nope: 1 });
    expect(unknown.ok).toBe(false);
    expect(unknown.errors.join('\n')).toMatch(/nope/);
    const range = validateWidgetParams(m, { rho: 2 });
    expect(range.ok).toBe(false);
    expect(range.errors[0]).toMatch(/^rho: /);
  });

  it('accepts exactly the props lesson 7.1 passes', () => {
    const m = manifests['gaussian-2d-covariance'];
    if (!m) throw new Error('gaussian-2d-covariance manifest missing');
    const result = validateWidgetParams(m, {
      sigmaX: 2,
      sigmaY: 2,
      rho: 0.75,
      showEigenvectors: true,
      showSamples: true,
    });
    expect(result.ok).toBe(true);
    expect(result.params).toMatchObject({ sigmaX: 2, rho: 0.75, n: 200, seed: 7 });
  });

  it('renders a static SVG fallback that uses only token colors', () => {
    const m = manifests['gaussian-2d-covariance'];
    if (!m?.fallback) throw new Error('fallback missing');
    const svg = m.fallback(m.params.parse({}));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
    expect(svg).toMatch(/var\(--viz-1\)/);
  });
});
