// Shared voice-mode state machine (PRD section 9). Both variants render from this.
import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '../../../shared/config';
import { store, useStore, type Variant } from './store';
import { addUserMessage, isFarewell, removeMessage, requestReply, type ReplyHandle } from './conversation';
import {
  createRecognizer, MicDeniedError, openMic, speak, splitWords, stopMessagePlayback, transcribeOnServer, unlockAudio,
  type Mic, type Recognizer, type Speech,
} from './speech';

export type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'reconnecting' | 'failed' | 'denied';

/** Voice error kinds shown by Variant C (copy lives in VoiceC; flagged for design review). */
export type VoiceError = 'mic' | 'silence' | 'network' | 'reply';
/** How long Reconnecting lasts (offline / recognition network error) before it becomes a Connection lost error. */
const RECONNECT_FAIL_MS = 8000;

export const MIC_DENIED = 'I can\'t hear you. Allow mic access, then tap here to try again.';

type Reply = {
  handle: ReplyHandle | null;
  text: string;
  streamDone: boolean;
  /** Char offset of text already handed to TTS. */
  queuedTo: number;
  speech: Speech | null;
  spokenAny: boolean;
  ttsFailed: boolean;
};

const freshReply = (): Reply => ({ handle: null, text: '', streamDone: false, queuedTo: 0, speech: null, spokenAny: false, ttsFailed: false });

export type Caption = { text: string; err: boolean; spin: boolean } | null;

export function useVoice(variant: Variant) {
  /** Why we're idle: first open (Ready) or the 8s no-speech timeout. */
  const [idleReason, setIdleReason] = useState<'initial' | 'timeout'>('initial');

  // Variant C, Chat Talk with an existing user message: auto-listen once the whoosh has finished.
  const [resuming] = useState(() => variant === 'C' && store.get().voiceEntry === 'talk-resume');
  useEffect(() => {
    const entry = store.get().voiceEntry;
    if (entry) store.set({ voiceEntry: null });
    if (!resuming) return;
    const wait = Math.max(0, (store.get().trans?.until ?? 0) - Date.now());
    const t = setTimeout(() => { if (phaseRef.current === 'idle') startListening(); }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const online = useStore((s) => s.online);
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState({ text: '', partial: false });
  const [replyText, setReplyText] = useState('');
  const [spokenWords, setSpokenWords] = useState(0);

  const phaseRef = useRef<Phase>('idle');
  const [voiceError, setVoiceError] = useState<VoiceError | null>(null);
  // Any phase change clears the error; failure paths set it right after entering their phase.
  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p); setVoiceError(null); };
  const fail = (p: Phase, kind: VoiceError) => { setPhase(p); setVoiceError(kind); };

  const mic = useRef<Mic | null>(null);
  const rec = useRef<Recognizer | null>(null);
  const media = useRef<{ recorder: MediaRecorder; chunks: Blob[] } | null>(null);
  const timers = useRef<{ silence?: number; noSpeech?: number; maxTurn?: number; retry?: number; resume?: number; inactivity?: number }>({});
  const raf = useRef(0);
  const barEls = useRef<(HTMLElement | null)[]>([]);
  /** Last time recognition reported activity; drives the waveform when no level meter is available (Android). */
  const lastActivity = useRef(0);
  const reply = useRef<Reply>(freshReply());
  const attempts = useRef(0);
  /** Why we're in Reconnecting: a failed reply (retry it) or being offline (resume listening). */
  const reconnectFor = useRef<'reply' | 'offline'>('reply');
  /** Mute during Thinking holds the reply; it plays on resume. */
  const heldReply = useRef(false);
  const turnId = useRef(0);
  // A farewell was spoken: after Wysa's closing line, return Home instead of listening again.
  const endingAfterReply = useRef(false);
  const leaveRef = useRef<(s: 'home' | 'chat' | 'voices', source?: 'type' | 'close') => void>(() => {});
  /** Variant A mute: the session keeps running, only Wysa's voice (TTS) is silenced. */
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const variantRef = useRef(variant);
  variantRef.current = variant;

  // ---------- teardown helpers ----------
  const clearTimer = (k: keyof typeof timers.current) => { window.clearTimeout(timers.current[k]); timers.current[k] = undefined; };

  /** Variant A: close the session after a stretch of no activity (user silent and Wysa not replying). */
  const bumpInactivity = () => {
    if (variantRef.current !== 'A') return;
    clearTimer('inactivity');
    timers.current.inactivity = window.setTimeout(() => leaveRef.current('chat'), config.voice.inactivityMs);
  };

  const stopListening = useCallback(() => {
    turnId.current++;
    (['silence', 'noSpeech', 'maxTurn'] as const).forEach(clearTimer);
    cancelAnimationFrame(raf.current);
    rec.current?.abort();
    rec.current = null;
    if (media.current && media.current.recorder.state !== 'inactive') media.current.recorder.stop();
    media.current = null;
    mic.current?.close();
    mic.current = null;
  }, []);

  const stopSpeech = useCallback(() => {
    reply.current.speech?.stop();
    reply.current.speech = null;
  }, []);

  const stopAll = useCallback(() => {
    stopListening();
    stopSpeech();
    clearTimer('retry');
    clearTimer('resume');
    clearTimer('inactivity');
    stopMessagePlayback();
  }, [stopListening, stopSpeech]);

  // ---------- listening ----------
  const startListening = useCallback(async () => {
    stopListening();
    bumpInactivity();
    if (!navigator.onLine) { reconnectFor.current = 'offline'; setPhase('reconnecting'); return; }
    const myTurn = turnId.current;
    setTranscript({ text: '', partial: false });

    const serverMode = store.get().status.stt === 'server';

    let heard = false;
    const end = () => endTurn(myTurn);
    const onSpeech = () => {
      heard = true;
      bumpInactivity();
      clearTimer('noSpeech');
      clearTimer('silence');
      timers.current.silence = window.setTimeout(end, config.voice.silenceMs);
    };
    const armTimers = () => {
      timers.current.noSpeech = window.setTimeout(() => {
        if (!heard && myTurn === turnId.current) { stopListening(); setIdleReason('timeout'); fail('idle', 'silence'); }
      }, config.voice.noSpeechTimeoutMs);
      timers.current.maxTurn = window.setTimeout(end, config.voice.maxTurnMs);
    };

    if (serverMode) {
      // Server STT: capture the stream for upload; the real mic level drives the bars.
      let m: Mic;
      try {
        m = await openMic();
      } catch (e) {
        if (myTurn !== turnId.current) return;
        fail(e instanceof MicDeniedError ? 'denied' : 'failed', 'mic');
        return;
      }
      if (myTurn !== turnId.current) { m.close(); return; }
      mic.current = m;
      setReplyText(''); setSpokenWords(0); setPhase('listening');
      armTimers();
      const recorder = new MediaRecorder(m.stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.start();
      media.current = { recorder, chunks };
    } else {
      // Browser STT: the recognizer owns the single microphone exclusively. We do
      // NOT open a second getUserMedia for a level meter — on Android that second
      // stream steals the mic from the recognizer, which then hears silence and
      // returns an empty transcript. The waveform is driven by recognition activity
      // instead (see the tick below). This branch stays synchronous so Android
      // Chrome starts recognition inside the tap gesture.
      setReplyText(''); setSpokenWords(0); setPhase('listening');
      armTimers();
      const r = createRecognizer({
        onUpdate: (t, partial) => {
          if (myTurn !== turnId.current) return;
          lastActivity.current = performance.now();
          setTranscript({ text: t, partial });
          if (t) onSpeech();
        },
        onError: (code) => {
          if (myTurn !== turnId.current) return;
          stopListening();
          if (code === 'network') { reconnectFor.current = 'offline'; setPhase('reconnecting'); }
          else fail(code === 'denied' ? 'denied' : 'failed', 'mic');
        },
      });
      try { r.start(); } catch { /* already running */ }
      rec.current = r;
    }

    // Bars: real mic level when the meter is available, otherwise a gentle
    // activity-driven amplitude so they always move while listening (Android).
    const tick = () => {
      if (myTurn !== turnId.current) return;
      const lv = mic.current ? mic.current.level() : 0;
      if (serverMode && lv > 0.12) onSpeech();
      let amp: number;
      if (lv > 0.04) {
        amp = Math.min(1, lv * 1.6);
      } else {
        const since = performance.now() - lastActivity.current;
        const act = since < 1200 ? 1 - since / 1200 : 0;
        // Server mode has a real mic, so silence stays collapsed; browser mode keeps
        // a low baseline plus a bump on recent speech so the user sees it listening.
        amp = serverMode ? 0 : 0.14 + act * 0.7;
      }
      barEls.current.forEach((el, i) => {
        if (!el) return;
        if (el.dataset.level === 'scale') {
          el.style.transform = `scale(${(1 + Math.min(1, amp) * 0.18).toFixed(3)})`;
          return;
        }
        const wobble = 0.75 + 0.25 * Math.sin(performance.now() / (140 + i * 37) + i);
        if (amp < 0.05) {
          el.style.transform = 'scaleY(0.04)';
          el.style.opacity = '0';
        } else {
          el.style.transform = `scaleY(${(0.12 + amp * 0.88 * wobble).toFixed(3)})`;
          el.style.opacity = '1';
        }
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening]);

  const endTurn = useCallback(async (myTurn: number) => {
    if (myTurn !== turnId.current || phaseRef.current !== 'listening') return;
    (['silence', 'noSpeech', 'maxTurn'] as const).forEach(clearTimer);
    let text = '';
    let sttFailed = false;
    try {
      if (media.current) {
        const { recorder, chunks } = media.current;
        const stopped = new Promise<void>((r) => recorder.addEventListener('stop', () => r(), { once: true }));
        recorder.stop();
        await stopped;
        setPhase('thinking');
        text = await transcribeOnServer(new Blob(chunks, { type: recorder.mimeType }));
      } else if (rec.current) {
        text = await rec.current.stop();
      }
    } catch { text = ''; sttFailed = !!media.current; }
    if (myTurn !== turnId.current) return;
    stopListening();
    if (sttFailed) { fail('failed', 'network'); return; }
    text = text.trim();
    if (!text) { startListening(); return; }
    setTranscript({ text, partial: false });
    addUserMessage(text);
    attempts.current = 0;
    if (isFarewell(text)) endingAfterReply.current = true;
    beginReply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, startListening]);

  // ---------- replying & speaking ----------
  const finishReply = useCallback(() => {
    reply.current = freshReply();
    heldReply.current = false;
    if (endingAfterReply.current) { endingAfterReply.current = false; leaveRef.current('home'); return; }
    startListening();
  }, [startListening]);

  const pump = useCallback(() => {
    const r = reply.current;
    const p = phaseRef.current;
    if (p !== 'thinking' && p !== 'speaking') return;
    if (r.speech) return;

    if (r.ttsFailed || mutedRef.current) {
      // Show the reply as text; continue once it's complete.
      if (phaseRef.current !== 'speaking') setPhase('speaking');
      const words = splitWords(r.text);
      setSpokenWords(words.length);
      if (r.streamDone) {
        clearTimer('resume');
        // When muted, hold the caption long enough to read the whole reply (scaled by
        // length) before returning to listening, keeping the live carryover visible.
        const delay = mutedRef.current ? Math.min(6500, 1600 + words.length * 180) : 1200;
        timers.current.resume = window.setTimeout(finishReply, delay);
      }
      return;
    }

    const rest = r.text.slice(r.queuedTo);
    let chunkEnd = -1;
    const re = /[.!?…]+["'”’)\]]*(\s+|$)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(rest))) {
      const endIdx = match.index + match[0].length;
      const atEnd = endIdx >= rest.length;
      if (atEnd && !r.streamDone) break; // sentence may still be growing
      chunkEnd = endIdx;
      // First chunk: wait for enough text for natural playback.
      if (r.spokenAny || r.queuedTo + chunkEnd >= config.voice.minCharsBeforeSpeaking) break;
    }
    if (chunkEnd < 0 && r.streamDone && rest.trim()) chunkEnd = rest.length;
    if (!r.spokenAny && chunkEnd >= 0 && r.queuedTo + chunkEnd < config.voice.minCharsBeforeSpeaking && !r.streamDone) chunkEnd = -1;

    if (chunkEnd < 0) {
      if (r.streamDone && !rest.trim()) finishReply();
      return;
    }

    const chunk = rest.slice(0, chunkEnd).trim();
    const wordOffset = splitWords(r.text.slice(0, r.queuedTo)).length;
    r.queuedTo += chunkEnd;
    r.spokenAny = true;
    if (phaseRef.current !== 'speaking') setPhase('speaking');
    setSpokenWords(wordOffset);

    r.speech = speak(chunk, store.get().voice, {
      onWord: (i) => { if (reply.current === r) { setSpokenWords(wordOffset + i + 1); bumpInactivity(); } },
      onEnd: () => {
        if (reply.current !== r) return;
        r.speech = null;
        pump();
      },
      onError: () => {
        if (reply.current !== r) return;
        r.speech = null;
        r.ttsFailed = true;
        stopSpeech();
        fail('failed', 'reply');
      },
    });
  }, [finishReply]);

  const beginReply = useCallback(() => {
    stopSpeech();
    bumpInactivity();
    const r = freshReply();
    reply.current = r;
    heldReply.current = false;
    setReplyText('');
    setSpokenWords(0);
    if (phaseRef.current !== 'paused') setPhase('thinking');
    r.handle = requestReply((full) => {
      if (reply.current !== r) return;
      r.text = full;
      setReplyText(full);
      pump();
    });
    r.handle.done
      .then((full) => {
        if (reply.current !== r) return;
        attempts.current = 0;
        r.text = full;
        r.streamDone = true;
        setReplyText(full);
        pump();
      })
      .catch(() => {
        if (reply.current !== r) return;
        if (r.handle) removeMessage(r.handle.messageId);
        reply.current = freshReply();
        const p = phaseRef.current;
        if (p === 'idle' || p === 'paused') { heldReply.current = p === 'paused'; return; }
        attempts.current++;
        if (!navigator.onLine) { reconnectFor.current = 'reply'; setPhase('reconnecting'); return; }
        if (attempts.current <= config.voice.maxRetries) {
          reconnectFor.current = 'reply';
          setPhase('reconnecting');
          clearTimer('retry');
          timers.current.retry = window.setTimeout(() => {
            if (phaseRef.current === 'reconnecting') beginReply();
          }, 1000 * attempts.current);
        } else {
          fail('failed', 'reply');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pump, stopSpeech]);

  // ---------- controls ----------
  const toggleMute = () => {
    const p = phaseRef.current;
    if (p === 'paused') {
      if (heldReply.current) {
        heldReply.current = false;
        const r = reply.current;
        if (r.handle) {
          // Reply still on its way or already in: play it, then back to Listening.
          setPhase(r.spokenAny ? 'speaking' : 'thinking');
          pump();
        } else {
          beginReply(); // the held turn failed while paused: retry it
        }
      } else {
        unlockAudio(); // the resume tap counts as the gesture browsers need for audio
        startListening();
      }
      return;
    }
    if (p === 'idle') {
      // Mute (A) / Pause (B) in Ready (Voice/Landing): cancels a mic that is still
      // opening and holds the screen in Paused.
      stopListening();
      setIdleReason('initial');
      setPhase('paused');
      return;
    }
    heldReply.current = p === 'thinking' || (p === 'reconnecting' && reconnectFor.current === 'reply');
    if (p === 'speaking') {
      // Speech stops; the full reply is already in the thread.
      stopSpeech();
      reply.current = freshReply();
    }
    stopListening();
    clearTimer('retry');
    clearTimer('resume');
    setPhase('paused');
  };

  /** Variant A Mute: silence Wysa's voice only; the session keeps running. */
  const toggleMuted = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) {
      const speaking = !!reply.current.speech;
      stopSpeech();
      if (speaking) pump();
    }
    bumpInactivity();
  };

  /** Retry from an error caption: reopen the mic, or re-send the last user utterance if it has no reply. */
  const retryError = () => {
    const kind = voiceError;
    if (!kind) return;
    unlockAudio();
    attempts.current = 0;
    reply.current = freshReply();
    const msgs = store.get().messages;
    if ((kind === 'network' || kind === 'reply') && msgs[msgs.length - 1]?.role === 'user') beginReply();
    else startListening(); // mic / silence / nothing to re-send: re-request the mic and listen
  };

  const onScreenTap = () => {
    const p = phaseRef.current;
    if (p === 'idle') {
      unlockAudio();
      setIdleReason('initial');
      bumpInactivity();
      startListening();
    } else if (p === 'failed') {
      attempts.current = 0;
      // Retry the same turn if the last user message has no reply yet; otherwise reopen the mic.
      const msgs = store.get().messages;
      if (msgs[msgs.length - 1]?.role === 'user') beginReply();
      else startListening();
    }
  };

  const leave = (screen: 'home' | 'chat' | 'voices', source?: 'type' | 'close') => {
    stopAll();
    mutedRef.current = false;
    setMuted(false);
    phaseRef.current = 'idle';
    reply.current = freshReply();
    store.go(screen, source); // Variant B animates this (transitions.ts)
  };
  leaveRef.current = leave;


  // Switching variant mid-turn pauses the conversation; it stays paused in the new variant.
  const firstVariant = useRef(variant);
  useEffect(() => {
    if (variant === firstVariant.current) return;
    firstVariant.current = variant;
    if (['listening', 'thinking', 'speaking', 'reconnecting'].includes(phaseRef.current)) toggleMute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  // ---------- lifecycle ----------
  useEffect(() => {
    if (import.meta.env.DEV && location.search.includes('state=')) return; // review mode
    const onVis = () => {
      if (!document.hidden) return;
      if (variantRef.current === 'A') { stopSpeech(); return; }
      if (['listening', 'thinking', 'speaking', 'reconnecting'].includes(phaseRef.current)) toggleMute();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = phaseRef.current;
    if (!online && ['listening', 'thinking', 'speaking'].includes(p)) {
      stopListening();
      reconnectFor.current = p === 'thinking' ? 'reply' : 'offline';
      if (p === 'speaking') { stopSpeech(); reply.current = freshReply(); }
      setPhase('reconnecting');
    } else if (online && p === 'reconnecting') {
      if (reconnectFor.current === 'offline') startListening();
      else if (!reply.current.handle) beginReply();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => () => stopAll(), [stopAll]);

  // Reconnecting caused by being offline / a recognition network error: if it doesn't recover, show Connection lost.
  useEffect(() => {
    if (phase !== 'reconnecting') return;
    const t = window.setTimeout(() => {
      if (phaseRef.current !== 'reconnecting' || (reconnectFor.current === 'reply' && navigator.onLine)) return;
      stopListening(); clearTimer('retry');
      fail('failed', 'network');
    }, RECONNECT_FAIL_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Dev-only: window.__voiceError('mic' | 'silence' | 'network' | 'reply') shows each error state.
  const devFail = (k: VoiceError) => {
    stopAll();
    if (k === 'silence') setIdleReason('timeout');
    fail(k === 'mic' ? 'denied' : k === 'silence' ? 'idle' : 'failed', k);
  };
  const devFailRef = useRef(devFail);
  devFailRef.current = devFail;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as any).__voiceError = (k: VoiceError) => devFailRef.current(k);
    return () => { delete (window as any).__voiceError; };
  }, []);



  // Dev-only design review: /?state=listening|thinking|speaking|paused|reconnecting|failed|denied|timeout
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const s = new URLSearchParams(location.search).get('state');
    if (!s) return;
    if (s === 'timeout') { setIdleReason('timeout'); setPhase('idle'); return; }
    setPhase(s as Phase);
    setTranscript({ text: 'Because that’s the goal', partial: true });
    setReplyText('It takes time. Guided meditations for acceptance in your toolkit will help. Once you accept it, you can move on and create a support system that will help you achieve your goals or keep going through the bad days.');
    setSpokenWords(18);
  }, []);

  const caption: Caption = (() => {
    switch (phase) {
      case 'idle':
        if (variant === 'A') return { text: 'Tap anywhere to start', err: false, spin: false };
        return idleReason === 'timeout' ? { text: 'Tap to start', err: false, spin: false } : null;
      case 'listening': return { text: 'Listening', err: false, spin: false };
      case 'thinking': return { text: 'Thinking', err: false, spin: false };
      case 'speaking': return { text: 'Wysa Speaking', err: false, spin: false };
      case 'paused': return { text: 'Paused', err: false, spin: false };
      case 'reconnecting': return { text: 'Reconnecting', err: true, spin: true };
      case 'failed': return { text: "Couldn't connect. Tap to retry", err: true, spin: false };
      case 'denied': return { text: MIC_DENIED, err: true, spin: false };
    }
  })();

  /** Live mic level 0..1 while listening (0 otherwise). Drives Variant B's bottom glow.
   *  Falls back to recognition activity when no level meter is available (Android). */
  const micLevel = () => {
    if (phaseRef.current !== 'listening') return 0;
    const lvl = mic.current ? mic.current.level() : 0;
    if (lvl > 0.04) return lvl;
    const since = performance.now() - lastActivity.current;
    return since < 1200 ? 0.4 * (1 - since / 1200) : 0;
  };

  return {
    phase, idleReason, resuming, caption, transcript, replyText, spokenWords, barEls, micLevel,
    voiceError, retryError, onScreenTap, toggleMute, muted, toggleMuted, leave,
  };
}

export type VoiceModel = ReturnType<typeof useVoice>;
