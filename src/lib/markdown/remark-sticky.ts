/**
 * remark plugin: turns `[[term]]` and `[[term|display text]]` into
 * `<Sticky id="term">display text</Sticky>` MDX JSX nodes.
 *
 * The Sticky component is provided globally by the lesson layout; the
 * first use of a term in a document gets `first`, later uses do not.
 * Term resolution against the glossary happens in scripts/validate-content.ts.
 */
import type { Root, Text, PhrasingContent } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const PATTERN = /\[\[([a-z0-9][a-z0-9-]*)(?:\|([^\]]+))?\]\]/g;

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string | null;
}

interface MdxJsxTextElement {
  type: 'mdxJsxTextElement';
  name: string;
  attributes: MdxJsxAttribute[];
  children: PhrasingContent[];
}

export function stickyNode(id: string, display: string, first: boolean): MdxJsxTextElement {
  const attributes: MdxJsxAttribute[] = [{ type: 'mdxJsxAttribute', name: 'id', value: id }];
  if (first) attributes.push({ type: 'mdxJsxAttribute', name: 'first', value: null });
  return {
    type: 'mdxJsxTextElement',
    name: 'Sticky',
    attributes,
    children: [{ type: 'text', value: display }],
  };
}

/** Split one text value into text and sticky nodes; `seen` tracks first uses. */
export function splitStickies(value: string, seen: Set<string>): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  let last = 0;
  for (const match of value.matchAll(PATTERN)) {
    const [whole, id, display] = match;
    if (id === undefined) continue;
    const index = match.index;
    if (index > last) out.push({ type: 'text', value: value.slice(last, index) });
    const first = !seen.has(id);
    seen.add(id);
    out.push(stickyNode(id, display ?? id.replace(/-/g, ' '), first) as unknown as PhrasingContent);
    last = index + whole.length;
  }
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

export const remarkSticky: Plugin<[], Root> = () => (tree) => {
  const seen = new Set<string>();
  visit(tree, 'text', (node: Text, index, parent) => {
    if (!parent || index === undefined) return;
    if (!PATTERN.test(node.value)) {
      PATTERN.lastIndex = 0;
      return;
    }
    PATTERN.lastIndex = 0;
    const replacement = splitStickies(node.value, seen);
    parent.children.splice(index, 1, ...replacement);
    return index + replacement.length;
  });
};
