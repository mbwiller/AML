/**
 * The MDX component registry (docs/CONTENT_AUTHORING.md §4).
 * Every component here is provided globally by the lesson layout, so lesson
 * files never import anything. Changing this list needs both developers' review.
 */
import Sticky from './Sticky.astro';

export const mdxComponents = {
  Sticky,
};
