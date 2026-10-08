import { decodeStateLink, encodeStateLink, withStateLink } from './state-link';

describe('state link', () => {
  const params = { sigmaX: 1.5, sigmaY: 0.8, rho: -0.3, n: 200, seed: 7, showMatrix: true };

  it('round-trips params through a base64url hash', () => {
    const encoded = encodeStateLink('gaussian-2d-covariance', params);
    expect(encoded.startsWith('w=gaussian-2d-covariance:')).toBe(true);
    expect(encoded.split(':')[1]).not.toMatch(/[+/=]/);
    expect(decodeStateLink(`#${encoded}`)).toEqual({ name: 'gaussian-2d-covariance', params });
    expect(decodeStateLink(encoded)).toEqual({ name: 'gaussian-2d-covariance', params });
  });

  it('survives non-ASCII values', () => {
    const encoded = encodeStateLink('x', { label: 'σ²·ρ — “quotes”' });
    expect(decodeStateLink(encoded)?.params).toEqual({ label: 'σ²·ρ — “quotes”' });
  });

  it('returns null for anything that is not a state link', () => {
    expect(decodeStateLink('')).toBeNull();
    expect(decodeStateLink('#objectives')).toBeNull();
    expect(decodeStateLink('#w=')).toBeNull();
    expect(decodeStateLink('#w=name')).toBeNull();
    expect(decodeStateLink('#w=Bad Name:e30')).toBeNull();
    expect(decodeStateLink('#w=name:not-base64-json')).toBeNull();
    expect(decodeStateLink(`#w=name:${btoa('[1,2]')}`)).toBeNull();
    expect(decodeStateLink(`#w=name:${btoa('"s"')}`)).toBeNull();
  });

  it('replaces an existing hash', () => {
    const url = withStateLink('https://example.test/u7/l1/#objectives', 'g', { a: 1 });
    expect(url).toBe(`https://example.test/u7/l1/#${encodeStateLink('g', { a: 1 })}`);
  });
});
