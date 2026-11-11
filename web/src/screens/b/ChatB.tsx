// Variant B chat thread (Figma 531:8808 Chat/Active, 531:8779 Chat/Typing).
import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../lib/store';
import type { ChatModel } from '../../lib/useChat';
import { useTypeIn } from '../../lib/useTypeIn';
import { StatusBar } from '../../components/StatusBar';
import { Recorder } from '../../components/Recorder';

export function ChatB({ c }: { c: ChatModel }) {
  const typing = c.hasText && !c.recording;
  const typeIn = useTypeIn(c.messages, 520);
  // Hide the top bar when scrolling down, show it when scrolling up or near the top.
  const [headHidden, setHeadHidden] = useState(false);
  const lastTop = useRef(0);
  useEffect(() => {
    const el = c.threadRef.current;
    if (!el) return;
    const onScroll = () => {
      const top = el.scrollTop;
      const d = top - lastTop.current;
      if (top < 8) setHeadHidden(false);
      else if (d > 8) setHeadHidden(true);
      else if (d < -8) setHeadHidden(false);
      if (Math.abs(d) > 8 || top < 8) lastTop.current = top;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [c.threadRef]);
  return (
    <div className={`scr chat chat-b${typing ? ' is-typing' : ''}`}>
      <img className="cb-glow-cool" src="/assets/b/chat-glow-cool.svg" alt="" />
      <img className="cb-glow-warm" src={typing ? '/assets/b/chat-glow-warm-typing.svg' : '/assets/b/chat-glow-warm.svg'} alt="" />
      <StatusBar />
      <div className={`cb-head${headHidden ? ' hidden' : ''}`}>
        <button className="icon24" onClick={c.back} aria-label="Back">
          <img className="cb-back" src="/assets/b/back.svg" alt="" />
        </button>
        <div className="progress-wrap">
          <button className="cb-history" onClick={c.toggleHeaderTip} aria-label="Past conversations">
            <img src="/assets/b/history.svg" width={42} height={42} alt="" />
          </button>
          {c.headerTip && <div className="tooltip cb-tip" role="status">Your past conversations will be accessible from here.</div>}
        </div>
      </div>
      {!c.online && <div className="offline" role="status">You're offline</div>}

      <div className="thread cb-thread" ref={c.threadRef}>
        {c.messages.map((m) => (
          <MessageRowB
            key={m.id}
            m={m}
            c={c}
            typed={m.id === typeIn.typingId ? m.text.slice(0, typeIn.shown) : undefined}
            popRead={m.id === typeIn.typedId}
            enterFade={!!typeIn.typedId && m.id !== typeIn.typedId}
          />
        ))}
      </div>

      {c.notice && <p className="notice" role="alert">{c.notice}</p>}

      {c.recording ? (
        <Recorder accent="orange" onDenied={c.recorderDenied} onDone={c.recorderDone} />
      ) : (
        <div className="bc">
          <div className="bc-card">
            <label className="bc-field">
              <textarea
                ref={c.inputRef}
                rows={1}
                value={c.text}
                placeholder="Send a message"
                onChange={(e) => c.onText(e.target.value)}
                onKeyDown={c.onKeyDown}
                enterKeyHint="send"
                aria-label="Message"
              />
            </label>
            {typing && (
              <button className="bc-send" onClick={c.submit} disabled={c.replying || !c.online} aria-label="Send">
                <img src="/assets/b/send.svg" width={24} height={24} alt="" />
              </button>
            )}
          </div>
          {!typing && (
            <button className="bc-speak" onClick={c.openVoiceMode} disabled={!c.online} aria-label="Speak with Wysa">
              <img src="/assets/b/waveform.svg" width={31} height={34} alt="" />Speak
              {c.voiceTip === 'speak' && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MessageRowB({ m, c, typed, popRead, enterFade }: {
  m: Message; c: ChatModel; typed?: string; popRead?: boolean; enterFade?: boolean;
}) {
  const playing = c.playingId === m.id;
  if (m.role === 'user') {
    return (
      <div className={`msg user${enterFade ? ' tr-fade' : ''}`}>
        <div className="cb-card">{m.text}</div>
      </div>
    );
  }
  if (m.status === 'pending') {
    return (
      <div className="msg wysa" aria-label="Wysa is typing">
        <div className="typing b"><i /><i /><i /></div>
      </div>
    );
  }
  if (m.status === 'error') {
    return (
      <div className="msg wysa">
        <p className="failed b">Something went wrong · <button onClick={() => c.retry(m.id)}>Retry</button></p>
      </div>
    );
  }
  return (
    <div className={`msg wysa cb-wysa${enterFade ? ' tr-fade' : ''}`}>
      <p className="text">{typed ?? m.text}{typed !== undefined && <span className="type-caret" />}</p>
      {m.status === 'done' && typed === undefined && (
        <button className={`cb-read${playing ? ' playing' : ''}${popRead ? ' pop-in' : ''}`} onClick={() => c.togglePlayback(m.id, m.text)} aria-pressed={playing} aria-label={playing ? 'Stop reading aloud' : 'Read aloud'}>
          <img src="/assets/b/speaker.svg" width={20} height={18} alt="" />
          Read aloud
        </button>
      )}
    </div>
  );
}
