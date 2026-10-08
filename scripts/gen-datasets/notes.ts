/** `tsx scripts/gen-datasets/notes.ts` — regenerate src/data/notes.json only. */
import { writeCase } from './lib';

const bytes = writeCase('notes');
console.log(`wrote src/data/notes.json (${(bytes / 1024).toFixed(0)} KB)`);
