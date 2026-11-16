import { useEffect, useState } from 'react';
import { store } from '../lib/store';
import { DuoOrb } from '../components/DuoOrb';

// Rebuilt from the rendered frame of the Figma code layer (269-1307); see README "Design notes".
export function LoaderArt() {
  // Variant C: the Wysa home orb, rotating and breathing, replaces the plain blob.
  const orbC = store.get().variant === 'C';
  return (
    <>
      <img className="mark" src="/assets/wysa-wordmark@2x.png" alt="wysa" />
      {orbC ? <div className="blob-orb"><DuoOrb tone="cycle" /></div> : <div className="blob" />}
      <p className="label">Loading your safe corner...</p>
    </>
  );
}

export function Loader() {
  // Hand off to Chat directly; App keeps a fading copy of the loader on top (see LoaderOverlay) so
  // there is never a blank frame between the two screens.
  useEffect(() => {
    // Variant C: minimum of 2 full yellow -> blue -> yellow cycles (3s each) before the chat appears.
    const ms = store.get().variant === 'C' ? 6000 : 2400;
    const a = setTimeout(() => store.go('chat'), ms);
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
    const t = setTimeout(onDone, 950);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="scr loader loader-out" aria-hidden>
      <LoaderArt />
    </div>
  );
}
