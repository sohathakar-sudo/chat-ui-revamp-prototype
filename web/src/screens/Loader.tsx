import { useEffect, useState } from 'react';
import { store } from '../lib/store';

// Rebuilt from the rendered frame of the Figma code layer (269-1307); see README "Design notes".
export function LoaderArt() {
  return (
    <>
      <img className="mark" src="/assets/wysa-wordmark@2x.png" alt="wysa" />
      <div className="blob" />
      <p className="label">Loading your safe corner...</p>
    </>
  );
}

export function Loader() {
  // Hand off to Chat directly; App keeps a fading copy of the loader on top (see LoaderOverlay) so
  // there is never a blank frame between the two screens.
  useEffect(() => {
    const a = setTimeout(() => store.go('chat'), 2400);
    return () => clearTimeout(a);
  }, []);
  return (
    <div className="scr loader">
      <LoaderArt />
    </div>
  );
}

/** Crossfade layer: sits above the freshly mounted Chat while the loader's art eases out. */
export function LoaderOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="scr loader loader-out" aria-hidden>
      <LoaderArt />
    </div>
  );
}
