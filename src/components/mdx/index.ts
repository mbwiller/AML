/**
 * The MDX component registry (docs/CONTENT_AUTHORING.md §4).
 * Every component here is provided globally by the lesson layout, so lesson
 * files never import anything. Changing this list needs both developers' review.
 * Names must match `names.ts`, which validate-content reads without Astro.
 */
import Callout from './Callout.astro';
import Check from './Check.astro';
import Chunk from './Chunk.astro';
import Connections from './Connections.astro';
import Definition from './Definition.astro';
import Derivation from './Derivation.astro';
import EqRef from './EqRef.astro';
import Example from './Example.astro';
import Figure from './Figure.astro';
import Frame from './Frame.astro';
import HomeworkBridge from './HomeworkBridge.astro';
import Hook from './Hook.astro';
import Intuition from './Intuition.astro';
import Lemma from './Lemma.astro';
import Notebook from './Notebook.astro';
import Objectives from './Objectives.astro';
import Pitfall from './Pitfall.astro';
import Proof from './Proof.astro';
import Proposition from './Proposition.astro';
import SlideRef from './SlideRef.astro';
import Step from './Step.astro';
import Sticky from './Sticky.astro';
import Summary from './Summary.astro';
import Theorem from './Theorem.astro';
import Widget from './Widget.astro';

import type { MdxComponentName } from './names';

export const mdxComponents = {
  Frame,
  Objectives,
  Hook,
  Definition,
  Theorem,
  Proposition,
  Lemma,
  Intuition,
  Derivation,
  Chunk,
  Step,
  Proof,
  EqRef,
  Callout,
  SlideRef,
  Widget,
  Figure,
  Example,
  Check,
  Pitfall,
  Connections,
  Notebook,
  HomeworkBridge,
  Summary,
  Sticky,
} satisfies Record<MdxComponentName, unknown>;

export type MdxComponents = typeof mdxComponents;
