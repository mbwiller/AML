/**
 * The single React island for every widget (`client:visible` from
 * `src/components/mdx/Widget.astro`).
 *
 * - Resolves `name` in `registry.ts` with `React.lazy`, so each widget is its
 *   own code-split chunk fetched only when the figure scrolls into view.
 * - Owns the params state: the authored params, then (once the module and its
 *   manifest are loaded) the `#w=<name>:<base64url>` state link if one is in
 *   the URL and validates against the manifest.
 * - Listens for `aml:figure-state` CustomEvents on its own
 *   `figure[data-widget]` and passes `detail` down as `figureState`.
 * - Marks the figure `data-hydrated` when the widget has rendered so the
 *   static fallback (rendered by Widget.astro) hides; removes it again on an
 *   error so the fallback is what the reader sees.
 */
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ErrorInfo,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';

import { WidgetFrame } from './_shared/WidgetFrame';
import { decodeStateLink } from './_shared/state-link';
import { isWidgetName, registry, type WidgetName } from './registry';
import type { WidgetManifest, WidgetModule, WidgetProps } from './types';

type AnyParams = Record<string, unknown>;
type HostWidget = ComponentType<WidgetProps<AnyParams>>;

export interface WidgetHostProps {
  name: string;
  /** Validated params with defaults applied (from Widget.astro). */
  params: AnyParams;
  /** Reserved body height from the manifest. */
  height: number;
  /** Only when Widget.astro did not render the header itself. */
  header?: { title: string; challenge?: string | undefined } | undefined;
}

export const FIGURE_STATE_EVENT = 'aml:figure-state';

/* ---------- module cache: one fetch per widget name ---------- */

const modulePromises = new Map<WidgetName, Promise<WidgetModule>>();

function loadWidget(name: WidgetName): Promise<WidgetModule> {
  let promise = modulePromises.get(name);
  if (!promise) {
    promise = registry[name]();
    modulePromises.set(name, promise);
  }
  return promise;
}

/** One `React.lazy` per registry entry, created once at module load (never in render). */
const lazyComponents = Object.fromEntries(
  (Object.keys(registry) as WidgetName[]).map((name) => [
    name,
    lazy(() =>
      loadWidget(name).then((m) => ({
        // The registry types every widget as accepting `never` params (so each
        // Widget.tsx keeps its own precise props); the host supplies a record.
        default: m.default as unknown as HostWidget,
      })),
    ),
  ]),
) as Record<WidgetName, LazyExoticComponent<HostWidget>>;

/* ---------- error boundary ---------- */

interface BoundaryProps {
  fallback: ReactNode;
  onError: (error: Error) => void;
  children: ReactNode;
}

class WidgetErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[widget] render failed', error, info.componentStack);
    this.props.onError(error);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ---------- host ---------- */

const noopSubscribe = () => () => undefined;
const useIsClient = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

function Skeleton({ height, text }: { height: number; text: string }) {
  return (
    <div className="widget-skeleton" style={{ minHeight: height }} role="status">
      {text}
    </div>
  );
}

export default function WidgetHost({ name, params: initial, height, header }: WidgetHostProps) {
  const isClient = useIsClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const [params, setParamsState] = useState<AnyParams>(initial);
  const [manifest, setManifest] = useState<WidgetManifest | null>(null);
  const [figureState, setFigureState] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);

  const known = isWidgetName(name);
  const Widget = known ? lazyComponents[name] : null;

  const figure = () => rootRef.current?.closest<HTMLElement>('figure[data-widget]') ?? null;

  // Load the module (shared promise with React.lazy), then restore a state link.
  useEffect(() => {
    if (!known || !isClient) return;
    let alive = true;
    loadWidget(name).then(
      (m) => {
        if (!alive) return;
        setManifest(m.manifest);
        const link = decodeStateLink(window.location.hash);
        if (link?.name === name) {
          const restored = m.manifest.params.safeParse({ ...initial, ...link.params });
          if (restored.success) setParamsState(restored.data as AnyParams);
        }
      },
      (e: unknown) => {
        if (!alive) return;
        console.error('[widget] failed to load', name, e);
        setError('This explorable could not be loaded.');
      },
    );
    return () => {
      alive = false;
    };
  }, [known, isClient, name, initial]);

  // figureState from <Step figureState> reveals, dispatched on our own figure.
  useEffect(() => {
    const el = figure();
    if (!el) return;
    const handler = (event: Event) => setFigureState((event as CustomEvent).detail);
    el.addEventListener(FIGURE_STATE_EVENT, handler);
    return () => el.removeEventListener(FIGURE_STATE_EVENT, handler);
  }, []);

  // Hide the static fallback once we can render; show it again on an error.
  useEffect(() => {
    const el = figure();
    if (!el) return;
    if (manifest && !error) el.setAttribute('data-hydrated', '');
    else el.removeAttribute('data-hydrated');
  }, [manifest, error]);

  const setParams = useCallback((patch: Partial<AnyParams>) => {
    setParamsState((prev) => ({ ...prev, ...patch }));
  }, []);
  const reset = useCallback(() => setParamsState(initial), [initial]);
  const onError = useCallback(() => setError('This explorable hit an error.'), []);

  const ready = isClient && manifest !== null && error === null;

  let body: ReactNode;
  if (!known) {
    body = <Skeleton height={height} text={`Unknown widget "${name}".`} />;
  } else if (error) {
    body = <Skeleton height={height} text={error} />;
  } else if (!isClient || !Widget) {
    body = <Skeleton height={height} text="Loading explorable…" />;
  } else {
    body = (
      <WidgetErrorBoundary
        fallback={<Skeleton height={height} text="This explorable hit an error." />}
        onError={onError}
      >
        <Suspense fallback={<Skeleton height={height} text="Loading explorable…" />}>
          <Widget
            params={params}
            initial={initial}
            setParams={setParams}
            figureState={figureState}
          />
        </Suspense>
      </WidgetErrorBoundary>
    );
  }

  return (
    <div ref={rootRef} className="widget-host" data-widget-host={name}>
      <WidgetFrame
        name={name}
        height={height}
        params={params}
        onReset={reset}
        ready={ready}
        header={header}
      >
        {body}
      </WidgetFrame>
    </div>
  );
}
