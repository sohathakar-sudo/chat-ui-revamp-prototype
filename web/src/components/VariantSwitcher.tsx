// Prototype controls modal. Neutral styling, outside either variant's design.
// Controls and variants come from `prototype` in shared/config.ts.
import { useEffect, useRef } from 'react';
import { prototype } from '../../../shared/config';
import { store, useStore, type Variant } from '../lib/store';

export function openSwitcher() {
  store.set({ switcherOpen: true });
}

/** Triple-tap detector for the status bar (opens the switcher on mobile). */
export function useTripleTap() {
  const taps = useRef<number[]>([]);
  return () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 600), now];
    if (taps.current.length >= 3) { taps.current = []; openSwitcher(); }
  };
}

export function VariantSwitcher() {
  const open = useStore((s) => s.switcherOpen);
  const variant = useStore((s) => s.variant);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => store.set({ switcherOpen: false });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const pickVariant = (v: Variant) => {
    if (v === variant) return;
    // Same screen, same conversation and voice; voice mode pauses itself on the switch.
    store.set({ variant: v });
  };

  return (
    <div className="pc-overlay" onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="pc-panel" role="dialog" aria-modal="true" aria-labelledby="pc-title" tabIndex={-1} ref={panelRef}>
        <div className="pc-head">
          <h2 id="pc-title">Prototype controls</h2>
          <button className="pc-x" onClick={close} aria-label="Close">×</button>
        </div>
        {prototype.controls.map((control) => (
          <section key={control.id} className="pc-control">
            <h3>{control.label}</h3>
            {control.id === 'variant' && (
              <div className="pc-options" role="radiogroup" aria-label={control.label}>
                {prototype.variants.map((v) => (
                  <button
                    key={v.id}
                    role="radio"
                    aria-checked={v.id === variant}
                    className={`pc-option${v.id === variant ? ' on' : ''}`}
                    onClick={() => pickVariant(v.id)}
                  >
                    <span className="pc-label">{v.label}</span>
                    <span className="pc-desc">{v.description}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
        <p className="pc-foot">Conversation and voice carry over. Link to a variant with <code>?variant=B</code>.</p>
      </div>
    </div>
  );
}
