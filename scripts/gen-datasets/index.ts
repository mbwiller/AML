/**
 * `pnpm gen:datasets`          regenerate src/data/<case>.json for every case
 * `pnpm check:datasets`        (`--check`) regenerate in memory and fail if any file differs
 * `tsx scripts/gen-datasets/index.ts notes tropo`   only the named cases
 *
 * The files are a pure function of the generator code and the seeds
 * (STYLE_GUIDE §8), so the check is what CI runs.
 */
import { CASE_IDS, checkCase, writeCase } from './lib';
import type { CaseId } from '@/lib/datasets/types';

const args = process.argv.slice(2);
const check = args.includes('--check');
const named = args.filter((a) => !a.startsWith('--'));
const unknown = named.filter((a) => !(CASE_IDS as string[]).includes(a));
if (unknown.length > 0) {
  console.error(`unknown case(s): ${unknown.join(', ')}; known: ${CASE_IDS.join(', ')}`);
  process.exit(2);
}
const ids = (named.length > 0 ? named : CASE_IDS) as CaseId[];

if (check) {
  const problems = ids.map(checkCase).filter((p): p is string => p !== null);
  for (const p of problems) console.error(`check:datasets: ${p}`);
  if (problems.length > 0) process.exit(1);
  console.log(`check:datasets: ${ids.join(', ')} match their generators`);
} else {
  for (const id of ids) {
    const bytes = writeCase(id);
    console.log(`wrote src/data/${id}.json (${(bytes / 1024).toFixed(0)} KB)`);
  }
}
