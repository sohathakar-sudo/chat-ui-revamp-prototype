import { useEffect, useRef, useState } from 'react';
import { config } from '../../../shared/config';
import { store } from '../lib/store';
import { createRecognizer, MicDeniedError, openMic, transcribeOnServer, type Mic, type Recognizer } from '../lib/speech';

const BARS = 25;

type Props = {
  /** Called with the transcript; null = discarded silently (too short / cancelled). '' = nothing heard. */
  onDone(text: string | null): void;
  onDenied(): void;
};

export function Recorder({ onDone, onDenied }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const finished = useRef(false);
  const parts = useRef<{ mic?: Mic; rec?: Recognizer; media?: MediaRecorder; chunks: Blob[]; start: number }>({ chunks: [], start: 0 });

  const cleanup = () => {
    const p = parts.current;
    p.rec?.abort();
    if (p.media && p.media.state !== 'inactive') p.media.stop();
    p.mic?.close();
  };

  const finish = async (cancel: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const p = parts.current;
    const duration = performance.now() - p.start;
    if (cancel || duration < config.voiceNote.minMs) { cleanup(); onDone(null); return; }
    let text = '';
    try {
      if (store.get().status.stt === 'server' && p.media) {
        const stopped = new Promise<void>((r) => p.media!.addEventListener('stop', () => r(), { once: true }));
        p.media.stop();
        await stopped;
        p.mic?.close();
        text = await transcribeOnServer(new Blob(p.chunks, { type: p.media.mimeType }));
      } else if (p.rec) {
        p.mic?.close();
        text = await p.rec.stop();
      }
    } catch {
      text = '';
    }
    cleanup();
    onDone(text.trim());
  };

  useEffect(() => {
    let raf = 0;
    let alive = true;
    (async () => {
      try {
        const mic = await openMic();
        if (!alive) { mic.close(); return; }
        parts.current.mic = mic;
        parts.current.start = performance.now();
        if (store.get().status.stt === 'server') {
          const media = new MediaRecorder(mic.stream);
          media.ondataavailable = (e) => e.data.size && parts.current.chunks.push(e.data);
          media.start();
          parts.current.media = media;
        } else {
          const rec = createRecognizer({
            onUpdate: () => {},
            onError: (code) => { if (code === 'denied') { finished.current = true; cleanup(); onDenied(); } },
          });
          rec.start();
          parts.current.rec = rec;
        }
        let last = 0;
        const tick = (t: number) => {
          if (!alive || finished.current) return;
          const ms = performance.now() - parts.current.start;
          setElapsed(ms);
          if (ms >= config.voiceNote.maxMs) { finish(false); return; }
          if (t - last > 80) {
            last = t;
            const lv = mic.level();
            setLevels((prev) => [...prev.slice(1), lv]);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        finished.current = true;
        if (e instanceof MicDeniedError) onDenied();
        else onDone(null);
      }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); if (!finished.current) { finished.current = true; cleanup(); } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = Math.floor(elapsed / 1000);
  const time = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="recorder">
      <div className="rec-pill">
        <button className="icon24" onClick={() => finish(true)} aria-label="Discard recording">
          <img src="/assets/trash.svg" width={24} height={24} alt="" />
        </button>
        <div className="rec-mid">
          <span className="rec-time">{time}</span>
          <svg className="rec-wave" viewBox="0 0 200 24" aria-hidden>
            {levels.map((lv, i) => {
              const h = Math.max(4, Math.min(30, 4 + lv * 30));
              const x = 5 + i * 8;
              return <line key={i} x1={x} x2={x} y1={12 - h / 2} y2={12 + h / 2} stroke="#4999A5" strokeWidth={2} strokeLinecap="round" />;
            })}
          </svg>
        </div>
        <button className="rec-ok" onClick={() => finish(false)} aria-label="Send voice note">
          <img src="/assets/check.svg" width={18} height={20} alt="" />
        </button>
      </div>
    </div>
  );
}
