/**
 * The common frame every widget renders inside (STYLE_GUIDE.md §7 point 3).
 *
 * The title and challenge line are server-rendered by `Widget.astro` so they
 * are visible before hydration and without JavaScript; this component owns
 * the interactive chrome: the toolbar (reset, "copy state link", a polite
 * status line) and the body whose height the manifest reserves. Pass `header`
 * only when the frame is mounted somewhere `Widget.astro` did not render it.
 */
import { Link, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { withStateLink } from './state-link';

export interface WidgetFrameProps {
  name: string;
  /** Reserved body height in CSS px (manifest `height`). */
  height: number;
  params: Record<string, unknown>;
  onReset: () => void;
  /** Disable the toolbar until the widget module has loaded. */
  ready?: boolean;
  header?: { title: string; challenge?: string | undefined } | undefined;
  children: ReactNode;
}

export function WidgetFrame({
  name,
  height,
  params,
  onReset,
  ready = true,
  header,
  children,
}: WidgetFrameProps) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (status === null) return;
    const timer = window.setTimeout(() => setStatus(null), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copyStateLink = () => {
    const url = withStateLink(window.location.href, name, params);
    window.history.replaceState(window.history.state, '', url);
    const clipboard = navigator.clipboard;
    if (clipboard && typeof clipboard.writeText === 'function') {
      clipboard
        .writeText(url)
        .then(() => setStatus('Link copied'))
        .catch(() => setStatus('Link is in the address bar'));
    } else {
      setStatus('Link is in the address bar');
    }
  };

  return (
    <div className="widget-frame" data-widget-frame>
      {header ? (
        <div className="widget-head">
          <span className="widget-title">{header.title}</span>
          <span className="widget-name">{name}</span>
          {header.challenge ? <p className="widget-challenge">{header.challenge}</p> : null}
        </div>
      ) : null}
      <div className="widget-toolbar" role="toolbar" aria-label="Widget controls">
        <button type="button" className="widget-btn" onClick={onReset} disabled={!ready}>
          <RotateCcw size={14} aria-hidden="true" />
          Reset
        </button>
        <button type="button" className="widget-btn" onClick={copyStateLink} disabled={!ready}>
          <Link size={14} aria-hidden="true" />
          Copy state link
        </button>
        <span className="widget-status" aria-live="polite">
          {status}
        </span>
      </div>
      <div className="widget-live" style={{ minHeight: height }}>
        {children}
      </div>
    </div>
  );
}
