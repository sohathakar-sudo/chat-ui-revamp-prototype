// Shared chat-thread behavior (PRD sections 6–8). Both variants render from this.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { config } from '../../../shared/config';
import { store, useStore } from './store';
import { addUserMessage, isReplying, requestReply, retryReply } from './conversation';
import { stopMessagePlayback, toggleMessagePlayback, unlockAudio, voiceSupported } from './speech';
import { MIC_DENIED } from './useVoice';

export type VoiceTip = 'speak' | 'mic' | null;

export function useChat() {
  const messages = useStore((s) => s.messages);
  const online = useStore((s) => s.online);
  const playingId = useStore((s) => s.playingId);
  const replying = messages.some((m) => m.role === 'assistant' && (m.status === 'pending' || m.status === 'streaming'));

  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [headerTip, setHeaderTip] = useState(false);
  const [voiceTip, setVoiceTip] = useState<VoiceTip>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasText = text.trim().length > 0;

  // The composer grows with typed text, up to its CSS max-height, then scrolls.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text, recording, hasText]);

  // Keep the newest message in view.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => stopMessagePlayback(), []);
  useEffect(() => { if (!online) setRecording(false); }, [online]);

  // Tooltips: auto-dismiss after 3s or on any tap.
  const anyTip = headerTip || !!voiceTip;
  useEffect(() => {
    if (!anyTip) return;
    const close = () => { setHeaderTip(false); setVoiceTip(null); };
    const t = setTimeout(close, config.tooltipMs);
    const timer = setTimeout(() => window.addEventListener('pointerdown', close, { once: true, capture: true }), 0);
    return () => { clearTimeout(t); clearTimeout(timer); window.removeEventListener('pointerdown', close, { capture: true }); };
  }, [anyTip]);

  const send = (value: string) => {
    const v = value.trim();
    if (!v || isReplying() || !store.get().online) return;
    setNotice(null);
    addUserMessage(v);
    requestReply();
  };

  return {
    messages, online, playingId, replying, hasText, threadRef, inputRef,
    text, recording, notice, headerTip, voiceTip,
    onText(value: string) { setText(value); if (notice) setNotice(null); },
    onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (hasText && !replying && online) { send(text); setText(''); }
      }
    },
    submit() {
      if (!hasText || replying || !online) return;
      send(text);
      setText('');
    },
    /** Voice-note recorder (A: mic button, B: Speak pill). */
    openRecorder(tip: VoiceTip) {
      if (!online) return;
      if (!voiceSupported()) { setVoiceTip(tip); return; }
      stopMessagePlayback();
      setNotice(null);
      setRecording(true);
    },
    /** Full voice mode from chat (Variant A Speak pill). */
    openVoiceMode() {
      if (!online) return;
      if (!voiceSupported()) { setVoiceTip('speak'); return; }
      stopMessagePlayback();
      unlockAudio();
      store.enterVoice();
    },
    recorderDenied() { setRecording(false); setNotice(MIC_DENIED); },
    recorderDone(t: string | null) {
      setRecording(false);
      if (t === null) return;
      if (!t) { setNotice("Couldn't catch that, try again."); return; }
      send(t);
    },
    toggleHeaderTip() { setHeaderTip((v) => !v); },
    back() {
      stopMessagePlayback();
      // Variant A plays the loader-to-home transition; Variant B swooshes (transitions.ts).
      if (store.get().variant === 'B') store.go('home');
      else store.set({ screen: 'home', homeTransition: true });
    },
    retry(id: string) { if (!isReplying() && store.get().online) retryReply(id); },
    togglePlayback: toggleMessagePlayback,
  };
}

export type ChatModel = ReturnType<typeof useChat>;
