// Variant C chat thread (Figma Iteration 3: Chat/Active 778:7874, Typing 778:7452 / 778:7480, recorder 778:7906, Error 778:7986).
// "Read aloud" sits only under Wysa's last message. Speak opens voice mode, the Mic dictates.
import type { Message } from '../../lib/store';
import type { ChatModel } from '../../lib/useChat';
import { useTypeIn } from '../../lib/useTypeIn';
import { StatusBar } from '../../components/StatusBar';
import { Recorder } from '../../components/Recorder';
import { PaperLayer } from '../../components/PaperLayer';

export function ChatC({ c }: { c: ChatModel }) {
  const typing = c.hasText && !c.recording;
  const multi = typing && c.multiline;
  const typeIn = useTypeIn(c.messages, 520);
  let lastWysa = -1;
  c.messages.forEach((m, i) => { if (m.role === 'assistant' && m.status === 'done') lastWysa = i; });
  const last = c.messages[c.messages.length - 1];
  const replyFailed = !!last && last.role === 'assistant' && last.status === 'error';
  // Error copy is placeholder copy: flagged for design review.
  const errorText = c.notice ?? (replyFailed ? "Couldn't send. Check your connection and try again." : null);
  return (
    <div className={`scr chat chat-c${typing ? ' is-typing' : ''}${multi ? ' is-multi' : ''}`}>
      <PaperLayer />
      <img className="cc-glow-big" src="/assets/c/glow-big.svg" alt="" />
      <img className="cc-glow-small" src={typing ? '/assets/c/glow-small-typing.svg' : '/assets/c/glow-small.svg'} alt="" />
      <StatusBar />
      <div className="cc-head">
        <button className="icon24" onClick={c.back} aria-label="Back">
          <img className="cc-back" src="/assets/c/fig-back.svg" alt="" />
        </button>
        <div className="progress-wrap">
          <button className="icon24" onClick={c.toggleHeaderTip} aria-label="Menu">
            <img src="/assets/c/fig-list.svg" width={24} height={24} alt="" />
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
            typing={typing}
            typed={m.id === typeIn.typingId ? m.text.slice(0, typeIn.shown) : undefined}
          />
        ))}
      </div>

      {errorText && (
        <div className="cc-error" role="alert">
          {/* No separate Retry link (not in Figma 778:8021 / 778:7986): the error text itself is the retry target, as in voice mode. */}
          <button
            onClick={() => (c.notice ? c.openRecorder('mic') : c.retry(last.id))}
            aria-label={`${errorText} Tap to try again.`}
          >{errorText}</button>
        </div>
      )}

      {c.recording ? (
        <Recorder accent="orange" skin="c" onDenied={c.recorderDenied} onDone={c.recorderDone} />
      ) : (
        <div className="cc-comp">
          <div className="cc-card">
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
            <button className="cc-send" onClick={c.submit} disabled={!typing || c.replying || !c.online} tabIndex={typing ? 0 : -1} aria-label="Send">
              <img src="/assets/c/fig-paper-plane.svg" width={24} height={24} alt="" />
            </button>
            <div className="cc-row">
              <button className="cc-talk" onClick={c.openVoiceMode} disabled={!c.online} aria-label="Speak with Wysa">
                <img src="/assets/c/fig-waveform.svg" width={24} height={24} alt="" />Speak
              </button>
              <button className="cc-mic" onClick={() => c.openRecorder('mic')} disabled={!c.online} aria-label="Dictate">
                <img src="/assets/c/fig-microphone.svg" width={24} height={24} alt="" />
              </button>
              {c.voiceTip && <span className="tooltip" role="status">Voice isn't supported in this browser.</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageRowC({ m, c, showRead, typing, typed }: { m: Message; c: ChatModel; showRead: boolean; typing: boolean; typed?: string }) {
  const playing = c.playingId === m.id;
  if (m.role === 'user') {
    // No Figma frame for a sent message: plain right-aligned text, as in the Voice transcript. Flag for design review.
    return <div className="msg user"><div className="cc-bubble">{m.text}</div></div>;
  }
  if (m.status === 'pending') {
    return <div className="msg wysa" aria-label="Wysa is typing"><div className="typing b"><i /><i /><i /></div></div>;
  }
  if (m.status === 'error') {
    return null; // the failure is shown in the error strip above the input (Figma 778:7986)
  }
  return (
    <div className="msg wysa cc-wysa">
      <p className="text">{typed ?? m.text}{typed !== undefined && <span className="type-caret" />}</p>
      {showRead && m.status === 'done' && typed === undefined && (
        <button className={`cc-read${playing ? ' playing' : ''}`} onClick={() => c.togglePlayback(m.id)} aria-pressed={playing} aria-label={playing ? 'Stop reading aloud' : 'Read aloud'}>
          <img src={typing ? '/assets/c/fig-speaker-high-dim.svg' : '/assets/c/fig-speaker-high.svg'} width={20} height={18} alt="" />
          Read aloud
        </button>
      )}
    </div>
  );
}
