import { describe, expect, it } from 'vitest';

import {
  firstPage,
  formatBytes,
  lectureNumberFromFilename,
  lessonsForNotebook,
  materialUrl,
  notebookAnchor,
  notebookLectures,
  pageIndex,
  parsePageRanges,
  slideHref,
} from './materials';
import { scanMaterials, staticCopies } from './materials-scan';

describe('file names', () => {
  it('reads the lecture number from the PDF name', () => {
    expect(lectureNumberFromFilename('L10 Naive Bayes and GDA_2026.pdf')).toBe(10);
    expect(lectureNumberFromFilename('L1-Introduction.pdf')).toBe(1);
    expect(lectureNumberFromFilename('L2.pdf')).toBe(2);
    expect(lectureNumberFromFilename('Syllabus for CS 5785.pdf')).toBeNull();
    expect(lectureNumberFromFilename('Lecture notes.pdf')).toBeNull();
  });

  it('maps notebooks to the lectures they implement, not the one in their name', () => {
    expect(notebookLectures('L5 code companion.ipynb').lectures).toEqual([6]);
    expect(notebookLectures('L6 code companion.ipynb').lectures).toEqual([7]);
    expect(notebookLectures('Lecture 8 Code Companion.ipynb').lectures).toEqual([9]);
    expect(notebookLectures('lecture4-code companion.ipynb').lectures).toEqual([4, 5]);
    expect(notebookLectures('Lecture 8 Code Companion.ipynb').note).toMatch(/L9/);
    // Unknown notebooks fall back to the number in the name.
    expect(notebookLectures('Lecture 12 code companion.ipynb')).toEqual({
      lectures: [12],
      note: undefined,
    });
    expect(notebookLectures('scratch.ipynb').lectures).toEqual([]);
  });

  it('serves files at kebab-case URLs', () => {
    expect(materialUrl('lectures', 'L10 Naive Bayes and GDA_2026.pdf')).toBe(
      '/materials/files/lectures/l10-naive-bayes-and-gda-2026.pdf',
    );
    expect(materialUrl('notebooks', 'Lecture 8 Code Companion.ipynb')).toBe(
      '/materials/files/notebooks/lecture-8-code-companion.ipynb',
    );
  });

  it('notebook anchors match what <Notebook> chips link to, path or not', () => {
    expect(notebookAnchor('Code Companions/Lecture 8 Code Companion.ipynb')).toBe(
      'notebook-lecture-8-code-companion-ipynb',
    );
    expect(notebookAnchor('NaiveBayes_Spam_exercise.ipynb')).toBe(
      notebookAnchor('Lectures/NaiveBayes Spam exercise.ipynb'),
    );
  });
});

describe('pages', () => {
  it('parses page ranges with hyphens, en dashes, and lists', () => {
    expect(parsePageRanges('3-5, 12')).toEqual([
      [3, 5],
      [12, 12],
    ]);
    expect(parsePageRanges('20–40')).toEqual([[20, 40]]);
    expect(parsePageRanges('9')).toEqual([[9, 9]]);
    expect(parsePageRanges('all')).toEqual([]);
    expect(firstPage('44-46')).toBe(44);
    expect(firstPage('all')).toBeNull();
  });

  it('slide links open the PDF at the first page, else the lecture row on /materials', () => {
    expect(slideHref(10, '15-21', '/materials/files/lectures/l10.pdf')).toBe(
      '/materials/files/lectures/l10.pdf#page=15',
    );
    expect(slideHref(12, '3', undefined)).toBe('/materials#L12');
  });

  it('formats sizes', () => {
    expect(formatBytes(1024 * 1024 * 2.04)).toBe('2.0 MB');
    expect(formatBytes(20 * 1024)).toBe('20 KB');
    expect(formatBytes(10)).toBe('1 KB');
  });
});

describe('page-to-lesson index', () => {
  const a = { name: 'a', lectures: [{ lecture: 10, pages: '15-21' }] };
  const b = {
    name: 'b',
    lectures: [
      { lecture: 10, pages: '15-21' },
      { lecture: 10, pages: '3-5, 9' },
      { lecture: 9, pages: '44-46' },
    ],
  };
  const c = {
    name: 'c',
    lectures: [{ lecture: 9, pages: '20-40' }],
    companions: [{ notebook: 'Lectures/NaiveBayes_Spam_exercise_sol.ipynb', cells: 'all' }],
  };

  it('groups ranges by lecture, merges identical ranges, and sorts by page', () => {
    const index = pageIndex([a, b, c]);
    expect([...index.keys()]).toEqual([9, 10]);
    expect(index.get(10)?.map((e) => [e.from, e.to, e.lessons.map((l) => l.name)])).toEqual([
      [3, 5, ['b']],
      [9, 9, ['b']],
      [15, 21, ['a', 'b']],
    ]);
    expect(index.get(9)?.map((e) => e.from)).toEqual([20, 44]);
  });

  it('finds the lessons citing a notebook, whatever the separators in its name', () => {
    expect(lessonsForNotebook([a, b, c], 'NaiveBayes_Spam_exercise_sol.ipynb')).toEqual([
      { lesson: c, cells: 'all' },
    ]);
    expect(lessonsForNotebook([a, b, c], 'L2.ipynb')).toEqual([]);
  });
});

describe('scanMaterials (the committed course folder)', () => {
  const m = scanMaterials();

  it('lists L1–L10 in order with schedule titles, and the syllabus as a document', () => {
    expect(m.lectures.map((l) => l.lecture)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(m.lectures[8]?.title).toMatch(/Naive Bayes/);
    expect(m.lectures.every((l) => l.url.startsWith('/materials/files/lectures/'))).toBe(true);
    expect(m.documents.map((d) => d.title)).toEqual([expect.stringMatching(/^Syllabus/)]);
  });

  it('lists the notebooks from Code Companions and Lectures, never Homeworks', () => {
    expect(m.notebooks.length).toBeGreaterThanOrEqual(8);
    expect(m.notebooks.some((n) => n.source.startsWith('Homeworks/'))).toBe(false);
    expect(m.notebooks.find((n) => n.name === 'L6 code companion.ipynb')?.lectures).toEqual([7]);
  });

  it('copies course files and the case datasets, nothing from Homeworks', () => {
    const copies = staticCopies(process.cwd());
    expect(copies.some((c) => c.to === '/data/notes.json')).toBe(true);
    expect(copies.some((c) => c.from.includes('/Homeworks/'))).toBe(false);
    expect(new Set(copies.map((c) => c.to)).size).toBe(copies.length);
  });

  it('returns empty lists when the folder is missing', () => {
    expect(scanMaterials('/nonexistent')).toEqual({ lectures: [], notebooks: [], documents: [] });
  });
});
