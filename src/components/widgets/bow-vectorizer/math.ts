/**
 * Pure text processing for `bow-vectorizer` (lesson 6.2; L9 pp.12–16): a
 * CountVectorizer-like tokenizer, an optional stop-word filter, a tiny
 * suffix-stripping stemmer, `fit` (learn a sorted vocabulary from training
 * documents) and `transform` (a document's sparse count or binary vector
 * over that vocabulary, dropping words it has no column for). No React, no
 * DOM; every function is unit-tested in `math.test.ts`.
 *
 * Notation (lesson 6.2): vocabulary V, the bag-of-words map φ(x) ∈ {0,1}^|V|
 * with φ(x)_j = min(c_j(x), 1), and the count map φ_count(x)_j = c_j(x).
 */

/* ---------- tokenizer ---------- */

/**
 * scikit-learn's default `token_pattern` `(?u)\b\w\w+\b` after lowercasing:
 * runs of two or more word characters. Punctuation and single characters
 * such as "a" never become tokens (lesson 6.2, "The sklearn defaults").
 */
export function tokenizeText(text: string): string[] {
  return text.toLowerCase().match(/\b\w\w+\b/gu) ?? [];
}

/* ---------- stop words ---------- */

/**
 * A short English stop-word list: a 144-word subset of scikit-learn's
 * `ENGLISH_STOP_WORDS` (which has 318 words) covering the function words
 * that occur in the NOTES reports and common English text. Like every
 * standard list it contains the negations "no", "not", "nor", and "without",
 * which is the lesson 6.2 pitfall.
 */
export const STOP_WORDS: ReadonlySet<string> = new Set(
  `a about above after again against all also am an and any are as at be because been before
being below between both but by can could do down during each either else even ever every few
for from further had has have he her here hers herself him himself his how however if in into is
it its itself less may me might more most much must my myself neither never no nor not now of off
often on once only or other our ours out over own per perhaps rather same she should since so
some still such than that the their them themselves then there these they this those though
through thus to too under until up upon very was we well were what when where whether which while
who whom whose why will with within without would yet you your`
    .split(/\s+/)
    .filter(Boolean),
);

/** Negations a standard list removes; flagged in the widget when they disappear. */
export const NEGATIONS: ReadonlySet<string> = new Set(['no', 'not', 'nor', 'never', 'without']);

/* ---------- stemmer ---------- */

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const isConsonant = (ch: string | undefined) => ch !== undefined && !VOWELS.has(ch);

/** Ends consonant–vowel–consonant, the last not w, x, or y ("not", "dos", "tak"). */
function endsCvc(s: string): boolean {
  const n = s.length;
  const last = s[n - 1];
  return (
    n >= 3 &&
    isConsonant(s[n - 3]) &&
    !isConsonant(s[n - 2]) &&
    isConsonant(last) &&
    last !== 'w' &&
    last !== 'x' &&
    last !== 'y'
  );
}

/** Ends in a doubled consonant other than l, s, z ("stopp", "admitt"). */
function endsDouble(s: string): boolean {
  const n = s.length;
  const last = s[n - 1];
  return n >= 2 && last === s[n - 2] && isConsonant(last) && !['l', 's', 'z'].includes(last ?? '');
}

/** Minimum length of what remains after a suffix is stripped. */
const MIN_STEM = 3;

/**
 * A tiny deterministic suffix stripper, **not** the Porter stemmer. It tries
 * these rules in order and applies the first that leaves at least three
 * letters:
 *
 * 1. `-nesses`, `-ness` → "" (then a final `i` → `y`: happiness → happy)
 * 2. `-ingly`, `-edly`, `-ly` → ""            (slowly → slow)
 * 3. `-ing`, `-ed` → "", then undouble a final double consonant
 *    (stopped → stop) or, for a three-letter consonant–vowel–consonant
 *    remainder, add `e` back (noted → note, dosing → dose)
 * 4. `-ies` → `y`                              (studies → study)
 * 5. `-es` → "" after ss, x, zz, ch, sh      (rashes → rash; doses → dose by rule 6)
 * 6. `-s` → "" unless the word ends in ss, us, or is (reports → report;
 *    glass, status, diagnosis unchanged)
 *
 * Porter has five steps with measure conditions and handles far more
 * (relational → relat; increase, increases, increased → increas, where this
 * one gives increase, increase, increas). This one is short enough to
 * read in a lesson and maps the common inflections of the NOTES words
 * together, which is all the widget needs to show the effect on |V|.
 */
export function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= MIN_STEM) return w;
  const strip = (suffix: string) =>
    w.endsWith(suffix) && w.length - suffix.length >= MIN_STEM
      ? w.slice(0, w.length - suffix.length)
      : null;

  for (const suffix of ['nesses', 'ness']) {
    const s = strip(suffix);
    if (s !== null) return s.endsWith('i') ? `${s.slice(0, -1)}y` : s;
  }
  for (const suffix of ['ingly', 'edly', 'ly']) {
    const s = strip(suffix);
    if (s !== null) return s;
  }
  for (const suffix of ['ing', 'ed']) {
    const s = strip(suffix);
    if (s !== null) {
      if (endsDouble(s)) return s.slice(0, -1);
      if (s.length === MIN_STEM && endsCvc(s)) return `${s}e`;
      return s;
    }
  }
  const ies = strip('ies');
  if (ies !== null) return `${ies}y`;
  if (/(ss|x|zz|ch|sh)es$/.test(w)) {
    const s = strip('es');
    if (s !== null) return s;
  }
  if (w.endsWith('s') && !/(ss|us|is)$/.test(w)) {
    const s = strip('s');
    if (s !== null) return s;
  }
  return w;
}

/* ---------- preprocessing ---------- */

export interface Options {
  removeStopWords: boolean;
  stem: boolean;
}

export interface ProcessedToken {
  /** The token as the tokenizer produced it. */
  raw: string;
  /** What enters the vocabulary or the vector: null when removed as a stop word. */
  term: string | null;
  /** True when the stemmer changed it. */
  stemmed: boolean;
}

/** Stop-word removal first (on the raw token), then stemming, as in the spam exercise. */
export function preprocess(tokens: readonly string[], opts: Options): ProcessedToken[] {
  return tokens.map((raw) => {
    if (opts.removeStopWords && STOP_WORDS.has(raw)) return { raw, term: null, stemmed: false };
    const term = opts.stem ? stem(raw) : raw;
    return { raw, term, stemmed: term !== raw };
  });
}

/** The terms of a text after tokenizing and preprocessing (stop words dropped). */
export function analyze(text: string, opts: Options): string[] {
  return preprocess(tokenizeText(text), opts)
    .map((t) => t.term)
    .filter((t): t is string => t !== null);
}

/* ---------- fit and transform ---------- */

export interface Vocabulary {
  /** Sorted terms; `terms[j]` is column j (CountVectorizer sorts its vocabulary too). */
  terms: readonly string[];
  /** term → column, as sklearn's `vocabulary_`. */
  index: ReadonlyMap<string, number>;
}

/** `fit`: every distinct term of the training documents, sorted. */
export function fitVocabulary(docs: readonly (readonly string[])[]): Vocabulary {
  const set = new Set<string>();
  for (const doc of docs) for (const t of doc) set.add(t);
  const terms = [...set].sort();
  return { terms, index: new Map(terms.map((t, j) => [t, j] as const)) };
}

export interface SparseVector {
  /** |V|. */
  size: number;
  /** Nonzero entries `[column, value]`, sorted by column (scipy's CSR row order). */
  entries: readonly (readonly [number, number])[];
  /** Terms with no column (never seen in training), in first-appearance order, distinct. */
  dropped: readonly string[];
  /** Sum of the entries: kept tokens (counts) or distinct kept terms (binary). */
  sum: number;
}

/** `transform`: counts c_j(x), or min(c_j(x), 1) when `binary`; unseen terms are dropped. */
export function transform(
  terms: readonly string[],
  vocab: Vocabulary,
  binary: boolean,
): SparseVector {
  const counts = new Map<number, number>();
  const dropped: string[] = [];
  const seenDropped = new Set<string>();
  for (const t of terms) {
    const j = vocab.index.get(t);
    if (j === undefined) {
      if (!seenDropped.has(t)) {
        seenDropped.add(t);
        dropped.push(t);
      }
      continue;
    }
    counts.set(j, (counts.get(j) ?? 0) + 1);
  }
  const entries = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([j, c]) => [j, binary ? 1 : c] as const);
  return {
    size: vocab.terms.length,
    entries,
    dropped,
    sum: entries.reduce((a, [, v]) => a + v, 0),
  };
}
