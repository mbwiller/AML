import { describe, expect, it } from 'vitest';

import { generate as generateAdverse } from './adverse';
import { findRow, loadDataset, noteText, sampleRows } from './index';
import { generate as generateNotes } from './notes';
import { stableStringify } from './serialize';
import { generate as generateTropo } from './tropo';

describe('dataset accessor', () => {
  it('loads each case with its envelope', () => {
    const notes = loadDataset('notes');
    const adverse = loadDataset('adverse');
    const tropo = loadDataset('tropo');
    expect(notes.id).toBe('notes');
    expect(notes.n).toBe(6000);
    expect(notes.rows[0]?.id).toBe('NOTE-0001');
    expect(adverse.rows[0]?.id).toBe('ADV-0001');
    expect(tropo.rows[0]?.id).toBe('TRO-0001');
    expect(notes.variables.map((v) => v.name)).toEqual(['id', 'y', 'w']);
    expect(loadDataset('notes')).toBe(notes);
  });

  it('the committed JSON matches the generators (pnpm check:datasets)', () => {
    expect(stableStringify(generateNotes())).toBe(stableStringify(loadDataset('notes')));
    expect(stableStringify(generateAdverse())).toBe(stableStringify(loadDataset('adverse')));
    expect(stableStringify(generateTropo())).toBe(stableStringify(loadDataset('tropo')));
  });

  it('findRow returns the record by id', () => {
    const adverse = loadDataset('adverse');
    expect(findRow(adverse, 'ADV-0117')?.id).toBe('ADV-0117');
    expect(findRow(adverse, 'ADV-9999')).toBeUndefined();
    const note = findRow(loadDataset('notes'), 'NOTE-0042');
    expect(note).toBeDefined();
    expect(noteText(note ?? { w: [] })).toMatch(/^[A-Z].*\.$/);
  });

  it('sampleRows is seeded, without replacement, and bounded by n', () => {
    const tropo = loadDataset('tropo');
    const a = sampleRows(tropo, 5, 1);
    const b = sampleRows(tropo, 5, 1);
    const c = sampleRows(tropo, 5, 2);
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
    expect(a.map((r) => r.id)).not.toEqual(c.map((r) => r.id));
    expect(new Set(a.map((r) => r.id)).size).toBe(5);
    expect(sampleRows(tropo, 5000, 1)).toHaveLength(2000);
    expect(new Set(sampleRows(tropo, 2000, 3).map((r) => r.id)).size).toBe(2000);
    expect(sampleRows(tropo, 0, 1)).toEqual([]);
  });
});
