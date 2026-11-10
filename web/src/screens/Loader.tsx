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
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 2400);
    const b = setTimeout(() => store.go('chat'), 2850);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <div className={`scr loader${leaving ? ' leaving' : ''}`}>
      <LoaderArt />
    </div>
  );
}
