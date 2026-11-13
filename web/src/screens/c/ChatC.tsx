// Variant C chat thread (Figma 681:2412 Chat/Active, 681:2135 Chat/Typing, 681:2443 recorder).
// "Read aloud" sits only under Wysa's last message. Talk opens voice mode, the Mic dictates.
import type { Message } from '../../lib/store';
import type { ChatModel } from '../../lib/useChat';
import { useTypeIn } from '../../lib/useTypeIn';
import { StatusBar } from '../../components/StatusBar';
import { Recorder } from '../../components/Recorder';

export function ChatC({ c }: { c: ChatModel }) {
  const typing = c.hasText && !c.recording;
  const typeIn = useTypeIn(c.messages, 520);
  let lastWysa = -1;
  c.messages.forEach((m, i) => { if (m.role === 'assistant' && m.status === 'done') lastWysa = i; });
  return (
    <div className={`scr chat chat-c${typing ? ' is-typing' : ''}`}>
      <img className="cc-glow-big" src="/assets/c/glow-big.svg" alt="" />
      <img className="cc-glow-small" src={typing ? '/assets/c/glow-small-typing.svg' : '/assets/c/glow-small.svg'} alt="" />
      <StatusBar />
      <div className="cc-head">
        <button className="icon24" onClick={c.back} aria-label="Back">
          <img className="cc-back" src="/assets/c/back.svg" alt="" />
        </button>
        <div className="progress-wrap">
          <button className="icon24" onClick={c.toggleHeaderTip} aria-label="Menu">
            <img src="/assets/c/menu.svg" width={24} height={24} alt="" />
          </button>
          {c.headerTip && <div className="tooltip cc-tip" role="status">Work in progress</div>}
        </div>
      </div>
      {!c.online && <div className="offline" role="status">You're offline</div>}

      <div className="thread cc-thread" ref={c.threadRef}>
        {c.messages.map((m, i) => (
          <MessageRowC
            key={m.id}
            m={m}
            c={c}
            showRead={i === lastWysa}
            typed={m.id === typeIn.typingId ? m.text.slice(0, typeIn.shown) : undefined}
          />
        ))}
      </div>

      {c.notice && <p className="notice" role="alert">{c.notice}</p>}

      {c.recording ? (
        <Recorder accent="orange" skin="c" onDenied={c.recorderDenied} onDone={c.recorderDone} />
      ) : (
        <div className="cc-comp">
          <div className="cc-card">
            <label className="cc-field">
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
            {typing ? (
              <button className="cc-send" onClick={c.submit} disabled={c.replying || !c.online} aria-label="Send">
                <img src="/assets/c/send.svg" width={24} height={24} alt="" />
              </button>
            ) : (
              <div className="cc-row">
                <button className="cc-talk" onClick={c.openVoiceMode} disabled={!c.online} aria-label="Talk with Wysa">
                  <img src="/assets/c/waveform.svg" width={20} height={20} alt="" />Talk
                </button>
                <button className="cc-mic" onClick={() => c.openRecorder('mic')} disabled={!c.online} aria-label="Dictate">
                  <img src="/assets/c/mic.svg" width={42} height={42} alt="" />
                </button>
                {c.voiceTip && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageRowC({ m, c, showRead, typed }: { m: Message; c: ChatModel; showRead: boolean; typed?: string }) {
  const playing = c.playingId === m.id;
  if (m.role === 'user') {
    // No Figma frame for a sent message: plain right-aligned text, as in the Voice transcript. Flag for design review.
    return <div className="msg user"><div className="cc-bubble">{m.text}</div></div>;
  }
  if (m.status === 'pending') {
    return <div className="msg wysa" aria-label="Wysa is typing"><div className="typing b"><i /><i /><i /></div></div>;
  }
  if (m.status === 'error') {
    return <div className="msg wysa"><p className="failed b">Something went wrong · <button onClick={() => c.retry(m.id)}>Retry</button></p></div>;
  }
  return (
    <div className="msg wysa cc-wysa">
      <p className="text">{typed ?? m.text}{typed !== undefined && <span className="type-caret" />}</p>
      {showRead && m.status === 'done' && typed === undefined && (
        <button className={`cc-read${playing ? ' playing' : ''}`} onClick={() => c.togglePlayback(m.id, m.text)} aria-pressed={playing} aria-label={playing ? 'Stop reading aloud' : 'Read aloud'}>
          <img src="/assets/c/speaker.svg" width={20} height={18} alt="" />
          Read aloud
        </button>
      )}
    </div>
  );
}
