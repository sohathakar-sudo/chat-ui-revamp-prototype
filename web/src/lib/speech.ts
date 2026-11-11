// Speech layer: mic level, speech-to-text and text-to-speech behind small interfaces.
// Browser engines are the fallback; server providers are used when /api/status says so.
import { config, type VoiceName } from '../../../shared/config';
import { store } from './store';

// ---------- support ----------
// Read the ctor lazily: it may not be on `window` at module load, and tests can stub it.
function getSRCtor(): any {
  return typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;
}

export function voiceSupported() {
  if (typeof window === 'undefined') return false;
  const { stt, tts } = store.get().status;
  const mic = !!navigator.mediaDevices?.getUserMedia;
  const sttOk = stt === 'server' ? typeof MediaRecorder !== 'undefined' : !!getSRCtor();
  const ttsOk = tts === 'server' ? true : 'speechSynthesis' in window;
  return mic && sttOk && ttsOk;
}

// ---------- mic ----------
export type Mic = { level(): number; stream: MediaStream; close(): void };

export class MicDeniedError extends Error {}

export async function openMic(): Promise<Mic> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicDeniedError('denied');
    throw e;
  }
  const ctx = new AudioContext();
  // A context created outside a gesture can start suspended; resume it so levels flow.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  return {
    stream,
    level() {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      // RMS → 0..1 with a gentle curve so speech fills the range.
      return Math.min(1, Math.sqrt(sum / data.length) * 4);
    },
    close() {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    },
  };
}

// ---------- speech-to-text (browser) ----------
export type Recognizer = {
  start(): void;
  /** Stop listening and resolve with the final transcript. */
  stop(): Promise<string>;
  abort(): void;
};

export function createRecognizer(opts: {
  onUpdate(text: string, partial: boolean): void;
  onError(code: string): void;
}): Recognizer {
  const rec = new (getSRCtor())();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = 'en-US';
  let finals: string[] = [];
  let interim = '';
  let active = false;
  let stopResolve: ((t: string) => void) | null = null;
  const text = () => (finals.join(' ') + ' ' + interim).replace(/\s+/g, ' ').trim();
  // Chrome restarts a session after pauses; keep text from earlier sessions.
  let carried: string[] = [];

  rec.onresult = (e: any) => {
    const f: string[] = [];
    interim = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) f.push(r[0].transcript.trim());
      else interim += r[0].transcript;
    }
    finals = [...carried, ...f];
    opts.onUpdate(text(), !!interim.trim());
  };
  rec.onerror = (e: any) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    opts.onError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error);
  };
  rec.onend = () => {
    if (stopResolve) {
      const r = stopResolve;
      stopResolve = null;
      active = false;
      r(text());
      return;
    }
    if (active) {
      carried = [...finals];
      if (interim.trim()) carried.push(interim.trim());
      interim = '';
      try { rec.start(); } catch { /* already started */ }
    }
  };

  return {
    start() {
      finals = []; carried = []; interim = '';
      active = true;
      rec.start();
    },
    stop() {
      return new Promise<string>((resolve) => {
        if (!active) return resolve(text());
        stopResolve = resolve;
        setTimeout(() => { if (stopResolve) { stopResolve = null; active = false; resolve(text()); } }, 1500);
        try { rec.stop(); } catch { resolve(text()); }
      });
    },
    abort() {
      active = false;
      stopResolve = null;
      try { rec.abort(); } catch { /* noop */ }
    },
  };
}

// ---------- speech-to-text (server) ----------
export async function transcribeOnServer(blob: Blob): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.requestTimeoutMs);
  try {
    const res = await fetch('/api/transcribe', { method: 'POST', body: blob, headers: { 'content-type': blob.type }, signal: ctrl.signal });
    if (!res.ok) throw new Error('transcribe failed');
    return ((await res.json()).text || '').trim();
  } finally { clearTimeout(t); }
}

// ---------- text-to-speech ----------
export type Speech = { stop(): void };
type SpeakOpts = {
  /** Index of the word now being spoken (words split on whitespace). */
  onWord?(index: number): void;
  onEnd?(): void;
  onError?(): void;
};

export const splitWords = (text: string) => text.split(/\s+/).filter(Boolean);

let systemVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const load = () => (systemVoices = speechSynthesis.getVoices());
  load();
  speechSynthesis.addEventListener?.('voiceschanged', load);
}

function pickSystemVoice(name: VoiceName): SpeechSynthesisVoice | undefined {
  const { lang, names } = config.voices[name].browserHints;
  const inLang = systemVoices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase()));
  const english = systemVoices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  for (const hint of names) {
    const h = hint.toLowerCase();
    const hit = inLang.find((v) => v.name.toLowerCase().includes(h)) || english.find((v) => v.name.toLowerCase().includes(h));
    if (hit) return hit;
  }
  return inLang[0] || english[0];
}

/** Call inside a user gesture (tap) so later speech is allowed to play. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }
  try {
    const ctx = new AudioContext();
    ctx.resume().finally(() => ctx.close());
  } catch { /* noop */ }
}

// Short UI blip that marks voice mode opening and closing.
let indicator: HTMLAudioElement | null = null;
let lastBlip = 0;
export function playVoiceIndicator() {
  if (typeof window === 'undefined') return;
  const now = performance.now();
  if (now - lastBlip < 250) return; // dedupe StrictMode double-mounts and rapid open/close
  lastBlip = now;
  try {
    if (!indicator) { indicator = new Audio('/assets/voice-indicator.mp3'); indicator.volume = 0.5; }
    indicator.currentTime = 0;
    indicator.play().catch(() => {});
  } catch { /* audio unavailable */ }
}

/** Spread word start times across a duration in proportion to word length. */
function estimateWordStarts(words: string[], durationMs: number) {
  const weights = words.map((w) => w.length + 1);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return weights.map((w) => {
    const start = (acc / total) * durationMs;
    acc += w;
    return start;
  });
}

export function speak(text: string, voice: VoiceName, opts: SpeakOpts = {}): Speech {
  return store.get().status.tts === 'server' ? speakServer(text, voice, opts) : speakBrowser(text, voice, opts);
}

function speakBrowser(text: string, voice: VoiceName, opts: SpeakOpts): Speech {
  const words = splitWords(text);
  const wordAtChar: number[] = [];
  {
    let w = -1;
    let inWord = false;
    for (let i = 0; i < text.length; i++) {
      const space = /\s/.test(text[i]);
      if (!space && !inWord) w++;
      inWord = !space;
      wordAtChar[i] = Math.max(0, w);
    }
  }
  const v = config.voices[voice];
  const u = new SpeechSynthesisUtterance(text);
  const sys = pickSystemVoice(voice);
  if (sys) u.voice = sys;
  u.lang = sys?.lang || v.browserHints.lang;
  u.pitch = v.pitch;
  u.rate = v.rate;

  let stopped = false;
  let gotBoundary = false;
  let estTimers: ReturnType<typeof setTimeout>[] = [];
  const clearEst = () => { estTimers.forEach(clearTimeout); estTimers = []; };
  const startTimeout = setTimeout(() => { if (!stopped) { stopped = true; speechSynthesis.cancel(); opts.onError?.(); } }, config.requestTimeoutMs);

  u.onstart = () => {
    clearTimeout(startTimeout);
    opts.onWord?.(0);
    // Estimate timings; replaced by real boundary events when the engine provides them.
    const estMs = (text.length / (14.5 * u.rate)) * 1000;
    estimateWordStarts(words, estMs).forEach((ms, i) => {
      estTimers.push(setTimeout(() => { if (!gotBoundary && !stopped) opts.onWord?.(i); }, ms));
    });
  };
  u.onboundary = (e) => {
    if (e.name && e.name !== 'word') return;
    if (!gotBoundary) { gotBoundary = true; clearEst(); }
    opts.onWord?.(wordAtChar[e.charIndex] ?? 0);
  };
  u.onend = () => {
    clearTimeout(startTimeout); clearEst();
    if (stopped) return;
    stopped = true;
    opts.onWord?.(words.length - 1);
    opts.onEnd?.();
  };
  u.onerror = (e) => {
    clearTimeout(startTimeout); clearEst();
    if (stopped || e.error === 'interrupted' || e.error === 'canceled') return;
    stopped = true;
    opts.onError?.();
  };

  speechSynthesis.cancel();
  // Safari drops an utterance queued in the same tick as cancel().
  setTimeout(() => { if (!stopped) speechSynthesis.speak(u); }, 0);

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearTimeout(startTimeout); clearEst();
      speechSynthesis.cancel();
    },
  };
}

function speakServer(text: string, voice: VoiceName, opts: SpeakOpts): Speech {
  const words = splitWords(text);
  const ctrl = new AbortController();
  let audio: HTMLAudioElement | null = null;
  let raf = 0;
  let stopped = false;
  const fail = () => { if (!stopped) { stopped = true; opts.onError?.(); } };
  const t = setTimeout(() => ctrl.abort(), config.requestTimeoutMs);

  (async () => {
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, voice }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error('speak failed');
      const timingsHeader = res.headers.get('x-word-timings');
      const timings: { startMs: number }[] | null = timingsHeader ? JSON.parse(decodeURIComponent(timingsHeader)) : null;
      const blob = await res.blob();
      if (stopped) return;
      audio = new Audio(URL.createObjectURL(blob));
      await new Promise<void>((resolve, reject) => {
        audio!.onloadedmetadata = () => resolve();
        audio!.onerror = () => reject(new Error('audio'));
      });
      const starts = timings?.length === words.length
        ? timings.map((x) => x.startMs)
        : estimateWordStarts(words, (audio.duration || text.length / 14.5) * 1000);
      const tick = () => {
        if (!audio || stopped) return;
        const now = audio.currentTime * 1000;
        let i = 0;
        while (i + 1 < starts.length && starts[i + 1] <= now) i++;
        opts.onWord?.(i);
        raf = requestAnimationFrame(tick);
      };
      audio.onended = () => {
        cancelAnimationFrame(raf);
        if (stopped) return;
        stopped = true;
        opts.onWord?.(words.length - 1);
        opts.onEnd?.();
      };
      await audio.play();
      tick();
    } catch {
      clearTimeout(t);
      fail();
    }
  })();

  return {
    stop() {
      stopped = true;
      ctrl.abort();
      cancelAnimationFrame(raf);
      audio?.pause();
    },
  };
}

// ---------- message playback (speaker icon) ----------
let playback: Speech | null = null;

export function toggleMessagePlayback(messageId: string, text: string) {
  const current = store.get().playingId;
  playback?.stop();
  playback = null;
  if (current === messageId) {
    store.set({ playingId: null });
    return;
  }
  store.set({ playingId: messageId });
  const done = () => { if (store.get().playingId === messageId) store.set({ playingId: null }); };
  playback = speak(text, store.get().voice, { onEnd: done, onError: done });
}

export function stopMessagePlayback() {
  playback?.stop();
  playback = null;
  if (store.get().playingId) store.set({ playingId: null });
}
