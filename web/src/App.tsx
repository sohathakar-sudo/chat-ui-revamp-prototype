import { useEffect } from 'react';
import { useStore } from './lib/store';
import { Loader } from './screens/Loader';
import { Home } from './screens/Home';
import { Chat } from './screens/Chat';
import { Voice } from './screens/Voice';
import { ChooseVoice } from './screens/ChooseVoice';

export function App() {
  const screen = useStore((s) => s.screen);

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
          {screen === 'loader' && <Loader />}
          {screen === 'home' && <Home />}
          {screen === 'chat' && <Chat />}
          {screen === 'voice' && <Voice />}
          {screen === 'voices' && <ChooseVoice />}
        </div>
      </div>
    </div>
  );
}
