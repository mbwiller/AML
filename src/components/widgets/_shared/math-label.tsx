/**
 * Runtime KaTeX for labels inside widgets (axis titles, legends, a live
 * matrix) with the same `katexOptions` (macros, `\htmlClass` trust,
 * `htmlAndMathml` output) as every build-time equation, so a `\Sigma` beside
 * the plot looks exactly like the `\Sigma` in the prose. KaTeX CSS is global.
 *
 * Errors never throw: KaTeX prints the source in a `.katex-error` span, which
 * the e2e specs assert is absent.
 */
import katex from 'katex';
import { useMemo } from 'react';

import { katexOptions } from '@/lib/katex-macros';

export interface MathLabelProps {
  /** TeX without `$` delimiters. */
  tex: string;
  display?: boolean;
  className?: string;
  /** Plain-text name for assistive technology; defaults to KaTeX's MathML. */
  'aria-label'?: string;
}

export function renderTex(tex: string, display = false): string {
  return katex.renderToString(tex, { ...katexOptions, throwOnError: false, displayMode: display });
}

export function MathLabel({
  tex,
  display = false,
  className,
  'aria-label': label,
}: MathLabelProps) {
  const html = useMemo(() => renderTex(tex, display), [tex, display]);
  return (
    <span
      className={className}
      aria-label={label}
      // KaTeX output from our own TeX strings; never user input.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
