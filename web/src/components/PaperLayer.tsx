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
function readErr(): boolean {
  try { return localStorage.getItem(EKEY) === '1'; } catch { return false; }
}
let errOn = readErr();
if (typeof document !== 'undefined') document.documentElement.dataset.errors = errOn ? 'on' : 'off';
function setErr(on: boolean) {
  errOn = on;
  document.documentElement.dataset.errors = on ? 'on' : 'off';
  try { localStorage.setItem(EKEY, on ? '1' : '0'); } catch { /* noop */ }
  subs.forEach((f) => f());
}
export function useErrorPreview(): boolean {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => errOn);
}

/** Desktop-only floating toggle (below the paper toggle) to preview error states. */
export function ErrorToggle() {
  const on = useErrorPreview();
  return (
    <button className="err-toggle" aria-pressed={on} onClick={() => setErr(!on)}>
      Errors: {on ? 'On' : 'Off'}
    </button>
  );
}
