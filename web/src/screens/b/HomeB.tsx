// Variant B Home (Figma 531:9413).
import { config } from '../../../../shared/config';
import { store } from '../../lib/store';
import { HomeStatusBar } from '../../components/StatusBar';
import { DuoOrb } from '../../components/DuoOrb';
import type { HomeProps } from '../a/HomeA';

export function HomeB({ startVoice, tip }: HomeProps) {
  return (
    <>
      <div className="hb-hero" onClick={() => startVoice()}>
        <img className="hb-hero-glow" src="/assets/b/home-hero-glow.svg" alt="" />
        <div className="hb-top">
          <HomeStatusBar />
          <div className="hb-head">
            <span className="crisis">Crisis Help</span>
            <img src="/assets/b/icon-more.svg" width={24} height={24} alt="" />
          </div>
        </div>
        <div className="hb-body">
          <div className="hb-center">
            <div className="orb-btn hb-orb-wrap">
              <button className="hb-orb" onClick={(e) => { e.stopPropagation(); startVoice(); }} aria-label="Talk to Wysa">
                <DuoOrb tone="cycle" />
              </button>
              {tip && <div className="tooltip home-tip">Voice isn't supported in this browser.</div>}
            </div>
            <div className="hb-copy">
              <h1>Hi {config.userName}!</h1>
              <p>What’s on your mind today?</p>
            </div>
          </div>
          <div className="hb-pills">
            <button className="hb-pill" onClick={(e) => { e.stopPropagation(); store.go('chat', 'chat'); }}>Chat</button>
            <button className="hb-pill speak" onClick={(e) => { e.stopPropagation(); startVoice('speak'); }}>Speak</button>
          </div>
        </div>
      </div>

      <div className="today hb-today" aria-hidden>
        <h2>For your day</h2>
        <div className="list">
          <img className="connector" src="/assets/connector.svg" alt="" />
          <div className="task">
            <div className="milestone"><img src="/assets/b/milestone-current.svg" width={24} height={24} alt="" /></div>
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
