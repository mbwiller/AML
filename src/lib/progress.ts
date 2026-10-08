/**
 * Lesson position persistence (VISION §9.11): where you were, in the browser only.
 * Framework-free; the layout and the home page call these from vanilla scripts.
 * The full progress store (IndexedDB, FSRS state, export/import) is src/lib/practice/store.ts;
 * its export carries these keys too (src/lib/practice/transfer.ts).
 */
export const LAST_LESSON_KEY = 'aml-last-lesson';

export interface LastLesson {
  href: string;
  number: string;
  title: string;
  /** Reading progress 0–1 at the time of saving. */
  progress: number;
  /** Unix ms. */
  at: number;
}

export function parseLastLesson(raw: string | null): LastLesson | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (
      typeof v === 'object' &&
      v !== null &&
      typeof (v as LastLesson).href === 'string' &&
      typeof (v as LastLesson).title === 'string' &&
      typeof (v as LastLesson).number === 'string'
    ) {
      const l = v as LastLesson;
      return {
        href: l.href,
        number: l.number,
        title: l.title,
        progress: clamp01(Number(l.progress) || 0),
        at: Number(l.at) || 0,
      };
    }
  } catch {
    /* corrupt value: ignore */
  }
  return null;
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** "3 minutes ago", "yesterday", "on 2026-10-07". */
export function relativeTime(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - fromMs) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  return `on ${new Date(fromMs).toISOString().slice(0, 10)}`;
}
