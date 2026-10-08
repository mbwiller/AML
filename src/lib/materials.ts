/**
 * Pure helpers for /materials and the links into it (VISION.md §7 "Materials";
 * framework-free, unit-tested). The filesystem scan that feeds them lives in
 * `src/lib/materials-scan.ts`; the build step that copies the files into
 * `dist/materials/files/` lives in `src/lib/build/copy-static.ts`.
 *
 * Relative imports only: `astro.config.mjs` loads this module through the
 * copy integration, before the `@/` alias exists.
 */
import { slugify } from './markdown/numbering.ts';

/** Where copied course files are served from. */
export const MATERIALS_FILES_URL = '/materials/files';

export interface LectureFile {
  lecture: number;
  /** Topic from the course schedule (docs/course-map/00-course-overview.md), or the file name. */
  title: string;
  /** Lecture date (`YYYY-MM-DD`) from the schedule, when known. */
  date: string | undefined;
  /** Path under `AML Course Material/`. */
  source: string;
  /** Public URL of the copied file. */
  url: string;
  bytes: number;
}

export interface NotebookFile {
  /** File name as in the course folder, e.g. `Lecture 8 Code Companion.ipynb`. */
  name: string;
  /** `slugify(name)`, the anchor key `<Notebook>` chips link to (`#notebook-<slug>`). */
  slug: string;
  source: string;
  url: string;
  bytes: number;
  /** Lectures whose material the notebook actually implements. */
  lectures: number[];
  /** Why the lectures differ from the file name, when they do. */
  note: string | undefined;
}

export interface DocumentFile {
  title: string;
  source: string;
  url: string;
  bytes: number;
}

export interface MaterialsManifest {
  lectures: LectureFile[];
  notebooks: NotebookFile[];
  documents: DocumentFile[];
}

/** Schedule from docs/course-map/00-course-overview.md ("Tentative schedule"). */
export const LECTURE_SCHEDULE: Record<number, { date: string; topic: string }> = {
  1: { date: '2026-08-24', topic: 'Introduction' },
  2: { date: '2026-09-02', topic: 'Supervised learning and linear regression' },
  3: { date: '2026-09-09', topic: 'Linear regression and the data-generating distribution' },
  4: { date: '2026-09-14', topic: 'Empirical risk and gradient descent' },
  5: { date: '2026-09-16', topic: 'Gradient descent, logistic regression, and MLE' },
  6: { date: '2026-09-21', topic: 'MLE and classification evaluation' },
  7: { date: '2026-09-23', topic: 'Evaluation, choice of divergence, and regularization' },
  8: { date: '2026-09-28', topic: 'Model selection and generative models I' },
  9: { date: '2026-09-30', topic: 'Generative models and text classification (Naive Bayes)' },
  10: { date: '2026-10-05', topic: 'GDA, unsupervised learning, and k-means' },
  11: { date: '2026-10-07', topic: 'GMM and EM' },
  12: { date: '2026-10-14', topic: 'EM, nonparametric density estimation, and kernels' },
  13: { date: '2026-10-19', topic: 'KNN' },
  14: { date: '2026-10-21', topic: 'Dimensionality reduction' },
};

/**
 * Notebook → the lectures it implements. The companions are named after the
 * lecture they were released with, not the one they implement; the mismatches
 * are documented in docs/course-map/00-course-overview.md ("Notebook ↔
 * lecture mismatches"). Keys are `slugify(file name)`.
 */
export const NOTEBOOK_LECTURES: Record<string, { lectures: number[]; note?: string }> = {
  'lecture2code-companion-ipynb': { lectures: [2] },
  'lecture4-code-companion-ipynb': {
    lectures: [4, 5],
    note: 'L4 autograd and gradient descent, then the Iris logistic regression of L5.',
  },
  'l5-code-companion-ipynb': {
    lectures: [6],
    note: 'Despite the name, this implements L6: softmax decision regions and the evaluation metrics.',
  },
  'l6-code-companion-ipynb': {
    lectures: [7],
    note: 'Despite the name, this produces only L7 figures: polynomial overfitting and the ridge and lasso paths.',
  },
  'lecture-8-code-companion-ipynb': {
    lectures: [9],
    note: 'Despite the name, this implements L9: 20 Newsgroups and Bernoulli Naive Bayes.',
  },
  'lecture10-unsupervised-learning-code-companion-ipynb': {
    lectures: [10],
    note: 'The k-means half of L10, then a preview of the elbow method from the next lecture.',
  },
  'naivebayes-spam-exercise-ipynb': { lectures: [9], note: 'The in-class spam exercise for L9.' },
  'naivebayes-spam-exercise-sol-ipynb': {
    lectures: [9],
    note: 'Solution to the L9 spam exercise.',
  },
};

/** `L10 Naive Bayes and GDA_2026.pdf` → 10; `L1-Introduction.pdf` → 1; anything else → null. */
export function lectureNumberFromFilename(name: string): number | null {
  const m = /^L(\d+)(?=[\s_.-])/i.exec(name.trim());
  return m?.[1] === undefined ? null : Number(m[1]);
}

/** The lectures a notebook implements: the curated table first, else a number in its name. */
export function notebookLectures(name: string): { lectures: number[]; note: string | undefined } {
  const known = NOTEBOOK_LECTURES[slugify(name)];
  if (known) return { lectures: known.lectures, note: known.note };
  const m = /(?:^|[^a-z])(?:lecture|l)\s*-?\s*(\d+)/i.exec(name);
  return { lectures: m?.[1] === undefined ? [] : [Number(m[1])], note: undefined };
}

/** `Lectures/L2.pdf` → `/materials/files/lectures/l2.pdf`: kebab-case, no spaces in URLs. */
export function materialUrl(kind: 'lectures' | 'notebooks' | 'documents', name: string): string {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
  return `${MATERIALS_FILES_URL}/${kind}/${slugify(stem)}${ext}`;
}

/** `3-5, 12` → [[3, 5], [12, 12]]; en dashes allowed; non-numeric parts are ignored. */
export function parsePageRanges(pages: string): [number, number][] {
  const out: [number, number][] = [];
  for (const part of String(pages).split(',')) {
    const m = /^\s*(\d+)\s*(?:[–-]\s*(\d+))?\s*$/.exec(part);
    if (!m?.[1]) continue;
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    out.push(from <= to ? [from, to] : [to, from]);
  }
  return out;
}

/** The first page of a pages string, or null. */
export function firstPage(pages: string): number | null {
  return parsePageRanges(pages)[0]?.[0] ?? null;
}

/**
 * Where a `<SlideRef lecture pages>` points: the copied PDF at the first page
 * (`#page=` is honored by browser PDF viewers) when the lecture's PDF exists,
 * else the lecture's row on /materials.
 */
export function slideHref(lecture: number, pages: string, pdfUrl: string | undefined): string {
  const page = firstPage(pages);
  if (pdfUrl) return page === null ? pdfUrl : `${pdfUrl}#page=${page}`;
  return `/materials#L${lecture}`;
}

/** Anchor id of a notebook row on /materials; matches what `<Notebook>` chips link to. */
export function notebookAnchor(nameOrPath: string): string {
  const name = nameOrPath.split('/').pop() ?? nameOrPath;
  return `notebook-${slugify(name)}`;
}

/** The minimal lesson shape the indexes need. */
export interface MaterialLesson {
  lectures: { lecture: number; pages: string }[];
  companions?: { notebook: string; cells: string }[] | undefined;
}

export interface PageIndexEntry<L> {
  from: number;
  to: number;
  lessons: L[];
}

/**
 * For each lecture, its page ranges in order, each with the lessons that
 * cover it (VISION §7: "which lesson covers this page"). Identical ranges
 * from several lessons are merged; lesson order is preserved.
 */
export function pageIndex<L extends MaterialLesson>(
  lessons: readonly L[],
): Map<number, PageIndexEntry<L>[]> {
  const byLecture = new Map<number, PageIndexEntry<L>[]>();
  for (const lesson of lessons) {
    for (const ref of lesson.lectures) {
      const entries = byLecture.get(ref.lecture) ?? [];
      for (const [from, to] of parsePageRanges(ref.pages)) {
        const same = entries.find((e) => e.from === from && e.to === to);
        if (same) {
          if (!same.lessons.includes(lesson)) same.lessons.push(lesson);
        } else entries.push({ from, to, lessons: [lesson] });
      }
      byLecture.set(ref.lecture, entries);
    }
  }
  for (const entries of byLecture.values()) {
    entries.sort((a, b) => a.from - b.from || a.to - b.to);
  }
  return new Map([...byLecture.entries()].sort((a, b) => a[0] - b[0]));
}

/**
 * The lessons whose `companions` cite a notebook, with the cells they cite.
 * Matching is on `slugify(file name)`, so `NaiveBayes_Spam_exercise.ipynb`
 * in frontmatter finds `NaiveBayes Spam exercise.ipynb` on disk.
 */
export function lessonsForNotebook<L extends MaterialLesson>(
  lessons: readonly L[],
  notebookName: string,
): { lesson: L; cells: string }[] {
  const key = slugify(notebookName.split('/').pop() ?? notebookName);
  const out: { lesson: L; cells: string }[] = [];
  for (const lesson of lessons) {
    for (const c of lesson.companions ?? []) {
      if (slugify(c.notebook.split('/').pop() ?? c.notebook) === key) {
        out.push({ lesson, cells: c.cells });
      }
    }
  }
  return out;
}

/** `1536000` → `1.5 MB`; `20480` → `20 KB`. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
