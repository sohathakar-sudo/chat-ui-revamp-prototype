// Hidden prototype affordance: triple-tap the status bar to reopen the
// "Choose a Variant" divergence screen (mobile, where there is no frame).
import { useRef } from 'react';
import { store } from '../lib/store';

/** Triple-tap detector for the status bar. */
export function useTripleTap() {
  const taps = useRef<number[]>([]);
  return () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 600), now];
    if (taps.current.length >= 3) { taps.current = []; store.set({ screen: 'pick' }); }
  };
}
