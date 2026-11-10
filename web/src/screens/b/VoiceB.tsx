// Variant B voice mode (Figma 531:9276 Landing, 531:9326 Speaking, 531:9367 Listening, 531:10040 Paused).
// Thinking, Reconnecting and the "Tap to start" timeout have no frame: built from these frames' parts.
import { useStore } from '../../lib/store';
import { splitWords } from '../../lib/speech';
import type { Phase, VoiceModel } from '../../lib/useVoice';
import { StatusBar } from '../../components/StatusBar';

export function VoiceB({ v }: { v: VoiceModel }) {
  const { phase, idleReason, caption, transcript, replyText, spokenWords, barEls, onScreenTap, toggleMute, leave } = v;
  const messages = useStore((s) => s.messages);
  const ready = phase === 'idle' && idleReason === 'initial';

  // Transcript area: only the latest exchange (Wysa's latest line, the user's reply beneath it).
  let lastWysa = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'assistant' && m.text && m.status !== 'error') { lastWysa = i; break; }
  }
  const wysaLine = lastWysa >= 0 ? messages[lastWysa].text : '';
  const userAfter = messages.slice(lastWysa + 1).filter((m) => m.role === 'user').map((m) => m.text).join(' ');
  const words = splitWords(replyText);

  let userLine = userAfter;
  if (phase === 'listening') userLine = transcript.text ? transcript.text + (transcript.partial ? '…' : '') : '';
  if (phase === 'speaking') userLine = '';

  // Glow and pill glow follow the frames: warm for Ready/Speaking, cool for Listening.
  const warmChrome = ready || phase === 'speaking';
  const greyChrome = phase === 'speaking' || phase === 'paused';
  const glow =
    ready ? 'landing' : phase === 'speaking' ? 'speak' : phase === 'paused' ? 'none' : 'listen';

  return (
    <div className={`scr vb${ready ? ' vb-ready' : ''}`} onClick={onScreenTap}
      style={{ cursor: phase === 'idle' || phase === 'failed' ? 'pointer' : undefined }}>
      {glow === 'landing' && (
        <>
          <div className="vb-glow vb-glow-bottom slide-up" key="lb"><img src="/assets/b/landing-glow-bottom.svg" alt="" /></div>
          <div className="vb-glow vb-glow-top slide-down" key="lt"><img src="/assets/b/landing-glow-top.svg" alt="" /></div>
        </>
      )}
      {glow === 'speak' && (
        <div className="vb-glow vb-glow-top speak slide-down" key="st"><img src="/assets/b/speak-glow-top.svg" alt="" /></div>
      )}
      {glow === 'listen' && (
        <div className="vb-glow vb-glow-bottom listen slide-up" key="lsb"><img src="/assets/b/listen-glow-bottom.svg" alt="" /></div>
      )}

      <StatusBar />
      <div className="vb-main">
        <div className="vb-head">
          <button className="v-x" onClick={(e) => { e.stopPropagation(); leave('home'); }} aria-label="End session">
            <img src="/assets/close.svg" width={20} height={20} alt="" />
          </button>
          <button className={`vb-pill vb-voice${warmChrome ? ' warm' : ''}`} onClick={(e) => { e.stopPropagation(); leave('voices'); }}>
            <img src="/assets/b/wysa-voice.svg" width={23.12} height={23.13} alt="" />
            Wysa’s Voice
          </button>
        </div>

        {ready ? (
          <div className="vb-start">
            <p className="vb-start-title">Start Speaking</p>
            <div className="vb-landing-orb">
              <span className="lo-a"><span><img src="/assets/b/landing-orb-a.svg" alt="" /></span></span>
              <span className="lo-b"><span className="spin-b"><img src="/assets/b/landing-orb-b.svg" alt="" /></span></span>
            </div>
            <p className="vb-caption" role="status" aria-live="polite" />
          </div>
        ) : (
          <>
            <div className="vb-transcript">
              {phase === 'speaking' ? (
                <p className="vb-wysa">
                  {words.slice(0, spokenWords).join(' ')}
                  {spokenWords > 0 && spokenWords < words.length ? ' ' : ''}
                  <span className="later">{words.slice(spokenWords).join(' ')}</span>
                </p>
              ) : (
                wysaLine && <p className="vb-wysa">{wysaLine}</p>
              )}
              {userLine && <p className="vb-user">{userLine}</p>}
            </div>
            <div className="vb-orb-block">
              <OrbB phase={phase} barEls={barEls} />
              <p className={`vb-caption${caption?.err ? ' err' : ''}`} role="status" aria-live="polite">
                {caption?.spin && <img className="spin" src="/assets/spinner.svg" alt="" />}
                {caption?.text}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="vb-ctrls" onClick={(e) => e.stopPropagation()}>
        <button className={`vb-pill${greyChrome ? ' grey' : ''}`} onClick={() => leave('chat')}>
          <img src="/assets/b/keyboard.svg" width={24} height={24} alt="" />Type
        </button>
        <button className={`vb-pill${greyChrome ? ' grey' : ''}${phase === 'paused' ? ' active' : ''}`} onClick={toggleMute}
          aria-pressed={phase === 'paused'} aria-label={phase === 'paused' ? 'Resume' : 'Pause'}>
          <img src={phase === 'paused' ? '/assets/b/pause-active.svg' : '/assets/b/pause.svg'} width={24} height={24} alt="" />Pause
        </button>
      </div>
    </div>
  );
}

function OrbB({ phase, barEls }: { phase: Phase; barEls: VoiceModel['barEls'] }) {
  if (phase === 'speaking') {
    return <div className="vb-orb"><img src="/assets/b/speak-orb.svg" width={100} height={100} alt="" /></div>;
  }
  const live = phase === 'listening';
  return (
    <div className={`vb-orb${phase === 'paused' ? ' hidden' : ''}${phase === 'thinking' ? ' pulse' : ''}`}>
      <div className="lo-level" data-level="scale" ref={live ? (el) => { barEls.current = [el]; } : undefined}>
        <div className="lo-rot">
          <span className="li-a"><span className={live ? 'spin-b' : ''}><img src="/assets/b/listen-orb-a.svg" alt="" /></span></span>
          <span className="li-b"><span className={live ? 'spin-b' : ''}><img src="/assets/b/listen-orb-b.svg" alt="" /></span></span>
        </div>
      </div>
    </div>
  );
}
