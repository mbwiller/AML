import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const snapshots = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__');

/** True when a committed Linux baseline exists for this screenshot name. */
export function hasBaseline(name: string): boolean {
  return existsSync(join(snapshots, name));
}
