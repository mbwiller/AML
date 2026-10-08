import { describe, expect, it } from 'vitest';

import {
  PLANNED_CASES,
  caseIndex,
  caseStats,
  formatCell,
  formatParameter,
  formatPercent,
  labelVariable,
} from './cases';
import { hasDataset, tryLoadDataset } from './datasets';
import type { DatasetVariable } from './datasets/types';

const variables: DatasetVariable[] = [
  { name: 'id', type: 'id', description: 'id' },
  { name: 'dose', type: 'categorical', unit: 'mg', description: 'dose arm' },
  { name: 'age', type: 'integer', unit: 'years', description: 'age' },
  { name: 'w', type: 'tokens', description: 'words' },
  { name: 'y', symbol: 'y', type: 'binary', description: 'label' },
];
const rows = [
  { id: 'A-1', dose: 10, age: 40, w: [1, 2], y: 1 },
  { id: 'A-2', dose: 2.5, age: 50, w: [3], y: 0 },
  { id: 'A-3', dose: 10, age: 60, w: [], y: 0 },
  { id: 'A-4', dose: 0, age: 70, w: [4], y: 0 },
];

describe('caseStats', () => {
  const stats = caseStats({ rows, variables });

  it('counts records and the prevalence of the label', () => {
    expect(stats.n).toBe(4);
    expect(stats.label?.variable.name).toBe('y');
    expect(stats.label?.positives).toBe(1);
    expect(stats.label?.prevalence).toBe(0.25);
  });

  it('summarizes numeric columns with mean, population sd, and range', () => {
    expect(stats.numeric).toHaveLength(1);
    const age = stats.numeric[0];
    expect(age?.variable.name).toBe('age');
    expect(age?.mean).toBe(55);
    expect(age?.sd).toBeCloseTo(Math.sqrt(125), 10);
    expect([age?.min, age?.max]).toEqual([40, 70]);
  });

  it('counts categorical values in numeric order and skips ids and tokens', () => {
    expect(stats.categorical.map((c) => c.variable.name)).toEqual(['dose']);
    expect(stats.categorical[0]?.counts).toEqual([
      { value: '0', count: 1 },
      { value: '2.5', count: 1 },
      { value: '10', count: 2 },
    ]);
  });

  it('finds the label by symbol, as TROPO names it mi', () => {
    expect(
      labelVariable([{ name: 'mi', symbol: 'y', type: 'binary', description: 'MI' }])?.name,
    ).toBe('mi');
    expect(labelVariable([{ name: 'nsaid', type: 'binary', description: '' }])).toBeUndefined();
  });

  it('matches the generated TROPO cohort (15% prevalence by design)', () => {
    const tropo = tryLoadDataset('tropo');
    expect(tropo).toBeDefined();
    const s = caseStats(tropo ?? { rows: [], variables: [] });
    expect(s.n).toBe(2000);
    expect(s.label?.variable.name).toBe('mi');
    expect(s.label?.prevalence).toBeGreaterThan(0.12);
    expect(s.label?.prevalence).toBeLessThan(0.18);
  });
});

describe('datasets that do not exist yet', () => {
  it('tryLoadDataset returns undefined instead of throwing', () => {
    expect(hasDataset('vasco-not-generated')).toBe(false);
    expect(tryLoadDataset('vasco-not-generated')).toBeUndefined();
    expect(hasDataset('notes')).toBe(true);
  });
});

describe('caseIndex', () => {
  it('lists the eight planned cases in order, marks pages, and appends unplanned pages', () => {
    const rows = caseIndex([{ id: 'notes' }, { id: 'tropo' }, { id: 'extra' }]);
    expect(PLANNED_CASES).toHaveLength(8);
    expect(rows.map((r) => r.id)).toEqual([...PLANNED_CASES.map((c) => c.id), 'extra']);
    expect(rows.filter((r) => r.page).map((r) => r.id)).toEqual(['tropo', 'notes', 'extra']);
    expect(rows.at(-1)?.planned).toBeUndefined();
  });
});

describe('formatting', () => {
  it('formats cells, percentages, and parameters', () => {
    expect(formatCell(0.033412)).toBe('0.03341');
    expect(formatCell(75)).toBe('75');
    expect(formatCell([1, 2, 3])).toBe('[3 values]');
    expect(formatCell(undefined)).toBe('—');
    expect(formatPercent(0.0612)).toBe('6.1%');
    expect(formatParameter(6000)).toBe('6,000');
    expect(formatParameter(['a', 'b'])).toBe('a, b');
    expect(formatParameter({ mu: 1, sigma: [0.6, 0.9] })).toBe('mu: 1; sigma: 0.6, 0.9');
  });
});
