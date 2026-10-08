/**
 * The widget contract's types (STYLE_GUIDE.md §7; VISION.md §12.4).
 *
 * Framework-free on purpose: `manifests.ts` imports every widget's manifest
 * through this file so `Widget.astro` can validate `<Widget>` props at build
 * time without pulling React into the Astro render.
 */
import type { z } from 'zod';

/** Any Zod object schema whose output is a JSON-serializable record. */
export type ParamsSchema = z.ZodObject<z.ZodRawShape>;

export interface WidgetManifest<S extends ParamsSchema = ParamsSchema> {
  /** Folder name and the `name` prop in MDX: kebab-case, globally unique. */
  name: string;
  /** Shown in the figure header, sentence case. */
  title: string;
  /** The default "what to try" line; a lesson may override it with the `challenge` prop. */
  challenge: string;
  /** Lesson numbers that embed it ("7.1"). Shown on /dev/widgets. */
  usedIn: readonly string[];
  /**
   * Height in CSS pixels reserved for the island body at desktop width, so
   * hydration causes no layout shift. The body may grow on narrow screens
   * (controls stack under the plot) but never shrinks below this.
   */
  height: number;
  /** Zod params schema. Every key has a default; unknown keys are a build error. */
  params: S;
  /**
   * Optional static fallback: pure SVG markup (tokens via `var(--viz-*)`,
   * no scripts) for no-JS, print, and the moment before hydration.
   * Receives the parsed params of that embedding.
   */
  fallback?(params: z.output<S>): string;
}

/** The props every `Widget.tsx` default export receives from `WidgetHost`. */
export interface WidgetProps<P extends Record<string, unknown>> {
  /** Current params (authored values, then any state-link or slider changes). */
  params: P;
  /** The authored params of this embedding; `<Param>` reset targets go here. */
  initial: P;
  /** Merge a partial update into `params`. */
  setParams(patch: Partial<P>): void;
  /**
   * The last `aml:figure-state` payload dispatched on this widget's
   * `<figure data-widget>` (by a revealed `<Step figureState>`), or undefined.
   */
  figureState?: unknown;
}

/**
 * What `registry.ts` loaders resolve to: the component plus its manifest.
 * `default` is typed with `never` params so every `Widget.tsx` can keep its
 * precise `WidgetProps<Params>` and still fit the registry; `WidgetHost`
 * supplies the params record (one documented cast there).
 */
export interface WidgetModule {
  default: React.ComponentType<WidgetProps<never>>;
  manifest: WidgetManifest;
}

export type ParamsOf<M> = M extends WidgetManifest<infer S> ? z.output<S> : never;
