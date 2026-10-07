/**
 * Shared KaTeX macros for every page and widget (STYLE_GUIDE.md §2.2).
 *
 * These are passed to rehype-katex at build time and to any client-side
 * KaTeX call inside widgets, so notation is identical everywhere.
 * Do not define macros in lesson files.
 */
export const katexMacros: Record<string, string> = {
  // Sets and spaces
  '\\R': '\\mathbb{R}',
  '\\E': '\\mathbb{E}',
  '\\Prob': 'P',
  '\\D': '\\mathcal{D}',
  '\\M': '\\mathcal{M}',
  '\\Normal': '\\mathcal{N}',

  // Examples and transposes
  '\\ex': 'x^{(#1)}',
  '\\ey': 'y^{(#1)}',
  '\\T': '{}^{\\top}',

  // Norms, operators, and indicators
  '\\norm': '\\lVert #1 \\rVert',
  '\\argmin': '\\operatorname*{arg\\,min}',
  '\\argmax': '\\operatorname*{arg\\,max}',
  '\\KL': 'D_{\\mathrm{KL}}(#1\\,\\|\\,#2)',
  '\\ind': '\\mathbb{1}[#1]',
  '\\Var': '\\operatorname{Var}',
  '\\Cov': '\\operatorname{Cov}',
  '\\tr': '\\operatorname{tr}',
  '\\diag': '\\operatorname{diag}',
  '\\sgn': '\\operatorname{sgn}',
};

/** Commands rehype-katex may trust. Only these two; never `\href`, `\url`, or `\includegraphics`. */
export const trustedKatexCommands = ['\\htmlClass', '\\htmlId'] as const;

/** Semantic classes allowed inside `\htmlClass{…}{…}` (STYLE_GUIDE.md §2.3). */
export const symClasses = [
  'sym-theta',
  'sym-x',
  'sym-y',
  'sym-yhat',
  'sym-eta',
  'sym-lambda',
  'sym-mu',
  'sym-sigma',
  'sym-pos',
  'sym-neg',
  'sym-boundary',
] as const;

export type SymClass = (typeof symClasses)[number];

/** Options shared by rehype-katex and client-side KaTeX calls. */
export const katexOptions = {
  output: 'htmlAndMathml' as const,
  // \htmlClass / \htmlId are "LaTeX-incompatible"; silence only that code.
  strict: (errorCode: string) => (errorCode === 'htmlExtension' ? 'ignore' : 'warn'),
  macros: katexMacros,
  trust: (context: { command: string }) =>
    (trustedKatexCommands as readonly string[]).includes(context.command),
};
