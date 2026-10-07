/**
 * "Copy state link": a widget's current params in the URL hash,
 * `#w=<name>:<base64url json>` (STYLE_GUIDE.md §7 point 3).
 *
 * Framework-free and unit-tested. The decoder never throws; a malformed hash
 * decodes to `null` and the caller keeps the authored params. The caller is
 * responsible for validating the decoded params against the manifest.
 */

export const STATE_LINK_KEY = 'w';

export interface StateLink {
  name: string;
  params: Record<string, unknown>;
}

/** `w=<name>:<base64url json>` (no leading `#`). */
export function encodeStateLink(name: string, params: Record<string, unknown>): string {
  return `${STATE_LINK_KEY}=${name}:${toBase64Url(JSON.stringify(params))}`;
}

/** Parse a `location.hash` (with or without `#`); `null` when it is not a state link. */
export function decodeStateLink(hash: string): StateLink | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw.startsWith(`${STATE_LINK_KEY}=`)) return null;
  const body = raw.slice(STATE_LINK_KEY.length + 1);
  const colon = body.indexOf(':');
  if (colon <= 0) return null;
  const name = body.slice(0, colon);
  if (!/^[a-z0-9-]+$/.test(name)) return null;
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(body.slice(colon + 1)));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return { name, params: parsed as Record<string, unknown> };
  } catch {
    return null;
  }
}

/** `url` with its hash replaced by the state link for `name`. */
export function withStateLink(url: string, name: string, params: Record<string, unknown>): string {
  const base = url.split('#')[0] ?? url;
  return `${base}#${encodeStateLink(name, params)}`;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded =
    text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
