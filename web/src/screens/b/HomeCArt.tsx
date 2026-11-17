// Variant C Home illustrations (Figma 815:687): layered, masked art for the Taking Control and
// Sleep Story cards, the small skill tile and the locked-tile backdrop. Values come straight from Figma.
import type { CSSProperties } from 'react';

const A = '/assets/c/home/';
type Rot = { i: string; pos: [number, number] };
// Shared rotated-layer geometry (cq-based height/width) for Path 3810..3826.
const PQ: [number, number][] = [
  [5.11163, 78.5402], [10.7731, 89.1338], [16.0337, 92.8435], [16.5986, 93.1136], [16.2618, 92.9546], [14.6784, 92.1185],
  [6.35313, 82.1718], [5.57234, 80.0367], [8.14678, 85.7667], [10.9629, 89.3221], [10.9626, 89.3218], [16.2135, 92.9313],
  [16.1175, 92.8846], [13.3736, 91.2958], [6.96515, 83.5697], [6.97527, 83.5911], [6.97521, 83.591],
];
const TC: Rot[] = [
  { i: '123.79% 47.25% -46.01% 39.43%', pos: [-127.752, -128.914] }, { i: '83.35% 15.84% 7.03% 81.05%', pos: [-262.618, -86.805] },
  { i: '60.08% 44.78% -7.69% 44.47%', pos: [-144.086, -62.565] }, { i: '138.03% 69.96% -69.26% 23.2%', pos: [-75.179, -143.746] },
  { i: '33.35% 26.78% 46.01% 68.62%', pos: [-222.329, -34.731] }, { i: '26.41% 2.24% -4.69% 78.6%', pos: [-254.669, -27.505] },
  { i: '52.89% 35.52% 25.63% 53.64%', pos: [-173.796, -55.079] }, { i: '100.98% 55.05% -11.44% 39.1%', pos: [-126.678, -105.165] },
  { i: '61.72% 75.71% 2.15% 9.46%', pos: [-30.646, -64.277] }, { i: '85.51% 3.3% -47.19% 77.1%', pos: [-249.812, -89.055] },
  { i: '107.46% 80.71% -45.95% 7.06%', pos: [-22.865, -111.912] }, { i: '54.19% 24.99% -2.96% 64.11%', pos: [-207.716, -56.435] },
  { i: '94.86% 67.44% -18.21% 27.31%', pos: [-88.477, -98.786] }, { i: '126.12% 37.86% -57.17% 53.88%', pos: [-174.563, -131.346] },
  { i: '129.32% 20.11% -59.15% 65.93%', pos: [-213.621, -134.673] }, { i: '65.5% 60.68% 27.83% 36.2%', pos: [-117.3, -68.211] },
  { i: '165.27% 85.79% -74.94% 9.69%', pos: [-31.407, -172.121] },
];
const SK: Rot[] = [
  { i: '88.56% 61.5% 0.33% 17.78%', pos: [-31.47, -156.751] }, { i: '68.34% 12.64% 26.85% 82.53%', pos: [-146.078, -120.966] },
  { i: '56.7% 57.65% 19.49% 25.62%', pos: [-45.35, -100.367] }, { i: '95.68% 96.83% -11.3% -7.46%', pos: [13.207, -169.355] },
  { i: '43.34% 29.66% 46.34% 63.19%', pos: [-111.841, -76.714] }, { i: '39.87% -8.51% 20.99% 78.71%', pos: [-139.323, -70.574] },
  { i: '53.11% 43.26% 36.15% 39.89%', pos: [-70.597, -94.005] }, { i: '77.16% 73.63% 17.62% 17.26%', pos: [-30.557, -136.569] },
  { i: '57.53% 105.77% 24.41% -28.84%', pos: [51.05, -101.822] }, { i: '69.42% -6.87% -0.26% 76.38%', pos: [-135.195, -122.878] },
  { i: '80.4% 113.55% 0.36% -32.58%', pos: [57.663, -142.302] }, { i: '53.76% 26.87% 21.85% 56.17%', pos: [-99.422, -95.158] },
  { i: '74.09% 92.91% 14.23% -1.08%', pos: [1.906, -131.148] }, { i: '89.73% 46.89% -5.25% 40.25%', pos: [-71.25, -158.817] },
  { i: '91.32% 19.28% -6.24% 59.01%', pos: [-104.44, -161.644] }, { i: '59.42% 82.39% 37.25% 12.76%', pos: [-22.587, -105.166] },
  { i: '109.3% 121.45% -14.14% -28.48%', pos: [50.404, -193.467] },
];

const abs: CSSProperties = { position: 'absolute' };
const masked = (mask: string, size: string, pos?: [number, number]): CSSProperties => ({
  WebkitMaskImage: `url(${A}${mask}.svg)`, maskImage: `url(${A}${mask}.svg)`,
  WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskSize: size, maskSize: size,
  ...(pos ? { WebkitMaskPosition: `${pos[0]}px ${pos[1]}px`, maskPosition: `${pos[0]}px ${pos[1]}px` } : {}),
});
const fill = (src: string) => <img src={`${A}${src}.svg`} alt="" style={{ ...abs, inset: 0, width: '100%', height: '100%', maxWidth: 'none', display: 'block' }} />;

function Rotated({ pre, mask, size, rows }: { pre: string; mask: string; size: string; rows: Rot[] }) {
  return (
    <>
      {rows.map((r, n) => {
        const [p, q] = PQ[n];
        const [t, rt, b, l] = r.i.split(' ');
        return (
          <div key={n} style={{ ...abs, top: t, right: rt, bottom: b, left: l, display: 'flex', alignItems: 'center', justifyContent: 'center', containerType: 'size' }}>
            <div style={{ flex: 'none', height: `hypot(${p}cqw, ${q}cqh)`, width: `hypot(${100 - p}cqw, ${q - 100}cqh)`, transform: 'rotate(-6.92deg)' }}>
              <div style={{ ...masked(mask, size, r.pos), position: 'relative', width: '100%', height: '100%' }}>{fill(`${pre}-${3810 + n}`)}</div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function TakingControlArt() {
  return (
    <div className="hc-art hc-art-tc">
      <div style={{ ...abs, inset: '0 0 -100% 0', ...masked('tc-mask', '324px 208.286px') }}>{fill('tc-base')}</div>
      <Rotated pre="tc" mask="tc-mask" size="324px 208.286px" rows={TC} />
    </div>
  );
}

export function SkillTileArt() {
  return (
    <div className="hc-art hc-art-sk">
      <div style={{ ...abs, inset: 0, ...masked('sk-mask', '177px 177px') }}>{fill('sk-base')}</div>
      <Rotated pre="sk" mask="sk-mask" size="177px 177px" rows={SK} />
    </div>
  );
}

const ST_SIZE = '323.556px 208px';
const ST_PATHS: { i: string; pos: [number, number]; src: string }[] = [
  { i: '40.47% 0.02% -5.75% 49.69%', pos: [-160.79, -84.186], src: 'st-p0' },
  { i: '94.17% 50.3% -5.75% 35.63%', pos: [-115.29, -195.876], src: 'st-p1' },
  { i: '69.23% 0.02% -5.75% 54.53%', pos: [-176.429, -143.995], src: 'st-p2' },
  { i: '84.35% 39.24% -5.7% 39.23%', pos: [-126.93, -175.45], src: 'st-p3' },
  { i: '14.22% 31.29% 56.67% 50%', pos: [-161.778, -29.582], src: 'st-p4' },
];
export function SleepStoryArt() {
  return (
    <div className="hc-art hc-art-st">
      <div style={{ ...abs, inset: 0, ...masked('st-mask', ST_SIZE) }}>{fill('st-base1')}</div>
      <div style={{ ...abs, inset: '0 -7.14% 0 0', ...masked('st-mask', ST_SIZE) }}>{fill('st-base2')}</div>
      <div style={{ ...abs, inset: 0, ...masked('st-mask', ST_SIZE) }}>{fill('st-base3')}</div>
      {ST_PATHS.map((p) => {
        const [t, r, b, l] = p.i.split(' ');
        return <div key={p.src} style={{ ...abs, top: t, right: r, bottom: b, left: l, ...masked('st-mask', ST_SIZE, p.pos) }}>{fill(p.src)}</div>;
      })}
    </div>
  );
}

const LK = [
  ['2.59% 0.01% 68.15% 0', 'lk-0'], ['31.93% 0 4.37% 0', 'lk-1'], ['51.12% 0 0 0', 'lk-2'],
  ['0 2.55% 75.8% 45.82%', 'lk-3'], ['17.01% 0.01% 43% 0', 'lk-4'],
];
export function LockedBackdrop() {
  return (
    <div className="hc-lk-bg">
      {LK.map(([i, src]) => {
        const [t, r, b, l] = i.split(' ');
        return <div key={src} style={{ ...abs, top: t, right: r, bottom: b, left: l }}>{fill(src)}</div>;
      })}
    </div>
  );
}
