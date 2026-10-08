import { describe, expect, it } from 'vitest';

import { numberDerivationSteps } from './derivation-steps';

const chunk = (steps: string[]) =>
  `<div class="chunk" data-chunk data-astro-cid-a><h4>t</h4><ol class="steps">${steps.join('')}</ol></div>`;
const step = (math: string, extra = '') =>
  `<li class="step" data-step${extra} data-astro-cid-b><div class="step-math">${math}</div></li>`;

describe('numberDerivationSteps', () => {
  it('numbers steps across chunks and reports chunk sizes', () => {
    const html = chunk([step('a'), step('b')]) + chunk([step('c')]);
    const out = numberDerivationSteps(html, 'der-6-1-1');
    expect(out.total).toBe(3);
    expect(out.chunkSizes).toEqual([2, 1]);
    expect(out.html).toContain(
      '<li class="step" data-step data-astro-cid-b id="der-6-1-1-step-1" data-n="1">',
    );
    expect(out.html).toContain('id="der-6-1-1-step-3" data-n="3"');
  });

  it('injects one copy-link affordance per step, pointing at the step id', () => {
    const out = numberDerivationSteps(chunk([step('a'), step('b')]), 'der-1-2-3');
    const links = out.html.match(/<a class="step-link" href="#der-1-2-3-step-(\d)"/g) ?? [];
    expect(links).toHaveLength(2);
    expect(out.html).toContain('aria-label="Copy link to step 2"');
  });

  it('leaves other attributes, data-sticky, and figure state untouched', () => {
    const html = chunk([
      step('x', ' data-fadeable data-figure-state="{&quot;k&quot;:1}" data-sticky="bayes-rule"'),
    ]);
    const out = numberDerivationSteps(html, 'der-1-1-1');
    expect(out.html).toContain(
      'data-fadeable data-figure-state="{&quot;k&quot;:1}" data-sticky="bayes-rule" data-astro-cid-b id="der-1-1-1-step-1"',
    );
  });

  it('ignores list items and divs that are not steps or chunks', () => {
    const html = '<div class="goal"><ul><li>note</li></ul></div>' + chunk([step('a')]);
    const out = numberDerivationSteps(html, 'der-1-1-1');
    expect(out.total).toBe(1);
    expect(out.chunkSizes).toEqual([1]);
    expect(out.html).toContain('<li>note</li>');
  });

  it('does not match data-step-link or data-chunk-* lookalikes', () => {
    const html = '<li data-step-link>x</li><div data-chunk-outline></div>' + chunk([step('a')]);
    const out = numberDerivationSteps(html, 'der-1-1-1');
    expect(out.total).toBe(1);
    expect(out.chunkSizes).toEqual([1]);
  });

  it('handles an empty body', () => {
    expect(numberDerivationSteps('', 'der-1-1-1')).toEqual({ html: '', total: 0, chunkSizes: [] });
  });
});
