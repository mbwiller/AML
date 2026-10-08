import { describe, expect, it } from 'vitest';

import {
  eqRefText,
  formatPages,
  kindFromId,
  labelFromId,
  numberFromId,
  parseSlideSource,
  slideRefHref,
  slideRefLabel,
  slugify,
} from './numbering';

describe('numberFromId', () => {
  it('turns the hyphenated id tail into a dotted number', () => {
    expect(numberFromId('def-6-3-1')).toBe('6.3.1');
    expect(numberFromId('der-6-3-2')).toBe('6.3.2');
    expect(numberFromId('eq-1-3-2')).toBe('1.3.2');
    expect(numberFromId('thm-2-1')).toBe('2.1');
  });

  it('returns an empty string when there is no number', () => {
    expect(numberFromId('def')).toBe('');
    expect(numberFromId('not an id')).toBe('');
  });
});

describe('kindFromId and labelFromId', () => {
  it('reads the prefix', () => {
    expect(kindFromId('def-6-3-1')).toBe('def');
    expect(kindFromId('prop-1-1-1')).toBe('prop');
    expect(kindFromId('6-3-1')).toBeNull();
  });

  it('prints the contract labels', () => {
    expect(labelFromId('def-6-3-1')).toBe('Definition 6.3.1');
    expect(labelFromId('thm-6-3-1')).toBe('Theorem 6.3.1');
    expect(labelFromId('prop-6-3-1')).toBe('Proposition 6.3.1');
    expect(labelFromId('lem-6-3-1')).toBe('Lemma 6.3.1');
    expect(labelFromId('der-6-3-2')).toBe('Derivation 6.3.2');
    expect(labelFromId('eq-6-3-2')).toBe('Equation 6.3.2');
  });

  it('lets an explicit kind win over the prefix', () => {
    expect(labelFromId('def-6-3-1', 'Theorem')).toBe('Theorem 6.3.1');
  });

  it('capitalizes an unknown prefix instead of failing', () => {
    expect(labelFromId('cor-6-3-1')).toBe('Cor 6.3.1');
  });
});

describe('eqRefText', () => {
  it('parenthesizes the number', () => {
    expect(eqRefText('eq-6-3-1')).toBe('(6.3.1)');
  });

  it('falls back to the raw id', () => {
    expect(eqRefText('eq')).toBe('(eq)');
  });
});

describe('parseSlideSource', () => {
  it('reads lecture, pages, and a trailing note', () => {
    expect(parseSlideSource('L9 p.24')).toEqual({ lecture: 9, pages: '24', note: '' });
    expect(parseSlideSource("L9 p.32 (stated: 'recall from the MLE lecture')")).toEqual({
      lecture: 9,
      pages: '32',
      note: "(stated: 'recall from the MLE lecture')",
    });
    expect(parseSlideSource('L8 p.39 (two lines)')).toEqual({
      lecture: 8,
      pages: '39',
      note: '(two lines)',
    });
  });

  it('accepts page ranges written with pp., a hyphen, or an en dash', () => {
    expect(parseSlideSource('L7 pp.12-14')).toEqual({ lecture: 7, pages: '12-14', note: '' });
    expect(parseSlideSource('L7 pp. 12–14')).toEqual({ lecture: 7, pages: '12-14', note: '' });
    expect(parseSlideSource('L7 p12')).toEqual({ lecture: 7, pages: '12', note: '' });
  });

  it('returns null for anything else', () => {
    expect(parseSlideSource('Kuleshov notes §3')).toBeNull();
    expect(parseSlideSource('')).toBeNull();
  });
});

describe('formatPages, slideRefLabel, slideRefHref', () => {
  it('formats single pages and ranges', () => {
    expect(formatPages('47')).toBe('p.47');
    expect(formatPages('12-14')).toBe('pp.12–14');
    expect(formatPages('12–14')).toBe('pp.12–14');
  });

  it('builds the chip text and anchor', () => {
    expect(slideRefLabel(7, '47')).toBe('L7 p.47');
    expect(slideRefLabel(7, '12-14')).toBe('L7 pp.12–14');
    expect(slideRefHref(7, '47')).toBe('/materials#L7-p47');
    expect(slideRefHref(7, '12–14')).toBe('/materials#L7-p12-14');
  });
});

describe('slugify', () => {
  it('kebab-cases a file name', () => {
    expect(slugify('Lecture 8 Code Companion.ipynb')).toBe('lecture-8-code-companion-ipynb');
    expect(slugify('  Naïve Bayes  ')).toBe('naive-bayes');
  });
});
