import {
  formatNumber,
  frameScales,
  linearScale,
  polylinePath,
  sampleCurve,
  ticks,
} from './plot-scale';

describe('plot-scale', () => {
  it('maps and inverts a linear scale', () => {
    const s = linearScale([0, 40], [40, 340]);
    expect(s(0)).toBe(40);
    expect(s(40)).toBe(340);
    expect(s(20)).toBe(190);
    expect(s.invert(190)).toBe(20);
  });

  it('puts y up in a frame', () => {
    const { x, y } = frameScales(
      { width: 360, height: 200, margin: { top: 10, right: 10, bottom: 30, left: 40 } },
      [0, 1],
      [0, 10],
    );
    expect(x(0)).toBe(40);
    expect(x(1)).toBe(350);
    expect(y(0)).toBe(170);
    expect(y(10)).toBe(10);
  });

  it('ticks at multiples of the step', () => {
    expect(ticks(0, 40, 10)).toEqual([0, 10, 20, 30, 40]);
    expect(ticks(-45, 25, 20)).toEqual([-40, -20, 0, 20]);
    expect(ticks(0.15, 0.35, 0.1)).toEqual([0.2, 0.3]);
  });

  it('breaks a polyline where it leaves the domain', () => {
    const s = linearScale([0, 10], [0, 100]);
    const y = linearScale([0, 1], [100, 0]);
    expect(
      polylinePath(
        [
          [0, 0.5],
          [1, 0.6],
          [2, 2],
          [3, 0.2],
          [4, Number.NaN],
        ],
        s,
        y,
      ),
    ).toBe('M0.0 50.0L10.0 40.0M30.0 80.0');
    expect(sampleCurve((v) => v * v, 0, 2, 2)).toEqual([
      [0, 0],
      [1, 1],
      [2, 4],
    ]);
  });

  it('formats readouts with a true minus and no negative zero', () => {
    expect(formatNumber(-2.254)).toBe('−2.25');
    expect(formatNumber(-0.001)).toBe('0.00');
    expect(formatNumber(3.1, 1)).toBe('3.1');
  });
});
