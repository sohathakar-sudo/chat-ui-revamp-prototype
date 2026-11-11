// Hide a top bar when scrolling down, show it when scrolling up or near the top.
// Hysteresis (a real direction threshold) plus a short cooldown after each toggle
// stop the flicker from momentum/trackpad scrolling and from the bar's own collapse
// (which shifts the thread and can re-fire the scroll handler).
import { useEffect, useRef, useState, type RefObject } from 'react';

const SHOW_AT_TOP = 16; // always show the bar near the top
const DELTA = 28;       // how far you must move in one direction to flip the bar
const COOLDOWN_MS = 320; // ignore scrolls just after a toggle (covers the 250ms collapse)

export function useHideOnScroll(ref: RefObject<HTMLElement>) {
  const [hidden, setHidden] = useState(false);
  const lastTop = useRef(0);
  const coolUntil = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const top = el.scrollTop;
      if (top <= SHOW_AT_TOP) { lastTop.current = top; coolUntil.current = 0; setHidden(false); return; }
      if (performance.now() < coolUntil.current) return; // let a toggle settle before reacting again
      const d = top - lastTop.current;
      if (d > DELTA) { lastTop.current = top; coolUntil.current = performance.now() + COOLDOWN_MS; setHidden(true); }
      else if (d < -DELTA) { lastTop.current = top; coolUntil.current = performance.now() + COOLDOWN_MS; setHidden(false); }
      // Small moves don't move the reference, so micro-reversals can't accumulate into a flip.
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref]);
  return hidden;
}
