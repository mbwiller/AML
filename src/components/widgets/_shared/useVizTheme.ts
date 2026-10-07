/**
 * The only way a widget gets a color (STYLE_GUIDE.md §7 point 4).
 *
 * Reads the semantic tokens from the document's computed style and re-reads
 * them when `data-theme` changes on `<html>` (the theme toggle), so SVG
 * `fill`/`stroke` strings follow the theme without a reload. Before mount
 * (SSR, tests without a DOM) the strings are `var(--token)` references, which
 * are equally valid as SVG presentation attributes.
 */
import { useMemo, useSyncExternalStore } from 'react';

const VIZ_KEYS = ['viz-1', 'viz-2', 'viz-3', 'viz-4', 'viz-5', 'viz-6'] as const;
const FIELD_KEYS = [
  'probability',
  'statistics',
  'linear-algebra',
  'calculus',
  'information',
  'ml',
  'evaluation',
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export interface VizTheme {
  /** 'light' | 'dark' as set on `<html data-theme>`. */
  theme: 'light' | 'dark';
  /** Categorical series `--viz-1 … --viz-6`. */
  viz: readonly [string, string, string, string, string, string];
  positive: string;
  negative: string;
  boundary: string;
  field: Record<FieldKey, string>;
  fg: string;
  bg: string;
  surface: string;
  surface2: string;
  muted: string;
  border: string;
  accent: string;
}

function readToken(style: CSSStyleDeclaration | null, name: string): string {
  const value = style?.getPropertyValue(`--${name}`).trim();
  return value ? value : `var(--${name})`;
}

function readTheme(themeAttr: string): VizTheme {
  const style =
    typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);
  const read = (name: string) => readToken(style, name);
  return {
    theme: themeAttr === 'dark' ? 'dark' : 'light',
    viz: VIZ_KEYS.map(read) as unknown as VizTheme['viz'],
    positive: read('viz-positive'),
    negative: read('viz-negative'),
    boundary: read('viz-boundary'),
    field: Object.fromEntries(FIELD_KEYS.map((k) => [k, read(`field-${k}`)])) as Record<
      FieldKey,
      string
    >,
    fg: read('fg'),
    bg: read('bg'),
    surface: read('surface'),
    surface2: read('surface-2'),
    muted: read('muted'),
    border: read('border'),
    accent: read('accent'),
  };
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

const getSnapshot = (): string => document.documentElement.getAttribute('data-theme') ?? 'light';
const getServerSnapshot = (): string => 'light';

export function useVizTheme(): VizTheme {
  const themeAttr = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => readTheme(themeAttr), [themeAttr]);
}
