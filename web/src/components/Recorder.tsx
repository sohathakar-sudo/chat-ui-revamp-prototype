import { useEffect, useRef, useState } from 'react';
import { config } from '../../../shared/config';
import { store } from '../lib/store';
import { createRecognizer, MicDeniedError, openMic, transcribeOnServer, type Mic, type Recognizer } from '../lib/speech';

const BARS = 25;

type Props = {
  /** Called with the transcript; null = discarded (cancelled). '' = nothing heard. */
  onDone(text: string | null): void;
  onDenied(): void;
  /** Variant accent: teal (A) or orange (B, no Figma frame: restyled from A). */
  accent?: 'teal' | 'orange';
};

export function Recorder({ onDone, onDenied, accent = 'teal' }: Props) {
  const color = accent === 'orange' ? '#DE761E' : '#4999A5';
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  /** After the tick: transcribing (no Figma frame: spinner in place of the waveform, flagged for design review). */
  const [busy, setBusy] = useState(false);
  /** Buttons act on the live session only; a stale (StrictMode throwaway) mount can never touch it. */
  const api = useRef<{ finish(cancel: boolean): void } | null>(null);

  useEffect(() => {
    type Session = {
      alive: boolean; finished: boolean; cancelled: boolean;
      mic?: Mic; rec?: Recognizer; media?: MediaRecorder;
      chunks: Blob[]; start: number; live: string; raf: number; pulse: number;
    };
    const S: Session = { alive: true, finished: false, cancelled: false, chunks: [], start: performance.now(), live: '', raf: 0, pulse: 0 };
    const serverMode = store.get().status.stt === 'server';
    let startTimer = 0;

    const cleanup = () => {
      S.rec?.abort();
      if (S.media && S.media.state !== 'inactive') { try { S.media.stop(); } catch { /* noop */ } }
      S.mic?.close();
    };

    const finish = async (cancel: boolean) => {
      // The bin always works, even while transcribing: drop everything, back to the empty input.
      if (cancel) {
        if (S.cancelled) return;
        S.cancelled = true; S.finished = true; cancelAnimationFrame(S.raf);
        cleanup();
        onDone(null);
        return;
      }
      if (S.finished) return;
      S.finished = true;
      cancelAnimationFrame(S.raf);
      setBusy(true); // spinner right away
      const shownAt = performance.now();
      let text = '';
      try {
        if (serverMode && S.media) {
          if (S.media.state !== 'inactive') {
            const stopped = new Promise<void>((r) => S.media!.addEventListener('stop', () => r(), { once: true }));
            S.media.stop();
            await Promise.race([stopped, new Promise<void>((r) => setTimeout(r, 1500))]);
          }
          S.mic?.close();
          if (S.chunks.length) text = await transcribeOnServer(new Blob(S.chunks, { type: S.media.mimeType }));
        } else if (S.rec) {
          S.mic?.close();
          text = await S.rec.stop();
        }
      } catch {
        text = '';
      }
      if (!text.trim()) text = S.live;
      cleanup();
      const wait = 400 - (performance.now() - shownAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (!S.cancelled && S.alive) onDone(text.trim());
    };

    const loop = () => {
      const tick = (t: number) => {
        if (!S.alive || S.finished) return;
        const ms = performance.now() - S.start;
        setElapsed(ms);
        if (ms >= config.voiceNote.maxMs) { finish(false); return; }
        if (t - last > 80) {
          last = t;
          let lv: number;
          if (S.mic) lv = S.mic.level();
          else {
            // No level meter available: a gentle idle pulse, lifted by recognition activity.
            S.pulse = Math.max(0, S.pulse - 0.06);
            lv = 0.12 + 0.1 * (Math.sin(t / 180) + 1) / 2 + S.pulse;
          }
          setLevels((prev) => [...prev.slice(1), Math.min(1, lv)]);
        }
        S.raf = requestAnimationFrame(tick);
      };
      let last = 0;
      S.raf = requestAnimationFrame(tick);
    };

    api.current = { finish };

    // Defer one tick so StrictMode's throwaway mount never starts the mic or recognition.
    startTimer = window.setTimeout(async () => {
      S.start = performance.now();
      loop();
      try {
        S.mic = await openMic(); // mic first, so the level meter works
        if (!S.alive) { S.mic.close(); return; }
      } catch (e) {
        if (e instanceof MicDeniedError) { S.finished = true; onDenied(); return; }
        // otherwise carry on without a meter
      }
      if (serverMode) {
        if (!S.mic) { S.finished = true; onDone(null); return; }
        try {
          const media = new MediaRecorder(S.mic.stream);
          media.ondataavailable = (e) => e.data.size && S.chunks.push(e.data);
          media.start();
          S.media = media;
        } catch { S.finished = true; cleanup(); onDone(null); }
        return;
      }
      const rec = createRecognizer({
        onUpdate: (text) => { S.live = text; S.pulse = 0.5; },
        onError: (code) => {
          if (code === 'denied') { S.finished = true; cleanup(); onDenied(); }
          // other errors keep recording; finish() handles an empty result
        },
      });
      S.rec = rec;
      try { rec.start(); } catch { S.finished = true; cleanup(); onDone(null); }
    }, 0);

    return () => {
      S.alive = false;
      clearTimeout(startTimer);
      cancelAnimationFrame(S.raf);
      if (api.current?.finish === finish) api.current = null;
      if (!S.finished) { S.finished = true; cleanup(); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = Math.floor(elapsed / 1000);
  const time = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="recorder">
      <div className="rec-pill">
        <button className="icon24" onClick={() => api.current?.finish(true)} aria-label="Discard recording">
          <img src="/assets/trash.svg" width={24} height={24} alt="" />
        </button>
        <div className="rec-mid">
          <span className="rec-time">{time}</span>
          {busy ? (
            <span className="rec-busy" role="status" aria-label="Transcribing">
              <img className="spin" src="/assets/spinner.svg" width={24} height={24} alt="" />
            </span>
          ) : (
            <svg className="rec-wave" viewBox="0 0 200 24" aria-hidden>
              {levels.map((lv, i) => {
                const h = Math.max(4, Math.min(30, 4 + lv * 30));
                const x = 5 + i * 8;
                return <line key={i} x1={x} x2={x} y1={12 - h / 2} y2={12 + h / 2} stroke={color} strokeWidth={2} strokeLinecap="round" />;
              })}
            </svg>
          )}
        </div>
        <button className="rec-ok" style={{ background: color }} onClick={() => api.current?.finish(false)} disabled={busy} aria-label="Stop and transcribe">
          <img src="/assets/check.svg" width={18} height={20} alt="" />
        </button>
      </div>
    </div>
  );
}
