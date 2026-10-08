/**
 * Deterministic, review-friendly JSON for `src/data/*.json`.
 *
 * `JSON.stringify(value, null, 2)` would put every number of a 2,000-entry
 * parameter vector and every token of every row on its own line (megabytes,
 * and useless diffs). This printer keeps the envelope readable and one row
 * per line:
 *
 * - object keys are sorted;
 * - indentation is two spaces and the output ends with a newline;
 * - a "flat" value (an object or array whose members are primitives or arrays
 *   of primitives) is printed on one line when that line is at most
 *   `MAX_INLINE` characters, so a row is one line;
 * - a long array of primitives is wrapped at `WRAP_AT` characters.
 */

const MAX_INLINE = 600;
const WRAP_AT = 100;
const INDENT = '  ';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function isPrimitive(v: unknown): v is null | boolean | number | string {
  return v === null || typeof v !== 'object';
}

function isFlatArray(v: unknown): v is Json[] {
  return Array.isArray(v) && v.every((x) => isPrimitive(x) || isPrimitiveArray(x));
}

function isPrimitiveArray(v: unknown): v is (null | boolean | number | string)[] {
  return Array.isArray(v) && v.every(isPrimitive);
}

function isFlatObject(v: unknown): v is Record<string, Json> {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => isPrimitive(x) || isPrimitiveArray(x))
  );
}

function sortedKeys(o: Record<string, unknown>): string[] {
  return Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort();
}

function scalar(v: null | boolean | number | string): string {
  if (typeof v === 'number' && !Number.isFinite(v)) {
    throw new Error(`stableStringify: non-finite number ${String(v)}`);
  }
  return JSON.stringify(v);
}

/**
 * Compact single-line form with sorted keys and `, ` / `: ` separators.
 * Arrays of numbers are joined with a bare comma: a NOTES row holds 25
 * word indices, and the space would cost 150 KB over the file.
 */
function inline(v: unknown): string {
  if (isPrimitive(v)) return scalar(v);
  if (Array.isArray(v)) {
    const sep = v.every((x) => typeof x === 'number') ? ',' : ', ';
    return `[${v.map(inline).join(sep)}]`;
  }
  const o = v as Record<string, unknown>;
  const parts = sortedKeys(o).map((k) => `${JSON.stringify(k)}: ${inline(o[k])}`);
  return `{${parts.join(', ')}}`;
}

function wrapPrimitiveArray(items: readonly unknown[], depth: number): string {
  const pad = INDENT.repeat(depth + 1);
  const lines: string[] = [];
  let line = '';
  for (const item of items) {
    const s = scalar(item as null | boolean | number | string);
    if (line.length > 0 && line.length + 2 + s.length > WRAP_AT) {
      lines.push(line + ',');
      line = s;
    } else {
      line = line.length === 0 ? s : `${line}, ${s}`;
    }
  }
  if (line.length > 0) lines.push(line);
  return `[\n${lines.map((l) => pad + l).join('\n')}\n${INDENT.repeat(depth)}]`;
}

function format(v: unknown, depth: number): string {
  if (isPrimitive(v)) return scalar(v);
  if (v === undefined) throw new Error('stableStringify: undefined is not representable');

  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    if (isPrimitiveArray(v)) {
      const one = inline(v);
      return one.length <= WRAP_AT ? one : wrapPrimitiveArray(v, depth);
    }
    if (isFlatArray(v)) {
      const one = inline(v);
      if (one.length <= MAX_INLINE) return one;
    }
    const pad = INDENT.repeat(depth + 1);
    const body = v.map((x) => pad + format(x, depth + 1)).join(',\n');
    return `[\n${body}\n${INDENT.repeat(depth)}]`;
  }

  const o = v as Record<string, unknown>;
  const keys = sortedKeys(o);
  if (keys.length === 0) return '{}';
  if (isFlatObject(o)) {
    const one = inline(o);
    if (one.length <= MAX_INLINE) return one;
  }
  const pad = INDENT.repeat(depth + 1);
  const body = keys
    .map((k) => `${pad}${JSON.stringify(k)}: ${format(o[k], depth + 1)}`)
    .join(',\n');
  return `{\n${body}\n${INDENT.repeat(depth)}}`;
}

/** Serialize to the review-friendly JSON described above (always ends with "\n"). */
export function stableStringify(value: unknown): string {
  return `${format(value, 0)}\n`;
}
