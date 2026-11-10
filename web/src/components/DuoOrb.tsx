// Variant B orb: two soft circles drifting slowly in opposite directions (no size change).
//   cycle  – Home and Ready: each circle slowly shifts yellow (#FEED9F) → blue (#BEF5F1) → back,
//            out of phase, so the orb reads yellow, blue, then a mix of both.
//   listen – Listening: both circles blue (Figma 531:9367).
//   speak  – Speaking: both circles yellow (Figma 531:9326).
export type DuoTone = 'cycle' | 'listen' | 'speak';

export function DuoOrb({ tone }: { tone: DuoTone }) {
  return (
    <span className={`duo duo-${tone}`} aria-hidden>
      <i className="duo-a" />
      <i className="duo-b" />
    </span>
  );
}
