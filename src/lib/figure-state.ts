/**
 * The `figureState` contract between a `<Step>` and the explorable it drives
 * (docs/CONTENT_AUTHORING.md §4; VISION.md §9.1).
 *
 * When a step that carries `data-figure-state` is revealed, the derivation
 * engine dispatches
 *
 *     new CustomEvent('aml:figure-state', {
 *       bubbles: true,
 *       detail: { derivation: '<derivation id>', step: <1-based n>, state: <parsed JSON> },
 *     })
 *
 * on the `<section data-derivation>` element, and then the same event on the
 * nearest preceding `figure[data-widget]` in document order (the widget host).
 * Widget hosts listen for `FIGURE_STATE_EVENT` on their own `figure` element;
 * anything else (an outline, analytics) can listen on `document`, where the
 * event arrives once per dispatch target.
 *
 * Framework-free; DOM access is guarded so Vitest runs this in node.
 */

export const FIGURE_STATE_EVENT = 'aml:figure-state' as const;

/** The parsed `figureState` prop of a step: a JSON object, keys chosen by the widget. */
export type FigureState = Record<string, unknown>;

export interface FigureStateDetail {
  /** The `<Derivation id>` the step belongs to. */
  readonly derivation: string;
  /** The 1-based step number, counted across chunks (matches `#<id>-step-<n>`). */
  readonly step: number;
  /** The step's `figureState`, parsed. */
  readonly state: FigureState;
}

export type FigureStateEvent = CustomEvent<FigureStateDetail>;

/**
 * Parse a `figureState` attribute. Only a JSON object counts; arrays, scalars,
 * empty strings, and malformed JSON return `null` so a typo in a lesson never
 * throws at runtime (the content validator reports it at build time).
 */
export function parseFigureState(raw: string | null | undefined): FigureState | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as FigureState;
}

/** Build the event; `null` where `CustomEvent` does not exist (plain node without DOM globals). */
export function createFigureStateEvent(detail: FigureStateDetail): FigureStateEvent | null {
  if (typeof CustomEvent === 'undefined') return null;
  return new CustomEvent<FigureStateDetail>(FIGURE_STATE_EVENT, { bubbles: true, detail });
}

/**
 * Dispatch the event on the derivation section and then on the widget host
 * (when there is one). Returns the targets that received it, in order.
 */
export function dispatchFigureState(
  detail: FigureStateDetail,
  targets: { section: EventTarget; host?: EventTarget | null | undefined },
): EventTarget[] {
  const event = createFigureStateEvent(detail);
  if (!event) return [];
  const received: EventTarget[] = [];
  targets.section.dispatchEvent(event);
  received.push(targets.section);
  if (targets.host && targets.host !== targets.section) {
    targets.host.dispatchEvent(event);
    received.push(targets.host);
  }
  return received;
}

/**
 * The nearest `figure[data-widget]` that precedes `section` in document order,
 * or `null`. A following widget is deliberately not used: the contract says a
 * step drives the explorable the reader has already seen.
 */
export function findWidgetHost(section: Element): Element | null {
  const doc = section.ownerDocument;
  if (!doc) return null;
  let host: Element | null = null;
  for (const figure of doc.querySelectorAll('figure[data-widget]')) {
    const position = figure.compareDocumentPosition(section);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) host = figure;
    else break;
  }
  return host;
}
