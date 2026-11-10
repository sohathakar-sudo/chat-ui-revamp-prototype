// Variant B chat thread (Figma 531:8808 Chat/Active, 531:8779 Chat/Typing).
import type { Message } from '../../lib/store';
import type { ChatModel } from '../../lib/useChat';
import { StatusBar } from '../../components/StatusBar';
import { Recorder } from '../../components/Recorder';

export function ChatB({ c }: { c: ChatModel }) {
  const typing = c.hasText && !c.recording;
  return (
    <div className={`scr chat chat-b${typing ? ' is-typing' : ''}`}>
      <img className="cb-glow-cool" src="/assets/b/chat-glow-cool.svg" alt="" />
      <img className="cb-glow-warm" src={typing ? '/assets/b/chat-glow-warm-typing.svg' : '/assets/b/chat-glow-warm.svg'} alt="" />
      <StatusBar />
      <div className="cb-head">
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
        {c.messages.map((m) => <MessageRowB key={m.id} m={m} c={c} />)}
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
            <button className="bc-speak" onClick={() => c.openRecorder('speak')} disabled={!c.online} aria-label="Record a voice note">
              <img src="/assets/b/waveform.svg" width={31} height={34} alt="" />Speak
              {c.voiceTip === 'speak' && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MessageRowB({ m, c }: { m: Message; c: ChatModel }) {
  const playing = c.playingId === m.id;
  if (m.role === 'user') {
    return (
      <div className="msg user">
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
    <div className="msg wysa cb-wysa">
      <p className="text">{m.text}</p>
      {m.status === 'done' && (
        <button className={`cb-read${playing ? ' playing' : ''}`} onClick={() => c.togglePlayback(m.id, m.text)} aria-pressed={playing} aria-label={playing ? 'Stop reading aloud' : 'Read aloud'}>
          <img src="/assets/b/speaker.svg" width={20} height={18} alt="" />
          Read aloud
        </button>
      )}
    </div>
  );
}
