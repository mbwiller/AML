import { describe, expect, it } from 'vitest';

import {
  formatMinutes,
  lectureProvenance,
  lessonNumber,
  neighbors,
  sortLessons,
  unitNumber,
} from './lessons';

describe('lessons helpers', () => {
  it('derives unit and lesson numbers from the unit id', () => {
    expect(unitNumber('u6-generative-models-and-naive-bayes')).toBe(6);
    expect(unitNumber('orientation')).toBeNull();
    expect(lessonNumber('u6-generative-models-and-naive-bayes', 3)).toBe('6.3');
    expect(lessonNumber('orientation', 3)).toBe('3');
  });

  it('formats lecture provenance with en dashes and p./pp.', () => {
    expect(
      lectureProvenance([
        { lecture: 9, pages: '20-40' },
        { lecture: 10, pages: '3' },
      ]),
    ).toBe('L9 pp. 20–40; L10 p. 3');
  });

  it('sorts across units and finds neighbors', () => {
    const units = [
      { id: 'u6-a', title: 'A', order: 6, summary: '', lectures: '' },
      { id: 'u7-b', title: 'B', order: 7, summary: '', lectures: '' },
    ];
    const mk = (id: string, unit: string, order: number) => ({
      id,
      data: { unit, order, slug: id, title: id } as never,
    });
    const sorted = sortLessons([mk('y', 'u7-b', 1), mk('x', 'u6-a', 2), mk('w', 'u6-a', 1)], units);
    expect(sorted.map((l) => l.id)).toEqual(['w', 'x', 'y']);
    const n = neighbors(sorted, 'x');
    expect(n.prev?.id).toBe('w');
    expect(n.next?.id).toBe('y');
    expect(neighbors(sorted, 'y').next).toBeUndefined();
  });

  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(65)).toBe('1 h 05 min');
  });
});
