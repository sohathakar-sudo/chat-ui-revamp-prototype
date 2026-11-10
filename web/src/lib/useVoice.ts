// Shared voice-mode state machine (PRD section 9). Both variants render from this.
import { useCallback, useEffect, useRef, useState } from 'react';
import { config } from '../../../shared/config';
import { store, useStore, type Variant } from './store';
import { addUserMessage, removeMessage, requestReply, type ReplyHandle } from './conversation';
import {
  createRecognizer, MicDeniedError, openMic, speak, splitWords, stopMessagePlayback, transcribeOnServer, unlockAudio,
  type Mic, type Recognizer, type Speech,
} from './speech';

export type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'reconnecting' | 'failed' | 'denied';

export const MIC_DENIED = 'Wysa needs mic access to talk. Enable it in your browser settings.';

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

  const online = useStore((s) => s.online);
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState({ text: '', partial: false });
  const [replyText, setReplyText] = useState('');
  const [spokenWords, setSpokenWords] = useState(0);

  const phaseRef = useRef<Phase>('idle');
  const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p); };

  const mic = useRef<Mic | null>(null);
  const rec = useRef<Recognizer | null>(null);
  const media = useRef<{ recorder: MediaRecorder; chunks: Blob[] } | null>(null);
  const timers = useRef<{ silence?: number; noSpeech?: number; maxTurn?: number; retry?: number; resume?: number }>({});
  const raf = useRef(0);
  const barEls = useRef<(HTMLElement | null)[]>([]);
  const reply = useRef<Reply>(freshReply());
  const attempts = useRef(0);
  /** Why we're in Reconnecting: a failed reply (retry it) or being offline (resume listening). */
  const reconnectFor = useRef<'reply' | 'offline'>('reply');
  /** Mute during Thinking holds the reply; it plays on resume. */
  const heldReply = useRef(false);
  const turnId = useRef(0);

  // ---------- teardown helpers ----------
  const clearTimer = (k: keyof typeof timers.current) => { window.clearTimeout(timers.current[k]); timers.current[k] = undefined; };

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
    stopMessagePlayback();
  }, [stopListening, stopSpeech]);

  // ---------- listening ----------
  const startListening = useCallback(async () => {
    stopListening();
    if (!navigator.onLine) { reconnectFor.current = 'offline'; setPhase('reconnecting'); return; }
    const myTurn = turnId.current;
    setTranscript({ text: '', partial: false });

    let m: Mic;
    try {
      m = await openMic();
    } catch (e) {
      if (myTurn !== turnId.current) return;
      setPhase(e instanceof MicDeniedError ? 'denied' : 'failed');
      return;
    }
    if (myTurn !== turnId.current) { m.close(); return; }
    mic.current = m;
    setReplyText('');
    setSpokenWords(0);
    setPhase('listening');

    let heard = false;
    let text = '';
    const end = () => endTurn(myTurn);
    const onSpeech = () => {
      heard = true;
      clearTimer('noSpeech');
      clearTimer('silence');
      timers.current.silence = window.setTimeout(end, config.voice.silenceMs);
    };

    timers.current.noSpeech = window.setTimeout(() => {
      if (!heard && myTurn === turnId.current) { stopListening(); setIdleReason('timeout'); setPhase('idle'); }
    }, config.voice.noSpeechTimeoutMs);
    timers.current.maxTurn = window.setTimeout(end, config.voice.maxTurnMs);

    if (store.get().status.stt === 'server') {
      const recorder = new MediaRecorder(m.stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.start();
      media.current = { recorder, chunks };
    } else {
      const r = createRecognizer({
        onUpdate: (t, partial) => {
          if (myTurn !== turnId.current) return;
          text = t;
          setTranscript({ text: t, partial });
          if (t) onSpeech();
        },
        onError: (code) => {
          if (myTurn !== turnId.current) return;
          stopListening();
          setPhase(code === 'denied' ? 'denied' : code === 'network' ? 'reconnecting' : 'failed');
          if (code === 'network') reconnectFor.current = 'offline';
        },
      });
      try { r.start(); } catch { /* already running */ }
      rec.current = r;
    }

    // Bars follow the mic level; server STT also uses it to detect speech and silence.
    const tick = () => {
      if (myTurn !== turnId.current) return;
      const lv = m.level();
      if (store.get().status.stt === 'server' && lv > 0.12) onSpeech();
      barEls.current.forEach((el, i) => {
        if (!el) return;
        if (el.dataset.level === 'scale') {
          el.style.transform = `scale(${(1 + Math.min(1, lv * 1.6) * 0.18).toFixed(3)})`;
          return;
        }
        // Listening bars are sensitive to sound: empty (collapsed) in silence, rising as the user speaks.
        const amp = Math.min(1, lv * 1.6);
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
    void text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening]);

  const endTurn = useCallback(async (myTurn: number) => {
    if (myTurn !== turnId.current || phaseRef.current !== 'listening') return;
    (['silence', 'noSpeech', 'maxTurn'] as const).forEach(clearTimer);
    let text = '';
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
    } catch { text = ''; }
    if (myTurn !== turnId.current) return;
    stopListening();
    text = text.trim();
    if (!text) { startListening(); return; }
    setTranscript({ text, partial: false });
    addUserMessage(text);
    attempts.current = 0;
    beginReply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, startListening]);

  // ---------- replying & speaking ----------
  const finishReply = useCallback(() => {
    reply.current = freshReply();
    heldReply.current = false;
    startListening();
  }, [startListening]);

  const pump = useCallback(() => {
    const r = reply.current;
    const p = phaseRef.current;
    if (p !== 'thinking' && p !== 'speaking') return;
    if (r.speech) return;

    if (r.ttsFailed) {
      // Show the reply as text; continue once it's complete.
      setSpokenWords(splitWords(r.text).length);
      if (r.streamDone) { clearTimer('resume'); timers.current.resume = window.setTimeout(finishReply, 1200); }
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
      onWord: (i) => { if (reply.current === r) setSpokenWords(wordOffset + i + 1); },
      onEnd: () => {
        if (reply.current !== r) return;
        r.speech = null;
        pump();
      },
      onError: () => {
        if (reply.current !== r) return;
        r.speech = null;
        r.ttsFailed = true;
        pump();
      },
    });
  }, [finishReply]);

  const beginReply = useCallback(() => {
    stopSpeech();
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
          setPhase('failed');
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

  const onScreenTap = () => {
    const p = phaseRef.current;
    if (p === 'idle') {
      unlockAudio();
      setIdleReason('initial');
      startListening();
    } else if (p === 'failed') {
      attempts.current = 0;
      // Retry the same turn if the last user message has no reply yet; otherwise reopen the mic.
      const msgs = store.get().messages;
      if (msgs[msgs.length - 1]?.role === 'user') beginReply();
      else startListening();
    }
  };

  const leave = (screen: 'home' | 'chat' | 'voices') => {
    stopAll();
    phaseRef.current = 'idle';
    reply.current = freshReply();
    store.go(screen); // Variant B animates this (transitions.ts)
  };


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
      if (document.hidden && ['listening', 'thinking', 'speaking', 'reconnecting'].includes(phaseRef.current)) toggleMute();
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
      case 'thinking': return { text: 'Thinking…', err: false, spin: false };
      case 'speaking': return { text: 'Wysa Speaking', err: false, spin: false };
      case 'paused': return { text: 'Paused', err: false, spin: false };
      case 'reconnecting': return { text: 'Reconnecting', err: true, spin: true };
      case 'failed': return { text: "Couldn't connect. Tap to retry", err: true, spin: false };
      case 'denied': return { text: MIC_DENIED, err: true, spin: false };
    }
  })();

  /** Live mic level 0..1 while listening (0 otherwise). Drives Variant B's bottom glow. */
  const micLevel = () => (mic.current && phaseRef.current === 'listening' ? mic.current.level() : 0);

  return {
    phase, idleReason, caption, transcript, replyText, spokenWords, barEls, micLevel,
    onScreenTap, toggleMute, leave,
  };
}

export type VoiceModel = ReturnType<typeof useVoice>;
