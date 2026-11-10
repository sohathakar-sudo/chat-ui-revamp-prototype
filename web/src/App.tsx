import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from './lib/store';
import { Loader, LoaderOverlay } from './screens/Loader';
import { Home } from './screens/Home';
import { Chat } from './screens/Chat';
import { Voice } from './screens/Voice';
import { ChooseVoice } from './screens/ChooseVoice';
import { ChooseVariant } from './screens/ChooseVariant';
import { SWOOSH_MS, transClass } from './lib/transitions';

export function App() {
  const screen = useStore((s) => s.screen);
  const trans = useStore((s) => s.trans);
  const swoosh = trans?.swoosh && trans.stage !== 'press' ? trans.swoosh : null;

  // Loader → Chat: keep the loader art on top of Chat and fade it out (crossfade, no blank frame).
  const prev = useRef(screen);
  const [overlay, setOverlay] = useState(false);
  useEffect(() => {
    if (prev.current === 'loader' && screen === 'chat') setOverlay(true);
    prev.current = screen;
  }, [screen]);
  const overlayDone = useCallback(() => setOverlay(false), []);

  // Scale the 412×917 phone frame to fit shorter desktop windows.
  useEffect(() => {
    const fit = () => {
      const s = Math.min(1, (window.innerHeight - 40) / 941, (window.innerWidth - 40) / 436);
      document.documentElement.style.setProperty('--fit', String(Math.max(0.5, s)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="stage">
      <div className="device">
        <div className="screen">
          <div className={`scr-wrap ${transClass(trans)}`}>
            {screen === 'pick' && <ChooseVariant />}
            {screen === 'loader' && <Loader />}
            {screen === 'home' && <Home />}
            {screen === 'chat' && <Chat />}
            {screen === 'voice' && <Voice />}
            {screen === 'voices' && <ChooseVoice />}
          </div>
          {overlay && <LoaderOverlay onDone={overlayDone} />}
          {swoosh && (
            <div className={`swoosh ${swoosh}${trans!.variant === 'A' ? ' bw' : ''}`} key={trans!.kind} style={{ ['--swoosh-ms' as string]: `${trans!.variant === 'A' ? 900 : SWOOSH_MS}ms` }} aria-hidden>
              {trans!.variant === 'A' ? <><i className="sw-blue" /><i className="sw-white" /></> : <><i className="sw-cyan" /><i className="sw-orange" /></>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
