/**
 * A tiny, safe arithmetic evaluator for quiz `formula` strings
 * (docs/CONTENT_AUTHORING.md §7). No `eval`, no `Function`: the string is
 * tokenized and parsed by recursive descent, and only the names in `params`
 * plus the functions and constants listed below are allowed.
 *
 * Grammar (precedence low → high):
 *   expr   := term (('+' | '-') term)*
 *   term   := unary (('*' | '/') unary)*
 *   unary  := ('+' | '-') unary | power
 *   power  := atom (('^' | '**') unary)?        (right-associative; `-x^2` is `-(x^2)`)
 *   atom   := number | name | name '(' expr ')' | '(' expr ')'
 *
 * Framework-free; unit-tested in formula.test.ts.
 */

export class FormulaError extends Error {
  override name = 'FormulaError';
}

const FUNCTIONS: Record<string, (x: number) => number> = {
  log: Math.log,
  ln: Math.log,
  exp: Math.exp,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Operator = '+' | '-' | '*' | '/' | '^' | '(' | ')';

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'name'; value: string }
  | { kind: 'op'; value: Operator };

const NUMBER_RE = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const OPERATORS = new Set<string>(['+', '-', '*', '/', '^', '(', ')']);

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i] ?? '';
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    const rest = src.slice(i);
    const num = NUMBER_RE.exec(rest);
    if (num) {
      out.push({ kind: 'num', value: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const name = NAME_RE.exec(rest);
    if (name) {
      out.push({ kind: 'name', value: name[0] });
      i += name[0].length;
      continue;
    }
    if (rest.startsWith('**')) {
      out.push({ kind: 'op', value: '^' });
      i += 2;
      continue;
    }
    if (ch === '×') {
      out.push({ kind: 'op', value: '*' });
      i += 1;
      continue;
    }
    if (ch === '−') {
      out.push({ kind: 'op', value: '-' });
      i += 1;
      continue;
    }
    if (OPERATORS.has(ch)) {
      out.push({ kind: 'op', value: ch as Operator });
      i += 1;
      continue;
    }
    throw new FormulaError(`unexpected character "${ch}" at position ${i + 1}`);
  }
  return out;
}

class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly params: Readonly<Record<string, number>>,
  ) {}

  parse(): number {
    const value = this.expr();
    const extra = this.tokens[this.pos];
    if (extra) throw new FormulaError(`unexpected "${String(extra.value)}"`);
    return value;
  }

  private peekOp(): Operator | undefined {
    const t = this.tokens[this.pos];
    return t?.kind === 'op' ? t.value : undefined;
  }

  private expr(): number {
    let left = this.term();
    for (;;) {
      const op = this.peekOp();
      if (op !== '+' && op !== '-') return left;
      this.pos += 1;
      const right = this.term();
      left = op === '+' ? left + right : left - right;
    }
  }

  private term(): number {
    let left = this.unary();
    for (;;) {
      const op = this.peekOp();
      if (op !== '*' && op !== '/') return left;
      this.pos += 1;
      const right = this.unary();
      left = op === '*' ? left * right : left / right;
    }
  }

  private unary(): number {
    const op = this.peekOp();
    if (op === '-' || op === '+') {
      this.pos += 1;
      const value = this.unary();
      return op === '-' ? -value : value;
    }
    return this.power();
  }

  private power(): number {
    const base = this.atom();
    if (this.peekOp() === '^') {
      this.pos += 1;
      return base ** this.unary();
    }
    return base;
  }

  private atom(): number {
    const t = this.tokens[this.pos];
    if (!t) throw new FormulaError('unexpected end of formula');
    this.pos += 1;
    if (t.kind === 'num') return t.value;
    if (t.kind === 'op') {
      if (t.value === '(') {
        const value = this.expr();
        this.expectClose();
        return value;
      }
      throw new FormulaError(`unexpected "${t.value}"`);
    }
    const name = t.value;
    if (this.peekOp() === '(') {
      const fn = FUNCTIONS[name];
      if (!fn) throw new FormulaError(`unknown function "${name}"`);
      this.pos += 1;
      const arg = this.expr();
      this.expectClose();
      return fn(arg);
    }
    const param = Object.hasOwn(this.params, name) ? this.params[name] : undefined;
    if (param !== undefined) return param;
    const constant = Object.hasOwn(CONSTANTS, name) ? CONSTANTS[name] : undefined;
    if (constant !== undefined) return constant;
    throw new FormulaError(`unknown name "${name}"`);
  }

  private expectClose(): void {
    if (this.peekOp() !== ')') throw new FormulaError('expected ")"');
    this.pos += 1;
  }
}

/**
 * Evaluate `formula` with the given parameter values. Throws `FormulaError`
 * on a syntax error, on a non-finite result, or on any name that is not a
 * parameter, a known function (`log`, `ln`, `exp`, `sqrt`, `abs`, `floor`,
 * `ceil`, `round`), or a constant (`pi`, `e`). Parameters shadow constants.
 */
export function evaluateFormula(
  formula: string,
  params: Readonly<Record<string, number>> = {},
): number {
  const value = new Parser(tokenize(formula), params).parse();
  if (!Number.isFinite(value)) {
    throw new FormulaError('the formula does not evaluate to a finite number');
  }
  return value;
}

/** The parameter-like names a formula uses (every name that is not a function call). */
export function formulaNames(formula: string): string[] {
  const tokens = tokenize(formula);
  const names = new Set<string>();
  tokens.forEach((t, i) => {
    if (t.kind !== 'name') return;
    const next = tokens[i + 1];
    if (next?.kind === 'op' && next.value === '(') return;
    names.add(t.value);
  });
  return [...names];
}
