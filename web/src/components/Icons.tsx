export function BackIcon() {
  return (
    <span className="icon24 back-icon" aria-hidden>
      <span className="a"><img src="/assets/back-1.svg" alt="" /></span>
      <span className="b"><img src="/assets/back-2.svg" alt="" /></span>
    </span>
  );
}

/** Send arrow: no Figma frame for the send state; drawn to match the Speak button's white line icons. */
export function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 16V4M10 4L5 9M10 4l5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
