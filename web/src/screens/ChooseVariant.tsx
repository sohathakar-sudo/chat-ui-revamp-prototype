// Divergence homescreen: pick Variant A or B, then Continue into the prototype.
// Replaces the floating variant toggle as the primary way to choose a variant.
import { useState } from 'react';
import { prototype } from '../../../shared/config';
import { store, type Variant } from '../lib/store';
import { StatusBar } from '../components/StatusBar';

export function ChooseVariant() {
  const [selected, setSelected] = useState<Variant>(store.get().variant);

  const cont = () => {
    // Set the variant and start the normal flow (Loader → Chat). The conversation persists.
    store.set({ variant: selected, screen: 'loader' });
  };

  return (
    <div className="scr chooser">
      <StatusBar />
      <div className="chooser-body">
        <h1>Choose a Variant</h1>
        <div className="ch-cards" role="radiogroup" aria-label="Design variant">
          {prototype.variants.map((v) => {
            const on = v.id === selected;
            return (
              <button
                key={v.id}
                role="radio"
                aria-checked={on}
                className={`ch-card ch-${v.id}${on ? ' sel' : ''}`}
                onClick={() => setSelected(v.id)}
              >
                <span className="ch-name">{v.label}</span>
                <span className="ch-tag">{v.tagline}</span>
              </button>
            );
          })}
        </div>
        <button className="continue" onClick={cont}>Continue</button>
      </div>
    </div>
  );
}
