import { describe, expect, it } from 'vitest';

import { ARMS } from '@/lib/datasets/vasco';

import { trialArm } from './data';
import {
  armTruth,
  drawFromModel,
  empiricalRisk,
  expectedGap,
  expectedTrainingRisk,
  expectedTrueRisk,
  mean,
  sampleStats,
  scoreDraw,
  scoredTheta,
  trainingSet,
  trueRisk,
} from './math';

const placebo = armTruth('placebo');

describe('true-vs-empirical-risk math', () => {
  it('the placebo arm has θ* = −2.25 and R(θ*) = 67.24 (lesson 2.2)', () => {
    expect(placebo.mean).toBeCloseTo(-2.25, 12);
    expect(placebo.variance).toBeCloseTo(67.24, 12);
    expect(trueRisk(placebo, -2.25)).toBeCloseTo(67.24, 12);
    expect(trueRisk(placebo, 0)).toBeCloseTo(67.24 + 2.25 ** 2, 12);
  });

  it('R̂(θ) = (θ − ȳ)² + s² equals the average squared error', () => {
    const ys = [-4, 1.5, 7, -10, 3];
    const stats = sampleStats(ys);
    for (const theta of [-5, 0, 2.2]) {
      const direct = ys.reduce((s, y) => s + (y - theta) ** 2, 0) / ys.length;
      expect(empiricalRisk(stats, theta)).toBeCloseTo(direct, 10);
    }
    expect(empiricalRisk(stats, stats.mean)).toBeCloseTo(stats.variance, 12);
    expect(sampleStats([])).toEqual({ n: 0, mean: 0, variance: 0 });
  });

  it('draw 0 is the trial’s own arm; other draws are fresh and seeded', () => {
    const arm = trialArm('placebo');
    expect(arm.ys).toHaveLength(50);
    expect(arm.ids[0]).toMatch(/^VAS-\d{4}$/);
    const first = trainingSet('placebo', 50, 5, 0, arm.ys);
    expect(first.fromTrial).toBe(true);
    expect(first.ys).toEqual(arm.ys);
    expect(trainingSet('placebo', 5, 5, 0, arm.ys).ys).toEqual(arm.ys.slice(0, 5));
    expect(trainingSet('placebo', 80, 5, 0, arm.ys).fromTrial).toBe(false);
    const a = drawFromModel('placebo', 30, 5, 1);
    expect(drawFromModel('placebo', 30, 5, 1)).toEqual(a);
    expect(drawFromModel('placebo', 30, 5, 2)).not.toEqual(a);
    expect(drawFromModel('placebo', 30, 6, 1)).not.toEqual(a);
  });

  it('a fresh draw from the model has the arm’s mean and variance', () => {
    for (const arm of ARMS) {
      const truth = armTruth(arm);
      const s = sampleStats(drawFromModel(arm, 20000, 1, 1));
      expect(Math.abs(s.mean - truth.mean)).toBeLessThan(0.25);
      expect(Math.abs(s.variance - truth.variance)).toBeLessThan(3);
    }
  });

  it('chooses the scored θ by mode', () => {
    const stats = sampleStats([1, 2, 3]);
    expect(scoredTheta('true-mean', placebo, stats, 4)).toBe(placebo.mean);
    expect(scoredTheta('fixed', placebo, stats, 4)).toBe(placebo.mean + 4);
    expect(scoredTheta('fitted', placebo, stats, 4)).toBe(2);
  });

  it('Monte Carlo: R̂(θ*) is unbiased; R̂(θ̂) is low by σ²/n and R(θ̂) high by σ²/n', () => {
    const n = 5;
    const draws = 6000;
    const fixed: number[] = [];
    const fittedTrain: number[] = [];
    const fittedTrue: number[] = [];
    for (let d = 1; d <= draws; d++) {
      const ys = drawFromModel('placebo', n, 9, d);
      fixed.push(scoreDraw(d, ys, placebo, 'true-mean', 0).train);
      const r = scoreDraw(d, ys, placebo, 'fitted', 0);
      fittedTrain.push(r.train);
      fittedTrue.push(r.true);
    }
    // Standard errors: sd(R̂(θ*)) = σ²·sqrt(2/n) ≈ 42.5, over 6000 draws ≈ 0.55.
    expect(Math.abs(mean(fixed) - placebo.variance)).toBeLessThan(2.5);
    expect(
      Math.abs(mean(fittedTrain) - expectedTrainingRisk('fitted', placebo, n, 0)),
    ).toBeLessThan(2.5);
    expect(Math.abs(mean(fittedTrue) - expectedTrueRisk('fitted', placebo, n, 0))).toBeLessThan(
      2.5,
    );
    const gap = mean(fittedTrain) - mean(fittedTrue);
    expect(Math.abs(gap - expectedGap('fitted', placebo, n))).toBeLessThan(2.5);
    expect(expectedGap('fitted', placebo, n)).toBeCloseTo((-2 * 67.24) / 5, 10);
    expect(expectedGap('true-mean', placebo, n)).toBe(0);
  });

  it('the expected values match eq. 2.2.6 at n = 50', () => {
    expect(expectedTrainingRisk('fitted', placebo, 50, 0)).toBeCloseTo((49 / 50) * 67.24, 10);
    expect(expectedTrueRisk('fitted', placebo, 50, 0)).toBeCloseTo((51 / 50) * 67.24, 10);
    expect(expectedTrainingRisk('fixed', placebo, 50, 3)).toBeCloseTo(67.24 + 9, 10);
  });
});
