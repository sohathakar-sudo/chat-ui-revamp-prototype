import { config } from '../../../../shared/config';
import { store, useStore } from '../../lib/store';
import { HomeStatusBar } from '../../components/StatusBar';

export type HomeProps = { startVoice(source?: 'speak'): void; tip: boolean };

export function HomeA({ startVoice, tip }: HomeProps) {
  const tracing = useStore((st) => st.trans?.kind === 'home-voice' && st.trans.stage === 'press' && st.trans.source === 'speak');
  return (
    <>
      <div className="hero">
        <div className="hero-top">
          <div className="veil" />
          <HomeStatusBar />
          <div className="hero-head">
            <h1 className="tb-l">Hi {config.userName}!</h1>
            <div className="right tb-r">
              <span className="crisis">Crisis Help</span>
              <img src="/assets/icon-more.svg" width={24} height={24} alt="" />
            </div>
          </div>
        </div>
        <div className="hero-body">
          <div className="orb-btn">
            <button className="home-orb" onClick={() => startVoice()} aria-label="Tap to talk">
              <img src="/assets/home-orb.svg" alt="" />
            </button>
            {tip && <div className="tooltip home-tip">Voice isn't supported in this browser.</div>}
          </div>
          <div className="hero-copy">
            <div className="txt">
              <p className="t1">Tap to Talk</p>
              <p className="t2">What’s on your mind today?</p>
            </div>
            <div className="pills">
              <button className="pill" onClick={() => store.go('chat')}>Chat</button>
              <button className={`pill speak${tracing ? ' tracing' : ''}`} onClick={() => startVoice('speak')}>
                {tracing && <span className="trace" aria-hidden />}
                Speak
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="today" aria-hidden>
        <h2>For your day</h2>
        <div className="list">
          <img className="connector" src="/assets/connector.svg" alt="" />
          <div className="task">
            <div className="milestone"><img src="/assets/milestone-current.svg" width={24} height={24} alt="" /></div>
            <div className="mc-card">
              <div className="content">
                <span className="tag">5 mins</span>
                <h3>Morning Check-in</h3>
                <p className="desc">Reflect on your day with gratitude</p>
                <div className="cta-row">
                  <span className="cta">Check in <img src="/assets/chevron-right-white.svg" width={18} height={18} alt="" /></span>
                </div>
              </div>
              <div className="overlay" />
              <div className="art"><div className="masked"><img src="/assets/mc-art.svg" alt="" /></div></div>
            </div>
          </div>
        </div>
      </div>

      <nav className="bottom-nav" aria-hidden>
        <div className="tab on"><img src="/assets/nav-home.svg" alt="" />Home</div>
        <div className="tab"><img src="/assets/nav-therapist.svg" alt="" />Therapist</div>
        <div className="tab"><span className="blocks"><span className="grid"><i /><i /><i /><i /></span></span>Self-Care</div>
        <div className="tab"><img src="/assets/nav-progress.svg" alt="" />Progress</div>
      </nav>

    </>
  );
}
