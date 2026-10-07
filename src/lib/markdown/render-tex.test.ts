import { describe, expect, it } from 'vitest';

import { escapeHtml, renderDisplayTex, renderInlineMath, renderInlineTex } from './render-tex';

describe('renderDisplayTex', () => {
  it('renders a display block with HTML and MathML', () => {
    const html = renderDisplayTex('\\hat y = \\argmax_y p(\\mathbf{x} \\mid y)\\, p(y)');
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('<math');
    expect(html).not.toContain('katex-error');
  });

  it('expands the course macros', () => {
    const html = renderDisplayTex('\\D = \\{(\\ex{i}, \\ey{i})\\}_{i=1}^{n}');
    expect(html).not.toContain('katex-error');
    expect(html).toContain('mathvariant="script"');
    expect(html).toContain('mathcal');
  });

  it('keeps \\htmlClass as a semantic class', () => {
    const html = renderDisplayTex('\\htmlClass{sym-theta}{\\theta}');
    expect(html).toContain('sym-theta');
    expect(html).not.toContain('katex-error');
  });

  it('keeps \\htmlId as an id', () => {
    const html = renderDisplayTex('x \\tag{6.3.1} \\htmlId{eq-6-3-1}{}');
    expect(html).toContain('id="eq-6-3-1"');
  });

  it('never throws; it prints the error span instead', () => {
    const html = renderDisplayTex('\\frac{1}{');
    expect(html).toContain('katex-error');
  });
});

describe('renderInlineMath', () => {
  it('renders inline without the display wrapper', () => {
    const html = renderInlineMath('\\theta\\T x');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('katex-display');
  });
});

describe('escapeHtml', () => {
  it('escapes the five significant characters', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('renderInlineTex', () => {
  it('passes plain text through, escaped', () => {
    expect(renderInlineTex('a < b & c')).toBe('a &lt; b &amp; c');
  });

  it('renders $…$ spans inline and escapes the rest', () => {
    const html = renderInlineTex('the denominator does not depend on $y$, so <it> stays');
    expect(html).toContain('class="katex"');
    expect(html).toContain('the denominator does not depend on ');
    expect(html).toContain(', so &lt;it&gt; stays');
    expect(html).not.toContain('katex-error');
  });

  it('renders several spans in one string', () => {
    const html = renderInlineTex('from $p(y \\mid x)$ to $p(x \\mid y)$');
    expect(html.match(/class="katex"/g)).toHaveLength(2);
  });

  it('emits the sym-* class from \\htmlClass', () => {
    const html = renderInlineTex('update $\\htmlClass{sym-theta}{\\theta}$ in place');
    expect(html).toContain('sym-theta');
  });

  it('keeps \\$ as a literal dollar sign outside math', () => {
    const html = renderInlineTex('a dose costs \\$5 and \\$7');
    expect(html).toBe('a dose costs $5 and $7');
    expect(html).not.toContain('katex');
  });

  it('keeps \\$ inside math from closing the span', () => {
    const html = renderInlineTex('$\\$1$');
    expect(html.match(/class="katex"/g)).toHaveLength(1);
    expect(html).not.toContain('katex-error');
  });

  it('leaves an unmatched $ as text', () => {
    expect(renderInlineTex('costs $5')).toBe('costs $5');
  });

  it('leaves an empty pair as text', () => {
    expect(renderInlineTex('a $$ b')).toBe('a $$ b');
  });

  it('renders $$…$$ as display math', () => {
    const html = renderInlineTex('so $$\\sum_i x_i$$ holds');
    expect(html).toContain('katex-display');
  });

  it('expands macros inside spans', () => {
    const html = renderInlineTex('the data $\\D$ with $\\ex{i} \\in \\R^d$');
    expect(html).not.toContain('katex-error');
  });
});
