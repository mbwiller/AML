import { describe, expect, it } from 'vitest';

import { parseLastLesson, relativeTime } from './progress';

describe('progress', () => {
  it('parses a valid record and clamps progress', () => {
    const r = parseLastLesson(
      JSON.stringify({ href: '/units/u6/x', number: '6.3', title: 'NB', progress: 1.7, at: 5 }),
    );
    expect(r).toEqual({ href: '/units/u6/x', number: '6.3', title: 'NB', progress: 1, at: 5 });
  });

  it('rejects garbage', () => {
    expect(parseLastLesson(null)).toBeNull();
    expect(parseLastLesson('{')).toBeNull();
    expect(parseLastLesson('{"href":1}')).toBeNull();
  });

  it('formats relative times', () => {
    const now = 1_000_000_000_000;
    expect(relativeTime(now - 10_000, now)).toBe('just now');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5 minutes ago');
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3 hours ago');
    expect(relativeTime(now - 26 * 3_600_000, now)).toBe('yesterday');
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe('3 days ago');
    expect(relativeTime(now - 30 * 86_400_000, now)).toMatch(/^on \d{4}-\d{2}-\d{2}$/);
  });
});
