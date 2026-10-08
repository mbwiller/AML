import { figureStatePatch } from './useFigureStateParams';
import { formatTick, linearScale, linearTicks, logScale, logTicks, niceStep } from './scale';
import { z } from 'zod';

describe('plot-kit scales', () => {
  it('maps linearly and handles a flat domain', () => {
    const s = linearScale([0, 10], [0, 200]);
    expect(s(5)).toBe(100);
    expect(linearScale([2, 2], [0, 100])(2)).toBe(50);
    // inverted range (SVG y grows downward)
    expect(linearScale([0, 1], [100, 0])(0.25)).toBe(75);
  });

  it('maps base-10 logs and breaks on non-positive values', () => {
    const s = logScale([1e-3, 1], [0, 300]);
    expect(s(1e-3)).toBeCloseTo(0);
    expect(s(1e-2)).toBeCloseTo(100);
    expect(Number.isNaN(s(0))).toBe(true);
  });

  it('picks 1-2-5 steps', () => {
    expect(niceStep(0, 10, 5)).toBe(2);
    expect(niceStep(0, 1, 4)).toBe(0.2);
    expect(niceStep(0, 200, 4)).toBe(50);
  });

  it('lists nice ticks without float dust', () => {
    expect(linearTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(linearTicks(-2.5, 1.5, 4)).toEqual([-2, -1, 0, 1]);
    expect(logTicks(1e-6, 10, 4)).toEqual([1e-6, 1e-4, 1e-2, 1]);
    expect(formatTick(0.30000000000000004)).toBe('0.3');
    expect(formatTick(1e-4, true)).toBe('1e-4');
  });
});

describe('figureStatePatch', () => {
  const shape = { eta: z.number().min(0).max(2).default(0.5), show: z.boolean().default(true) };

  it('keeps known keys that validate and drops everything else', () => {
    expect(figureStatePatch({ eta: 1, show: false, other: 3 }, shape)).toEqual({
      eta: 1,
      show: false,
    });
    expect(figureStatePatch({ eta: 5 }, shape)).toEqual({});
    expect(figureStatePatch(null, shape)).toEqual({});
    expect(figureStatePatch([1], shape)).toEqual({});
    expect(figureStatePatch({ toString: 1 }, shape)).toEqual({});
  });
});
