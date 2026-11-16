import { useEffect, useState } from 'react';

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
    <button className="paper-toggle" aria-pressed={on} onClick={() => { const n = !on; setOn(n); applyPaper(n); }}>
      Paper texture: {on ? 'On' : 'Off'}
    </button>
  );
}
