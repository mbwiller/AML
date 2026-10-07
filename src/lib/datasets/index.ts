/**
 * Typed access to the generated case datasets in `src/data/*.json`
 * (VISION §9.8). `<Example case=…>` and the widgets read through here, so
 * no component touches the JSON shape directly.
 *
 *   const notes = loadDataset('notes');          // Dataset<NotesRow>
 *   const row = findRow(notes, 'NOTE-0042');
 *   const sample = sampleRows(notes, 5, 1);      // 5 rows, seeded, no repeats
 *   noteText(row)                                 // the readable report
 *
 * The JSON is imported statically, so a page that imports this module pays
 * for the files it names at build time only; the browser receives whatever a
 * widget passes it.
 */
import adverseJson from '@/data/adverse.json';
import notesJson from '@/data/notes.json';
import tropoJson from '@/data/tropo.json';

import type { AdverseRow } from './adverse';
import type { NotesRow } from './notes';
import { createRng } from './random';
import type { TropoRow } from './tropo';
import type { CaseId, Dataset } from './types';

export type { AdverseDataset, AdverseRow } from './adverse';
export { logit as adverseLogit, sigmoid, spec as adverseSpec } from './adverse';
export type { NotesDataset, NotesRow } from './notes';
export {
  bagOfWords,
  bernoulliPsi,
  noteText,
  presentWords,
  spec as notesSpec,
  tokenize,
} from './notes';
export { VOCABULARY, WORD_INDEX, slotOf, type Slot } from './notes-vocabulary';
export { createRng, type Rng } from './random';
export type { TropoDataset, TropoRow } from './tropo';
export { spec as tropoSpec } from './tropo';
export type { CaseId, Dataset, DatasetVariable, GenerativeModel, VariableType } from './types';

export interface RowsByCase {
  notes: NotesRow;
  adverse: AdverseRow;
  tropo: TropoRow;
}

function assertEnvelope(id: CaseId, json: unknown): void {
  const d = json as Partial<Dataset<unknown>> | null;
  if (
    !d ||
    d.id !== id ||
    typeof d.seed !== 'number' ||
    !Array.isArray(d.rows) ||
    d.rows.length !== d.n ||
    !d.generativeModel
  ) {
    throw new Error(`src/data/${id}.json is not a dataset envelope; run pnpm gen:datasets`);
  }
}

const FILES: Record<CaseId, unknown> = {
  notes: notesJson,
  adverse: adverseJson,
  tropo: tropoJson,
};

const cache = new Map<CaseId, Dataset<unknown>>();

/** The generated dataset for a case, validated once and cached. */
export function loadDataset<K extends CaseId>(id: K): Dataset<RowsByCase[K]> {
  const hit = cache.get(id);
  if (hit) return hit as Dataset<RowsByCase[K]>;
  const json = FILES[id];
  assertEnvelope(id, json);
  const dataset = json as Dataset<RowsByCase[K]>;
  cache.set(id, dataset);
  return dataset;
}

const indexes = new WeakMap<Dataset<unknown>, Map<string, unknown>>();

/** The row with the given record id (`NOTE-0042`, `ADV-0117`, `TRO-1999`), or undefined. */
export function findRow<Row extends { id: string }>(
  dataset: Dataset<Row>,
  id: string,
): Row | undefined {
  let index = indexes.get(dataset);
  if (!index) {
    index = new Map(dataset.rows.map((r) => [r.id, r] as const));
    indexes.set(dataset, index);
  }
  return index.get(id) as Row | undefined;
}

/**
 * `k` distinct rows chosen uniformly without replacement, in a seeded order
 * (partial Fisher–Yates), so a lesson's sample is the same on every build.
 */
export function sampleRows<Row>(dataset: Dataset<Row>, k: number, seed: number): Row[] {
  const n = dataset.rows.length;
  const take = Math.max(0, Math.min(Math.trunc(k), n));
  const rng = createRng(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  const out: Row[] = [];
  for (let i = 0; i < take; i++) {
    const j = i + rng.int(0, n - i);
    const oi = order[i] as number;
    const oj = order[j] as number;
    order[i] = oj;
    order[j] = oi;
    out.push(dataset.rows[oj] as Row);
  }
  return out;
}
