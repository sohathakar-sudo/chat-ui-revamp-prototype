// Variant B voice mode (Figma 531:9276 Landing, 531:9326 Speaking, 531:9367 Listening, 531:10040 Paused).
// Thinking, Reconnecting and the "Tap to start" timeout have no frame: built from these frames' parts.
// X goes to the Chat thread (which shows the whole voice conversation); Chat's back arrow then goes Home.
import { DuoOrb } from '../../components/DuoOrb';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useStore } from '../../lib/store';
import { splitWords } from '../../lib/speech';
import type { Phase, VoiceModel } from '../../lib/useVoice';
import { StatusBar } from '../../components/StatusBar';

export function VoiceB({ v }: { v: VoiceModel }) {
  const { phase, idleReason, caption, transcript, replyText, spokenWords, micLevel, onScreenTap, toggleMute, leave } = v;
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
  // Glows are always mounted and fade/slide between states (no pop when the state changes).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(r); }, []);
  const glowOn = {
    landingTop: mounted && ready,
    landingBottom: mounted && ready,
    speakTop: mounted && phase === 'speaking',
    listenBottom: mounted && !ready && phase !== 'speaking' && phase !== 'paused',
  };

  // Living glows: the bottom glow rises with the user's voice (mic level) and settles in silence;
  // the top glow moves while Wysa is speaking (paced by spoken words) and settles when she stops.
  const bottomImg = useRef<HTMLImageElement>(null);
  const topImg = useRef<HTMLImageElement>(null);
  const phaseNow = useRef(phase);
  phaseNow.current = phase;
  const lastWordAt = useRef(0);
  useEffect(() => { lastWordAt.current = performance.now(); }, [spokenWords]);
  useEffect(() => {
    let raf = 0;
    let sBot = 0;
    let sTop = 0;
    const loop = () => {
      const p = phaseNow.current;
      const now = performance.now();
      const targetBot = p === 'listening' ? Math.min(1, micLevel() * 2.2) : 0;
      const wysaTalking = p === 'speaking' && now - lastWordAt.current < 450;
      const targetTop = wysaTalking ? 0.55 + 0.45 * Math.abs(Math.sin(now / 240)) : 0;
      sBot += (targetBot - sBot) * (targetBot > sBot ? 0.22 : 0.05);
      sTop += (targetTop - sTop) * (targetTop > sTop ? 0.12 : 0.05);
      // The glow boxes are rotated 180°, so +Y on the image lifts the bottom glow and -Y lowers the top glow.
      if (bottomImg.current) bottomImg.current.style.transform = `translateY(${(sBot * 80).toFixed(1)}px) scale(${(1 + sBot * 0.12).toFixed(3)})`;
      if (topImg.current) topImg.current.style.transform = `translateY(${(-sTop * 70).toFixed(1)}px) scale(${(1 + sTop * 0.1).toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [micLevel]);

  // Ready → Listening: the big Ready orb shrinks and glides down into the small orb's place,
  // while "Start Speaking" fades out (FLIP: measure before, animate a stand-in, then reveal the real orb).
  const rootRef = useRef<HTMLDivElement>(null);
  const landingOrbRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const smallOrbRef = useRef<HTMLDivElement>(null);
  const flightOrbRef = useRef<HTMLDivElement>(null);
  const flightTitleRef = useRef<HTMLParagraphElement>(null);
  const lastRects = useRef<{ orb: Box; title: Box } | null>(null);
  const wasReady = useRef(ready);
  const [flight, setFlight] = useState<{ orb: Box; title: Box; to: Box } | null>(null);

  const rel = (el: Element | null): Box | null => {
    const root = rootRef.current;
    if (!el || !root) return null;
    const rr = root.getBoundingClientRect();
    const k = rr.width / root.offsetWidth || 1; // the phone frame may be scaled
    const r = el.getBoundingClientRect();
    return { x: (r.left - rr.left) / k, y: (r.top - rr.top) / k, w: r.width / k, h: r.height / k };
  };

  useLayoutEffect(() => {
    if (ready) {
      const orb = rel(landingOrbRef.current);
      const title = rel(titleRef.current);
      if (orb && title) lastRects.current = { orb, title };
    } else if (wasReady.current && lastRects.current) {
      const to = rel(smallOrbRef.current);
      if (to) setFlight({ ...lastRects.current, to });
    }
    wasReady.current = ready;
  });

  useLayoutEffect(() => {
    if (!flight) return;
    const { orb, to } = flight;
    const dx = to.x + to.w / 2 - (orb.x + orb.w / 2);
    const dy = to.y + to.h / 2 - (orb.y + orb.h / 2);
    const k = to.w / orb.w;
    const a = flightOrbRef.current?.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${k})`, opacity: 1, offset: 0.85 },
        { transform: `translate(${dx}px, ${dy}px) scale(${k})`, opacity: 0 },
      ],
      { duration: 800, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
    );
    flightTitleRef.current?.animate(
      [{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' }, { opacity: 0, filter: 'blur(8px)', transform: 'translateY(-12px)' }],
      { duration: 350, easing: 'ease-out', fill: 'forwards' },
    );
    const t = window.setTimeout(() => setFlight(null), 820);
    return () => { a?.cancel(); window.clearTimeout(t); };
  }, [flight]);

  return (
    <div ref={rootRef} className={`scr vb${ready ? ' vb-ready' : ''}${flight ? ' vb-arrive' : ''}`} onClick={onScreenTap}
      style={{ cursor: phase === 'idle' || phase === 'failed' ? 'pointer' : undefined }}>
      <div className={`vb-glow vb-glow-bottom${glowOn.landingBottom ? ' on' : ''}`}><img src="/assets/b/landing-glow-bottom.svg" alt="" /></div>
      <div className={`vb-glow vb-glow-bottom listen${glowOn.listenBottom ? ' on' : ''}`}><img ref={bottomImg} src="/assets/b/listen-glow-bottom.svg" alt="" /></div>
      <div className={`vb-glow vb-glow-top${glowOn.landingTop ? ' on' : ''}`}><img src="/assets/b/landing-glow-top.svg" alt="" /></div>
      <div className={`vb-glow vb-glow-top speak${glowOn.speakTop ? ' on' : ''}`}><img ref={topImg} src="/assets/b/speak-glow-top.svg" alt="" /></div>

      <StatusBar />
      <div className="vb-main">
        <div className="vb-head">
          <button className="v-x" onClick={(e) => { e.stopPropagation(); leave('chat'); }} aria-label="End session">
            <img src="/assets/close.svg" width={20} height={20} alt="" />
          </button>
          <button className={`vb-pill vb-voice${warmChrome ? ' warm' : ''}`} onClick={(e) => { e.stopPropagation(); leave('voices'); }}>
            <img src="/assets/b/wysa-voice.svg" width={23.12} height={23.13} alt="" />
            Wysa’s Voice
          </button>
        </div>

        {ready ? (
          <div className="vb-start">
            <p className="vb-start-title" ref={titleRef}>Start Speaking</p>
            <div className="vb-landing-orb" ref={landingOrbRef}>
              <DuoOrb tone="cycle" />
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
              <OrbB phase={phase} boxRef={smallOrbRef} arriving={!!flight} />
              <p className={`vb-caption${caption?.err ? ' err' : ''}`} role="status" aria-live="polite">
                {caption?.spin && <img className="spin" src="/assets/spinner.svg" alt="" />}
                {caption?.text}
              </p>
            </div>
          </>
        )}
      </div>

      {flight && (
        <>
          <p className="vb-start-title vb-flight" ref={flightTitleRef}
            style={{ left: flight.title.x, top: flight.title.y, width: flight.title.w, height: flight.title.h }}>Start Speaking</p>
          <div className="vb-landing-orb vb-flight" ref={flightOrbRef}
            style={{ left: flight.orb.x, top: flight.orb.y, width: flight.orb.w, height: flight.orb.h }}>
            <DuoOrb tone="cycle" />
          </div>
        </>
      )}

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

type Box = { x: number; y: number; w: number; h: number };

function OrbB({ phase, boxRef, arriving }: {
  phase: Phase; boxRef: RefObject<HTMLDivElement>; arriving: boolean;
}) {
  // Listening and Speaking share one orb: two same-coloured circles drifting slowly, no size change.
  return (
    <div ref={boxRef} className={`vb-orb${phase === 'paused' ? ' hidden' : ''}${phase === 'thinking' ? ' pulse' : ''}${arriving ? ' arriving' : ''}`}>
      <DuoOrb tone={phase === 'speaking' ? 'speak' : 'listen'} />
    </div>
  );
}
