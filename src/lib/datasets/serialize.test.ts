import { describe, expect, it } from 'vitest';

import { stableStringify } from './serialize';

describe('stableStringify', () => {
  it('sorts keys, indents by two spaces, and ends with a newline', () => {
    const s = stableStringify({ b: 1, a: { d: [1, 2], c: 'x' } });
    expect(s).toBe('{\n  "a": {"c": "x", "d": [1,2]},\n  "b": 1\n}\n');
  });

  it('keeps a flat row on one line and nested rows one per line', () => {
    const s = stableStringify({
      rows: [
        { id: 'A-1', w: [3, 1, 2], y: 0 },
        { id: 'A-2', w: [], y: 1 },
      ],
    });
    expect(s.split('\n')).toEqual([
      '{',
      '  "rows": [',
      '    {"id": "A-1", "w": [3,1,2], "y": 0},',
      '    {"id": "A-2", "w": [], "y": 1}',
      '  ]',
      '}',
      '',
    ]);
  });

  it('wraps long primitive arrays and round-trips through JSON.parse', () => {
    const value = { v: Array.from({ length: 200 }, (_, i) => i / 7), s: ['a', 'b'] };
    const s = stableStringify(value);
    expect(s.split('\n').length).toBeGreaterThan(10);
    expect(s.split('\n').every((l) => l.length <= 110)).toBe(true);
    expect(JSON.parse(s)).toEqual(value);
  });

  it('is byte-stable regardless of key insertion order', () => {
    expect(stableStringify({ x: 1, y: [{ b: 2, a: 1 }] })).toBe(
      stableStringify({ y: [{ a: 1, b: 2 }], x: 1 }),
    );
  });

  it('refuses non-finite numbers', () => {
    expect(() => stableStringify({ x: Number.NaN })).toThrow(/non-finite/);
  });
});
