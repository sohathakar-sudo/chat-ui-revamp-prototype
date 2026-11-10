import { useEffect } from 'react';
import { useStore } from './lib/store';
import { Loader } from './screens/Loader';
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
  // Variant A Chat → Voice: the Speak pill's glow blooms into a full-screen gradient across the swap.
  const bloom = trans?.variant === 'A' && trans.kind === 'chat-voice' && trans.stage !== 'press' ? trans.stage : null;

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
          {bloom && <div className={`bloom ${bloom}`} aria-hidden />}
          {swoosh && (
            <div className={`swoosh ${swoosh}`} key={trans!.kind} style={{ ['--swoosh-ms' as string]: `${SWOOSH_MS}ms` }} aria-hidden>
              <i className="sw-cyan" />
              <i className="sw-orange" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
