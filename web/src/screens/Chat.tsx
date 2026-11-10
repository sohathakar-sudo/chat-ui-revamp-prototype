import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { config } from '../../../shared/config';
import { store, useStore, type Message } from '../lib/store';
import { addUserMessage, isReplying, requestReply, retryReply } from '../lib/conversation';
import { stopMessagePlayback, toggleMessagePlayback, voiceSupported } from '../lib/speech';
import { StatusBar } from '../components/StatusBar';
import { BackIcon, SendIcon } from '../components/Icons';
import { Recorder } from '../components/Recorder';

const MIC_DENIED = 'Wysa needs mic access to talk. Enable it in your browser settings.';

export function Chat() {
  const messages = useStore((s) => s.messages);
  const online = useStore((s) => s.online);
  const playingId = useStore((s) => s.playingId);
  const replying = messages.some((m) => m.role === 'assistant' && (m.status === 'pending' || m.status === 'streaming'));

  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [progressTip, setProgressTip] = useState(false);
  const [voiceTip, setVoiceTip] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => stopMessagePlayback(), []);
  useEffect(() => { if (!online) setRecording(false); }, [online]);

  // Tooltips: auto-dismiss after 3s or on any tap.
  const anyTip = progressTip || voiceTip;
  useEffect(() => {
    if (!anyTip) return;
    const close = () => { setProgressTip(false); setVoiceTip(false); };
    const t = setTimeout(close, config.tooltipMs);
    const timer = setTimeout(() => window.addEventListener('pointerdown', close, { once: true, capture: true }), 0);
    return () => { clearTimeout(t); clearTimeout(timer); window.removeEventListener('pointerdown', close, { capture: true }); };
  }, [anyTip]);

  const hasText = text.trim().length > 0;

  const send = (value: string) => {
    const v = value.trim();
    if (!v || isReplying() || !store.get().online) return;
    setNotice(null);
    addUserMessage(v);
    requestReply();
  };

  const onSubmit = () => {
    if (!hasText || replying || !online) return;
    send(text);
    setText('');
  };

  const openRecorder = () => {
    if (!online) return;
    if (!voiceSupported()) { setVoiceTip(true); return; }
    stopMessagePlayback();
    setNotice(null);
    setRecording(true);
  };

  const back = () => {
    stopMessagePlayback();
    store.set({ screen: 'home', homeTransition: true });
  };

  return (
    <div className="scr chat">
      <img className="chat-glow" src="/assets/chat-glow.svg" alt="" />
      <StatusBar />
      <div className="chat-head">
        <button onClick={back} aria-label="Back"><BackIcon /></button>
        <div className="progress-wrap">
          <button className="icon24" onClick={() => setProgressTip((v) => !v)} aria-label="Progress">
            <img src="/assets/progress-icon.svg" width={24} height={24} alt="" />
          </button>
          {progressTip && <div className="tooltip" role="status">The updated progress tab will be accessible from here.</div>}
        </div>
      </div>
      {!online && <div className="offline" role="status">You're offline</div>}

      <div className="thread" ref={threadRef}>
        {messages.map((m) => (
          <MessageRow key={m.id} m={m} playing={playingId === m.id} />
        ))}
      </div>

      {notice && <p className="notice" role="alert">{notice}</p>}

      {recording ? (
        <Recorder
          onDenied={() => { setRecording(false); setNotice(MIC_DENIED); }}
          onDone={(t) => {
            setRecording(false);
            if (t === null) return;
            if (!t) { setNotice("Couldn't catch that, try again."); return; }
            send(t);
          }}
        />
      ) : (
        <div className="composer">
          <label className="field">
            <input
              value={text}
              placeholder="Send a message"
              onChange={(e) => { setText(e.target.value); if (notice) setNotice(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); } }}
              enterKeyHint="send"
              aria-label="Send a message"
            />
          </label>
          {hasText ? (
            <button className="act" onClick={onSubmit} disabled={replying || !online} aria-label="Send">
              <span className="send-icon"><SendIcon /></span>Send
            </button>
          ) : (
            <button className="act" onClick={openRecorder} disabled={!online} aria-label="Record a voice note">
              <img src="/assets/waveform.svg" width={31} height={34} alt="" />Speak
              {voiceTip && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MessageRow({ m, playing }: { m: Message; playing: boolean }) {
  if (m.role === 'user') {
    return (
      <div className="msg user">
        <div className="bubble">{m.text}</div>
      </div>
    );
  }
  if (m.status === 'pending') {
    return (
      <div className="msg wysa" aria-label="Wysa is typing">
        <div className="typing"><i /><i /><i /></div>
      </div>
    );
  }
  if (m.status === 'error') {
    return (
      <div className="msg wysa">
        <p className="failed">
          Something went wrong · <button onClick={() => !isReplying() && store.get().online && retryReply(m.id)}>Retry</button>
        </p>
      </div>
    );
  }
  return (
    <div className="msg wysa">
      <p className="text">{m.text}</p>
      {m.status === 'done' && (
        <button className={`speaker${playing ? ' playing' : ''}`} onClick={() => toggleMessagePlayback(m.id, m.text)} aria-label={playing ? 'Stop' : 'Play message'} aria-pressed={playing}>
          <img src="/assets/speaker.svg" width={24} height={24} alt="" />
        </button>
      )}
    </div>
  );
}
