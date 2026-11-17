import { useEffect, useState, useSyncExternalStore } from 'react';

// Paper texture (Figma Paper Chat 778:8372 / Voice Paper 778:8412, texture node 778:8471 / 778:8473).
// Visibility is a desktop-only prototype toggle (PaperToggle); default off. State lives on <html data-paper>.
const KEY = 'wysa.paper';

function readPaper(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

function applyPaper(on: boolean) {
  document.documentElement.dataset.paper = on ? 'on' : 'off';
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* noop */ }
}

/** Bottom background layer: 917×917, x -252.5, centred vertically, darken blend at 40% (see .paper-layer). */
export function PaperLayer() {
  return <img className="paper-layer" src="/assets/c/paper-texture.jpg" alt="" aria-hidden draggable={false} />;
}

/** Floating on/off button, shown only beside the phone frame on desktop (hidden below 501px via CSS). */
export function PaperToggle() {
  const [on, setOn] = useState(readPaper);
  useEffect(() => { document.documentElement.dataset.paper = on ? 'on' : 'off'; }, [on]);
  return (
    <>
    <button className="paper-toggle" aria-pressed={on} onClick={() => { const n = !on; setOn(n); applyPaper(n); }}>
      Paper texture: {on ? 'On' : 'Off'}
    </button>
    <ErrorToggle />
    </>
  );
}

const EKEY = 'wysa.errors';
const subs = new Set<() => void>();
/** Error preview (desktop toggle): steps through every error screen in Figma "Error & missing states". */
export type ErrPreview = 'reply' | 'mic' | 'silence' | 'network' | 'offline' | 'reconnecting'
  | 'typing' | 'slow' | 'cutoff' | 'backonline' | 'explainer' | 'blocked' | 'nomic' | 'held';
const ORDER: (ErrPreview | null)[] = [null, 'reply', 'mic', 'silence', 'network', 'offline', 'reconnecting', 'typing', 'slow', 'cutoff', 'backonline', 'explainer', 'blocked', 'nomic', 'held'];
const LABEL: Record<ErrPreview, string> = { reply: 'Reply failed', mic: 'Mic denied', silence: 'Nothing heard', network: 'Connection lost', offline: 'Offline', reconnecting: 'Reconnecting',
  typing: 'Wysa typing', slow: 'Slow reply', cutoff: 'Reply cut off', backonline: 'Back online', explainer: 'Mic explainer', blocked: 'Mic blocked', nomic: 'No mic', held: 'Paused, reply held' };
function readErr(): ErrPreview | null {
  try { const v = localStorage.getItem(EKEY); return (ORDER as (string | null)[]).includes(v) && v ? (v as ErrPreview) : null; } catch { return null; }
}
let errOn = readErr();
if (typeof document !== 'undefined') document.documentElement.dataset.errors = errOn ?? 'off';
function setErr(v: ErrPreview | null) {
  errOn = v;
  document.documentElement.dataset.errors = v ?? 'off';
  try { localStorage.setItem(EKEY, v ?? ''); } catch { /* noop */ }
  subs.forEach((f) => f());
}
export function useErrorPreview(): ErrPreview | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => errOn);
}

/** Desktop-only floating toggle (below the paper toggle): each click shows the next error state. */
export function ErrorToggle() {
  const on = useErrorPreview();
  return (
    <button className="err-toggle" aria-pressed={!!on} onClick={() => setErr(ORDER[(ORDER.indexOf(on) + 1) % ORDER.length])}>
      Errors: {on ? LABEL[on] : 'Off'}
    </button>
  );
}
