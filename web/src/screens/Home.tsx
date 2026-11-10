import { useEffect, useState } from 'react';
import { store, useStore } from '../lib/store';
import { unlockAudio, voiceSupported } from '../lib/speech';
import { HomeA } from './a/HomeA';
import { HomeB } from './b/HomeB';
import { LoaderArt } from './Loader';
import { config } from '../../../shared/config';

export function Home() {
  const transition = useStore((s) => s.homeTransition);
  const variant = useStore((s) => s.variant);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    if (!transition) return;
    const t = setTimeout(() => store.set({ homeTransition: false }), 1150);
    return () => clearTimeout(t);
  }, [transition]);

  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => setTip(false), config.tooltipMs);
    const off = () => setTip(false);
    window.addEventListener('pointerdown', off, { once: true, capture: true });
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', off, { capture: true }); };
  }, [tip]);

  const startVoice = () => {
    if (!voiceSupported()) { setTip(true); return; }
    unlockAudio();
    store.enterVoice();
  };

  return (
    <div className={`scr home${variant === 'B' ? ' home-b' : ''}`}>
      {variant === 'B' ? <HomeB startVoice={startVoice} tip={tip} /> : <HomeA startVoice={startVoice} tip={tip} />}
      {transition && (
        <div className="to-home loader">
          <LoaderArt />
        </div>
      )}
    </div>
  );
}
