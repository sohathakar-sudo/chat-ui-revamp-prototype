import type { Message } from '../../lib/store';
import type { ChatModel } from '../../lib/useChat';
import { StatusBar } from '../../components/StatusBar';
import { BackIcon } from '../../components/Icons';
import { Recorder } from '../../components/Recorder';

export function ChatA({ c }: { c: ChatModel }) {
  return (
    <div className="scr chat">
      <img className="chat-glow" src="/assets/chat-glow.svg" alt="" />
      <StatusBar />
      <div className="chat-head">
        <button onClick={c.back} aria-label="Back"><BackIcon /></button>
        <div className="progress-wrap">
          <button className="icon24" onClick={c.toggleHeaderTip} aria-label="Progress">
            <img src="/assets/progress-icon.svg" width={24} height={24} alt="" />
          </button>
          {c.headerTip && <div className="tooltip" role="status">The updated progress tab will be accessible from here.</div>}
        </div>
      </div>
      {!c.online && <div className="offline" role="status">You're offline</div>}

      <div className="thread" ref={c.threadRef}>
        {c.messages.map((m) => (
          <MessageRow key={m.id} m={m} c={c} />
        ))}
      </div>

      {c.notice && <p className="notice" role="alert">{c.notice}</p>}

      {c.recording ? (
        <Recorder
          onDenied={c.recorderDenied}
          onDone={c.recorderDone}
        />
      ) : (
        <div className="composer">
          <div className="card">
            <label className={`field${c.hasText ? ' has-text' : ''}`}>
              <textarea
                ref={c.inputRef}
                rows={1}
                value={c.text}
                placeholder="Write, or tap the mic to dictate"
                onChange={(e) => c.onText(e.target.value)}
                onKeyDown={c.onKeyDown}
                enterKeyHint="send"
                aria-label="Message"
              />
            </label>
            <div className="row">
              <button className="speak-pill" onClick={c.openVoiceMode} disabled={!c.online} aria-label="Speak with Wysa">
                <img src="/assets/composer-waveform.svg" width={20} height={20} alt="" />Speak
                {c.voiceTip === 'speak' && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
              </button>
              {c.hasText ? (
                <button className="round-btn send" onClick={c.submit} disabled={c.replying || !c.online} aria-label="Send">
                  <img src="/assets/composer-send.svg" width={24} height={24} alt="" />
                </button>
              ) : (
                <button className="round-btn" onClick={() => c.openRecorder('mic')} disabled={!c.online} aria-label="Dictate a voice note">
                  <img src="/assets/composer-mic.svg" width={46} height={46} alt="" />
                  {c.voiceTip === 'mic' && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageRow({ m, c }: { m: Message; c: ChatModel }) {
  const playing = c.playingId === m.id;
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
          Something went wrong · <button onClick={() => c.retry(m.id)}>Retry</button>
        </p>
      </div>
    );
  }
  return (
    <div className="msg wysa">
      <p className="text">{m.text}</p>
      {m.status === 'done' && (
        <button className={`speaker${playing ? ' playing' : ''}`} onClick={() => c.togglePlayback(m.id, m.text)} aria-label={playing ? 'Stop' : 'Play message'} aria-pressed={playing}>
          <img src="/assets/speaker.svg" width={24} height={24} alt="" />
        </button>
      )}
    </div>
  );
}
