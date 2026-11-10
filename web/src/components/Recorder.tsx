import { useEffect, useRef, useState } from 'react';
import { config } from '../../../shared/config';
import { store } from '../lib/store';
import { createRecognizer, MicDeniedError, openMic, transcribeOnServer, type Mic, type Recognizer } from '../lib/speech';

const BARS = 25;

type Props = {
  /** Called with the transcript; null = discarded silently (too short / cancelled). '' = nothing heard. */
  onDone(text: string | null): void;
  onDenied(): void;
  /** Variant accent: teal (A) or orange (B, no Figma frame: restyled from A). */
  accent?: 'teal' | 'orange';
};

export function Recorder({ onDone, onDenied, accent = 'teal' }: Props) {
  const color = accent === 'orange' ? '#DE761E' : '#4999A5';
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  /** Live transcript while dictating (browser STT), shown so it's clear speech is being heard. */
  const [live, setLive] = useState('');
  /** After the tick: transcribing (no Figma frame: spinner in place of the waveform, flagged for design review). */
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);
  const finished = useRef(false);
  const liveRef = useRef('');
  const parts = useRef<{ mic?: Mic; rec?: Recognizer; media?: MediaRecorder; chunks: Blob[]; start: number }>({ chunks: [], start: 0 });

  const cleanup = () => {
    const p = parts.current;
    p.rec?.abort();
    if (p.media && p.media.state !== 'inactive') p.media.stop();
    p.mic?.close();
  };

  const finish = async (cancel: boolean) => {
    // The bin still works while transcribing: it drops the result and returns to the empty input.
    if (cancel && finished.current && !cancelled.current) { cancelled.current = true; onDone(null); return; }
    if (finished.current) return;
    finished.current = true;
    const p = parts.current;
    const duration = performance.now() - p.start;
    if (cancel || duration < config.voiceNote.minMs) { cleanup(); onDone(null); return; }
    let text = '';
    setBusy(true);
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
    // Fall back to whatever was heard live if the final result came back empty.
    if (!text.trim()) text = liveRef.current;
    cleanup();
    if (!cancelled.current) onDone(text.trim());
  };

  useEffect(() => {
    let raf = 0;
    let alive = true;
    // Reset per-mount: React StrictMode (dev) mounts → cleans up → mounts again on
    // the same refs, and the cleanup sets finished=true; without this the second
    // mount starts "finished" and the tick/bin do nothing.
    finished.current = false;
    cancelled.current = false;
    const serverMode = store.get().status.stt === 'server';

    const runLevels = (mic: Mic) => {
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
    };

    const runTimer = () => {
      const tick = () => {
        if (!alive || finished.current) return;
        const ms = performance.now() - parts.current.start;
        setElapsed(ms);
        if (ms >= config.voiceNote.maxMs) { finish(false); return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      parts.current.start = performance.now();

      if (serverMode) {
        // Server STT: capture audio with MediaRecorder and show the mic level.
        try {
          const mic = await openMic();
          if (!alive) { mic.close(); return; }
          parts.current.mic = mic;
          const media = new MediaRecorder(mic.stream);
          media.ondataavailable = (e) => e.data.size && parts.current.chunks.push(e.data);
          media.start();
          parts.current.media = media;
          runLevels(mic);
        } catch (e) {
          finished.current = true;
          if (e instanceof MicDeniedError) onDenied();
          else onDone(null);
        }
        return;
      }

      // Browser STT: start recognition FIRST so it claims the mic cleanly; the
      // level meter is a best-effort second mic (some browsers refuse a 2nd one).
      const rec = createRecognizer({
        onUpdate: (text) => { liveRef.current = text; setLive(text); },
        onError: (code) => {
          if (code === 'denied') { finished.current = true; cleanup(); onDenied(); }
          // Other errors (no-speech, network, audio-capture): keep going; the
          // live text or an empty result is handled on finish().
        },
      });
      try {
        rec.start();
      } catch {
        finished.current = true;
        onDone(null);
        return;
      }
      parts.current.rec = rec;

      try {
        const mic = await openMic();
        if (!alive) { mic.close(); return; }
        parts.current.mic = mic;
        runLevels(mic);
      } catch {
        // No level meter (mic busy with recognition); recognition still runs.
        runTimer();
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
          {busy ? (
            <span className="rec-busy" role="status" aria-label="Transcribing">
              <img className="spin" src="/assets/spinner.svg" width={24} height={24} alt="" />
            </span>
          ) : live ? (
            <span className="rec-live" aria-live="polite">{live}</span>
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
        <button className="rec-ok" style={{ background: color }} onClick={() => finish(false)} disabled={busy} aria-label="Stop and transcribe">
          <img src="/assets/check.svg" width={18} height={20} alt="" />
        </button>
      </div>
    </div>
  );
}
