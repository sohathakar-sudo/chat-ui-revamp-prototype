import { useTripleTap } from './VariantSwitcher';

// Decorative status bars, matching the two variants in the Figma frames.
// Triple-tap on the status bar opens the prototype controls (mobile, no frame).
export function StatusBar() {
  const onTap = useTripleTap();
  return (
    <div className="sb" aria-hidden onClick={(e) => { e.stopPropagation(); onTap(); }}>
      <span className="sb-time">9:41</span>
      <span className="sb-icons">
        <img src="/assets/sb-signal.svg" width={18} height={18} alt="" />
        <img src="/assets/sb-wifi.svg" width={18} height={18} alt="" />
        <img src="/assets/sb-battery.svg" width={27} height={18} alt="" />
      </span>
    </div>
  );
}

export function HomeStatusBar() {
  const onTap = useTripleTap();
  return (
    <div className="sb-home" aria-hidden onClick={onTap}>
      <span className="t">19:02</span>
      <img src="/assets/home-battery.svg" alt="" style={{ right: 27.4, top: 18, width: 26.603, height: 12.5 }} />
      <img src="/assets/home-reception.svg" alt="" style={{ right: 84.85, top: 19, width: 18.15, height: 11 }} />
      <img src="/assets/home-lte.svg" alt="" style={{ right: 59.17, top: 20.14, width: 19.463, height: 9.864 }} />
    </div>
  );
}
