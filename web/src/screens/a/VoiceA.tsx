import type { MutableRefObject } from 'react';
import { splitWords } from '../../lib/speech';
import type { Phase, VoiceModel } from '../../lib/useVoice';
import { StatusBar } from '../../components/StatusBar';

// Bar geometry from Figma (listening 523:6666, speaking 523:6634), in orb coordinates.
const LISTEN_BARS = [
  { left: 48, h: 26.332 }, { left: 64, h: 25.761 }, { left: 80, h: 55.135 }, { left: 96, h: 44.729 },
];
const LISTEN_CY = 74.57;
const SPEAK_BARS = [
  { left: 0, top: 3.77, h: 32.45 }, { left: 14, top: 0, h: 40 }, { left: 28, top: 10.66, h: 18.689 }, { left: 42, top: 10.45, h: 19.103 },
];

export function VoiceA({ v }: { v: VoiceModel }) {
  const { phase, caption, transcript, replyText, spokenWords, barEls, onScreenTap, toggleMute, leave } = v;
  const words = splitWords(replyText);

  return (
    <div className="scr" onClick={onScreenTap} style={{ cursor: phase === 'idle' || phase === 'failed' ? 'pointer' : undefined }}>
      <StatusBar />
      <div className="voice-body">
        <div className="v-head">
          <button className="v-x" onClick={(e) => { e.stopPropagation(); leave('home'); }} aria-label="End session">
            <img src="/assets/close.svg" width={20} height={20} alt="" />
          </button>
          <button className="v-gear" onClick={(e) => { e.stopPropagation(); leave('voices'); }} aria-label="Choose a voice">
            <img src="/assets/gear.svg" width={24} height={24} alt="" />
          </button>
        </div>

        <div className="v-main">
          <div className={`orb-wrap${phase === 'idle' ? ' center' : ''}`}>
            <Orb phase={phase} barEls={barEls} />
          </div>
          <div className="v-text">
            <p className={`caption${caption?.err ? ' err' : ''}`} role="status" aria-live="polite">
              {caption?.spin && <img className="spin" src="/assets/spinner.svg" alt="" />}
              {caption?.text}
            </p>
            {phase === 'listening' && transcript.text && (
              <p className="v-msg">{transcript.text}{transcript.partial ? '…' : ''}</p>
            )}
            {phase === 'speaking' && (
              <p className="v-msg">
                {words.slice(0, spokenWords).join(' ')}
                {spokenWords > 0 && spokenWords < words.length ? ' ' : ''}
                <span className="later">{words.slice(spokenWords).join(' ')}</span>
              </p>
            )}
          </div>
        </div>

        {phase !== 'idle' && (
          <div className="v-ctrls" onClick={(e) => e.stopPropagation()}>
            <button className="v-btn" onClick={() => leave('chat')} aria-label="Type">
              <span className="c aa">Aa</span>
              <span className="l">Type</span>
            </button>
            <button className="v-btn" onClick={toggleMute} aria-label={phase === 'paused' ? 'Unmute' : 'Mute'} aria-pressed={phase === 'paused'}>
              <span className={`c${phase === 'paused' ? ' active' : phase === 'speaking' ? ' dim' : ''}`}>
                <img src="/assets/mic-slash.svg" width={24} height={24} alt="" />
              </span>
              <span className="l">Mute</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Orb({ phase, barEls }: { phase: Phase; barEls: MutableRefObject<(HTMLElement | null)[]> }) {
  if (phase === 'idle') {
    return (
      <div className="orb">
        <div className="glow idle"><img src="/assets/idle-glow.svg" alt="" /></div>
        <div className="idle-core"><img src="/assets/idle-core.svg" alt="" /></div>
      </div>
    );
  }
  if (phase === 'speaking') {
    return (
      <div className="orb">
        <div className="glow speak"><img src="/assets/speak-glow.svg" alt="" /></div>
        <div className="speak-ring"><img src="/assets/speak-ring.svg" alt="" /></div>
        <div className="bars speak on">
          {SPEAK_BARS.map((b, i) => <i key={i} style={{ left: b.left, top: b.top, height: b.h }} />)}
        </div>
      </div>
    );
  }
  if (phase === 'listening' || phase === 'thinking') {
    return (
      <div className="orb">
        <div className={`glow listen${phase === 'thinking' ? ' pulse' : ''}`}><img src="/assets/listen-glow.svg" alt="" /></div>
        <img className="listen-ring" src="/assets/listen-ring.svg" alt="" />
        <div className="bars listen">
          {LISTEN_BARS.map((b, i) => (
            <i
              key={i}
              ref={phase === 'listening' ? (el) => { barEls.current[i] = el; } : undefined}
              style={{ left: b.left, top: LISTEN_CY - b.h / 2, height: b.h, transform: phase === 'thinking' ? 'scaleY(0.6)' : undefined }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (phase === 'reconnecting' || phase === 'failed') {
    // Reconnecting (530:8646): plain ring, no bars.
    return (
      <div className="orb">
        <div className="glow listen"><img src="/assets/reconnect-glow.svg" alt="" /></div>
        <img className="listen-ring" src="/assets/reconnect-ring.svg" alt="" />
      </div>
    );
  }
  // Paused and mic-denied: no Figma frame, so the static Listening orb.
  return (
    <div className="orb">
      <div className="glow listen"><img src="/assets/listen-glow.svg" alt="" /></div>
      <img className="listen-ring" src="/assets/listen-graphic.svg" alt="" />
    </div>
  );
}
