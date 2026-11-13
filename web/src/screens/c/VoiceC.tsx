// Variant C voice mode (Figma 681:2162 Landing, 681:2211 Speaking, 681:2248 Listening, 681:2294 Paused).
// The transcript is the whole conversation: scrollable, plain text, not interactive.
// Thinking, Reconnecting and Failed have no frame: built from these frames' parts (flag for design review).
import { useEffect, useRef, useState } from 'react';
import { config } from '../../../../shared/config';
import { useStore } from '../../lib/store';
import { splitWords } from '../../lib/speech';
import type { VoiceModel } from '../../lib/useVoice';
import { DuoOrb } from '../../components/DuoOrb';
import { StatusBar } from '../../components/StatusBar';

export function VoiceC({ v }: { v: VoiceModel }) {
  const { phase, idleReason, resuming, caption, transcript, replyText, spokenWords, onScreenTap, toggleMute, leave } = v;
  const messages = useStore((s) => s.messages);
  const trans = useStore((s) => s.trans);
  const leaving = trans?.kind === 'voice-chat' && trans.stage !== 'enter';
  const ready = phase === 'idle' && idleReason === 'initial' && !leaving && !resuming;
  const paused = phase === 'paused';
  const speaking = phase === 'speaking';
  const grey = speaking || paused;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);

  // Hamburger: "Work in progress" tooltip, dismissed after a few seconds or on the next tap.
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => setTip(false), config.tooltipMs);
    const off = () => setTip(false);
    window.addEventListener('pointerdown', off, { once: true, capture: true });
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', off, { capture: true }); };
  }, [tip]);

  // Whole transcript: Wysa left, user right. While Wysa speaks, her last line fills in word by word.
  const shown = ready ? [] : messages.filter((m) => m.text && m.status !== 'error' && m.status !== 'pending');
  let lastWysa = -1;
  shown.forEach((m, i) => { if (m.role === 'assistant') lastWysa = i; });
  const words = splitWords(replyText);
  const liveUser = phase === 'listening' && transcript.text ? transcript.text + (transcript.partial ? '…' : '') : '';

  // Keep the newest line in view.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length, liveUser, spokenWords, phase]);

  // Jump-to-latest chevron (Figma 708:8281): shown only while the transcript is scrolled up.
  const [atBottom, setAtBottom] = useState(true);
  const onScroll = () => {
    const el = scroller.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
  };
  const jumpLatest = () => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });

  const label = ready ? 'Tap to start' : caption?.text ?? '';
  // The Iteration-3 frames show the header icons inconsistently (Paused has neither, Speaking only
  // the gear). Per design review we keep X + gear + hamburger in every state so the functional gear
  // (voice settings) and hamburger stay reachable throughout. Flagged as a deviation from the frames.
  const showGear = true;
  const showMenu = true;

  return (
    <div className={`scr vc${ready ? ' vc-ready' : ''}${paused ? ' is-paused' : ''}`} onClick={onScreenTap}
      style={{ cursor: phase === 'idle' || phase === 'failed' ? 'pointer' : undefined }}>
      <div className={`vc-glow vc-glow-bottom${mounted && ready ? ' on' : ''}`}><img src="/assets/c/v-glow-bottom-landing.svg" alt="" /></div>
      <div className={`vc-glow vc-glow-top${mounted && ready ? ' on' : ''}`}><img src="/assets/c/v-glow-top-landing.svg" alt="" /></div>
      <div className={`vc-glow vc-glow-top speak${mounted && speaking ? ' on' : ''}`}><img src="/assets/c/v-glow-top-speak.svg" alt="" /></div>
      <div className={`vc-glow vc-glow-bottom listen${mounted && !ready && !grey ? ' on' : ''}`}><img src="/assets/c/v-glow-bottom-listen.svg" alt="" /></div>

      <div className="vc-pglow blue"><i /></div>
      <div className="vc-pglow yellow"><i /></div>

      <StatusBar />
      <div className="vc-main">
        <div className="vc-head">
          <button className="v-x" onClick={(e) => { e.stopPropagation(); leave('chat', 'close'); }} aria-label="End session">
            <img src="/assets/c/close.svg" width={20} height={20} alt="" />
          </button>
          <div className="vc-actions">
            {showGear && (
              <button className="vc-icon" onClick={(e) => { e.stopPropagation(); leave('voices'); }} aria-label="Voice settings">
                <img src="/assets/c/gear.svg" width={24} height={24} alt="" />
              </button>
            )}
            {showMenu && (
              <div className="progress-wrap">
                <button className="vc-icon" onClick={(e) => { e.stopPropagation(); setTip(true); }} aria-label="Menu">
                  <img src="/assets/c/v-menu.svg" width={42} height={42} alt="" />
                </button>
                {tip && <div className="tooltip vc-tip" role="status">Work in progress</div>}
              </div>
            )}
          </div>
        </div>

        <>
            <div className="vc-transcript" ref={scroller} onScroll={onScroll}>
              {shown.map((m, i) =>
                m.role === 'user' ? (
                  <p key={m.id} className="vc-bubble">{m.text}</p>
                ) : speaking && i === lastWysa ? (
                  <p key={m.id} className="vc-line vc-wysa">
                    {words.slice(0, spokenWords).join(' ')}
                    {spokenWords > 0 && spokenWords < words.length ? ' ' : ''}
                    <span className="later">{words.slice(spokenWords).join(' ')}</span>
                  </p>
                ) : (
                  <p key={m.id} className="vc-line vc-wysa">{m.text}</p>
                ),
              )}
              {liveUser && <p className="vc-bubble">{liveUser}</p>}
            </div>
            {!atBottom && !ready && (
              <button className="vc-jump" onClick={(e) => { e.stopPropagation(); jumpLatest(); }} aria-label="Jump to latest">
                <img src="/assets/c/caret-down.svg" width={16} height={16} alt="" />
              </button>
            )}
            <div className="vc-orb-block">
              <div className={`vc-orb${paused ? ' hidden' : ''}${phase === 'thinking' ? ' pulse' : ''}`}>
                <DuoOrb tone={ready ? 'cycle' : speaking ? 'speak' : 'listen'} />
              </div>
              <p className={`vc-label${caption?.err ? ' err' : ''}`} role="status" aria-live="polite">
                {leaving && trans?.source === 'type' ? (
                  <><img className="spin" src="/assets/spinner.svg" alt="" />Taking you to chat</>
                ) : (
                  <>{caption?.spin && <img className="spin" src="/assets/spinner.svg" alt="" />}{label}</>
                )}
              </p>
            </div>
        </>
      </div>

      <div className="vc-ctrls" onClick={(e) => e.stopPropagation()}>
        <button className={`vc-pill${grey ? ' grey' : ''}`} onClick={() => leave('chat', 'type')}>
          <img src="/assets/c/keyboard.svg" width={24} height={24} alt="" />Type
        </button>
        <button className={`vc-pill${grey ? ' grey' : ''}${paused ? ' active' : ''}`} onClick={toggleMute}
          aria-pressed={paused} aria-label={paused ? 'Resume' : 'Pause'}>
          <img src={paused ? '/assets/c/pause-active.svg' : '/assets/c/pause.svg'} width={24} height={24} alt="" />Pause
        </button>
      </div>
    </div>
  );
}
