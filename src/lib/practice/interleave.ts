/**
 * The quiz builder (VISION.md §7 "Practice", §9.5 "Practice sampling"):
 * sample `count` items from the chosen units, interleaved by concept, with
 * items that `discriminates` the same confusables placed side by side.
 * Seeded, so a quiz is reproducible from its seed. Pure.
 *
 * 1. Bucket the pool by primary concept (`concepts[0]`, else the item id),
 *    shuffle each bucket, and order the buckets by a seeded shuffle that
 *    alternates units, so no unit and no concept dominates the opening.
 * 2. Take one item per bucket in rotation. When the item discriminates a set
 *    of confusables and another unpicked item discriminates the same set,
 *    take that partner too, as an adjacent pair, if the quiz has room.
 * 3. Order the picked blocks (single items or pairs) so that, where
 *    possible, consecutive blocks do not share a primary concept.
 *
 * Boss-quiz hook (VISION §9.5): `earlier` adds `count` items from earlier
 * units, sampled the same way and interleaved into the result.
 */
import { mulberry32 } from '@/lib/graders/seeded';

export interface Interleavable {
  id: string;
  unit: string;
  concepts: readonly string[];
  discriminates?: readonly string[] | undefined;
}

export interface QuizSpec {
  units: readonly string[];
  count: number;
  seed: number;
  /** Boss quiz: also draw `count` items from these (earlier) units. */
  earlier?: { units: readonly string[]; count: number } | undefined;
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

const primary = (item: Interleavable) => item.concepts[0] ?? item.id;
const discKey = (item: Interleavable) =>
  item.discriminates && item.discriminates.length >= 2
    ? [...item.discriminates].sort().join('|')
    : null;

function sample<T extends Interleavable>(
  pool: readonly T[],
  count: number,
  rand: () => number,
): T[][] {
  // 1. buckets by primary concept, each shuffled; bucket order alternates units.
  const buckets = new Map<string, T[]>();
  for (const item of pool) {
    const k = `${item.unit}\u0000${primary(item)}`;
    const list = buckets.get(k) ?? [];
    list.push(item);
    buckets.set(k, list);
  }
  const byUnit = new Map<string, T[][]>();
  for (const [k, items] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const unit = k.split('\u0000')[0] ?? '';
    const list = byUnit.get(unit) ?? [];
    list.push(shuffle(items, rand));
    byUnit.set(unit, list);
  }
  const unitLists = shuffle(
    [...byUnit.keys()].sort().map((u) => shuffle(byUnit.get(u) ?? [], rand)),
    rand,
  );
  const rotation: T[][] = [];
  for (let i = 0; unitLists.some((l) => i < l.length); i++) {
    for (const l of unitLists) {
      const b = l[i];
      if (b) rotation.push(b);
    }
  }

  // 2. round-robin picks, pulling a discriminating partner alongside.
  const picked = new Set<string>();
  const blocks: T[][] = [];
  let total = 0;
  const byDisc = new Map<string, T[]>();
  for (const b of rotation) {
    for (const item of b) {
      const k = discKey(item);
      if (!k) continue;
      const list = byDisc.get(k) ?? [];
      list.push(item);
      byDisc.set(k, list);
    }
  }
  while (total < count && rotation.some((b) => b.some((i) => !picked.has(i.id)))) {
    for (const bucket of rotation) {
      if (total >= count) break;
      const item = bucket.find((i) => !picked.has(i.id));
      if (!item) continue;
      picked.add(item.id);
      const block = [item];
      const k = discKey(item);
      if (k && total + 2 <= count) {
        const partner =
          (byDisc.get(k) ?? []).find((i) => !picked.has(i.id) && primary(i) !== primary(item)) ??
          (byDisc.get(k) ?? []).find((i) => !picked.has(i.id));
        if (partner) {
          picked.add(partner.id);
          block.push(partner);
        }
      }
      blocks.push(block);
      total += block.length;
    }
  }
  return blocks;
}

/** 3. Greedy order: the next block whose first concept differs from the previous block's last. */
function spread<T extends Interleavable>(blocks: T[][]): T[] {
  const rest = [...blocks];
  const out: T[] = [];
  while (rest.length) {
    const last = out[out.length - 1];
    let i = last ? rest.findIndex((b) => b[0] && primary(b[0]) !== primary(last)) : 0;
    if (i === -1) i = 0;
    const [block] = rest.splice(i, 1);
    if (block) out.push(...block);
  }
  return out;
}

export function buildQuiz<T extends Interleavable>(pool: readonly T[], spec: QuizSpec): T[] {
  const rand = mulberry32(spec.seed);
  const units = new Set(spec.units);
  const main = sample(
    pool.filter((i) => units.has(i.unit)),
    Math.max(0, spec.count),
    rand,
  );
  let blocks = main;
  if (spec.earlier && spec.earlier.count > 0) {
    const earlierUnits = new Set(spec.earlier.units);
    const extra = sample(
      pool.filter((i) => earlierUnits.has(i.unit) && !units.has(i.unit)),
      spec.earlier.count,
      rand,
    );
    // Spread the earlier-unit blocks evenly through the main ones.
    blocks = [...main];
    extra.forEach((b, j) => {
      const at = Math.round(((j + 1) * blocks.length) / (extra.length + 1));
      blocks.splice(at, 0, b);
    });
  }
  return spread(blocks);
}

/** A fresh seed for "New quiz" (not reproducible by design; the seed is shown and stored). */
export function freshSeed(now: number = Date.now()): number {
  return (now ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}
