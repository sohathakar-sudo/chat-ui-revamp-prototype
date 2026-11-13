import { useEffect, useRef, useState } from 'react';
import { config, VOICE_ORDER, type VoiceName } from '../../../shared/config';
import { store, useStore, type Variant } from '../lib/store';
import { speak, unlockAudio, type Speech } from '../lib/speech';
import { StatusBar } from '../components/StatusBar';

type Blob = { src: string; size: number; left: number; top: number };

// Variant-specific look: card blobs positioned as in Figma (card is 203px wide).
const SKINS: Record<Exclude<Variant, 'C'>, { blobs: Record<VoiceName, Blob>; className: string }> = {
  // Variant A, 526:8562
  A: {
    className: '',
    blobs: {
      Cindy: { src: '/assets/card-blob-1.svg', size: 223, left: 81.5, top: -75 },
      Daniel: { src: '/assets/card-blob-2.svg', size: 312, left: -110.5, top: -120 },
      Lucy: { src: '/assets/card-blob-3.svg', size: 301, left: -43.5, top: -115 },
      Harrison: { src: '/assets/card-blob-3.svg', size: 301, left: 16.5, top: -55 },
    },
  },
  // Variant B, 532:10094 (blob SVGs include their blur margin)
  B: {
    className: ' voices-b',
    blobs: {
      Cindy: { src: '/assets/b/card-blob-1.svg', size: 303, left: 41.5, top: -115 },
      Daniel: { src: '/assets/b/card-blob-2.svg', size: 276, left: -92.5, top: -100 },
      Lucy: { src: '/assets/b/card-blob-3.svg', size: 381, left: -83.5, top: -155 },
      Harrison: { src: '/assets/b/card-blob-3.svg', size: 381, left: -23.5, top: -95 },
    },
  },
};

export function ChooseVoice() {
  const variant = useStore((s) => s.variant);
  const skin = SKINS[variant === 'C' ? 'B' : variant]; // Variant C reuses B's Choose a Voice
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
    <div className={`scr${skin.className}`}>
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
              const b = skin.blobs[v];
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
