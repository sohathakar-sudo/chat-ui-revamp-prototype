import { useEffect, useRef, useState } from 'react';
import { config, VOICE_ORDER, type VoiceName } from '../../../shared/config';
import { store } from '../lib/store';
import { speak, unlockAudio, type Speech } from '../lib/speech';
import { StatusBar } from '../components/StatusBar';

// Decorative blob per card, positioned as in Figma 526:8562 (card is 203px wide).
const BLOBS: Record<VoiceName, { src: string; size: number; left: number; top: number }> = {
  Cindy: { src: '/assets/card-blob-1.svg', size: 223, left: 81.5, top: -75 },
  Daniel: { src: '/assets/card-blob-2.svg', size: 312, left: -110.5, top: -120 },
  Lucy: { src: '/assets/card-blob-3.svg', size: 301, left: -43.5, top: -115 },
  Harrison: { src: '/assets/card-blob-3.svg', size: 301, left: 16.5, top: -55 },
};

export function ChooseVoice() {
  const [selected, setSelected] = useState<VoiceName>(store.get().voice);
  const sample = useRef<Speech | null>(null);

  useEffect(() => () => sample.current?.stop(), []);

  const pick = (v: VoiceName) => {
    setSelected(v);
    unlockAudio();
    sample.current?.stop();
    sample.current = speak(config.voice.sampleLine, v);
  };

  const close = (save: boolean) => {
    sample.current?.stop();
    if (save) store.set({ voice: selected });
    store.go('voice');
  };

  return (
    <div className="scr">
      <StatusBar />
      <div className="voices-body">
        <div className="v-head">
          <button className="v-x" onClick={() => close(false)} aria-label="Close">
            <img src="/assets/close.svg" width={20} height={20} alt="" />
          </button>
        </div>
        <div className="voices-main">
          <h1>Choose a Voice</h1>
          <div className="cards" role="radiogroup" aria-label="Voices">
            {VOICE_ORDER.map((v) => {
              const b = BLOBS[v];
              const on = v === selected;
              return (
                <button key={v} className={`vcard${on ? ' sel' : ''}`} role="radio" aria-checked={on} onClick={() => pick(v)}>
                  <img className="blobimg" src={b.src} alt="" style={{ width: b.size, height: b.size, left: b.left, top: b.top }} />
                  <span className="n">{v}</span>
                  <span className="d">{config.voices[v].description}</span>
                  {on && <img className="tick" src="/assets/selected-check.svg" alt="" />}
                </button>
              );
            })}
          </div>
        </div>
        <button className="continue" onClick={() => close(true)}>Continue</button>
      </div>
    </div>
  );
}
