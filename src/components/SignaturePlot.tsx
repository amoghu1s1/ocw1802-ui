/* The signature artifact: level curves of xy = c with the flow running along them.
   Hand-built SVG, deterministic, renders fully without JS. Motion is a dashed
   overlay animated with stroke-dashoffset and dies under prefers-reduced-motion. */

const W = 900;
const H = 220;
const XS = 100; // px per math unit (x)
const YS = 42; // px per math unit (y)
const XR = 4.5;
const YR = 2.6;

const sx = (x: number) => W / 2 + x * XS;
const sy = (y: number) => H / 2 - y * YS;

function branch(c: number, positive: boolean): string {
  const xEdge = Math.abs(c) / YR; // smallest |x| where the curve is inside the band
  const from = positive ? xEdge : -XR;
  const to = positive ? XR : -xEdge;
  const pts: string[] = [];
  const N = 56;
  for (let i = 0; i <= N; i++) {
    const x = from + ((to - from) * i) / N;
    pts.push(`${sx(x).toFixed(1)},${sy(c / x).toFixed(1)}`);
  }
  return "M" + pts.join("L");
}

const CURVES = [0.7, 1.4, 2.4, 3.6];
const FLOW = new Set([1.4]);

export function SignaturePlot({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="w-full h-[190px] block">
        {CURVES.flatMap((c) =>
          [-1, 1].map((sign) =>
            [true, false].map((pos) => {
              const d = branch(c * sign, pos);
              const key = `${c}-${sign}-${pos}`;
              const flow = FLOW.has(c);
              return (
                <g key={key}>
                  <path d={d} fill="none" stroke="var(--color-border)" strokeWidth="1" strokeOpacity="0.9" />
                  {flow && (
                    <path
                      d={d}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeOpacity="0.55"
                      className="flow-line"
                      style={{ animationDelay: `${(c * 5 + (pos ? 0 : -8) + (sign > 0 ? 0 : -4)) % 16}s` }}
                    />
                  )}
                </g>
              );
            }),
          ),
        )}
      </svg>
      <p className="absolute bottom-2 left-1 text-[11px] text-text-faint">
        <span className="font-display italic">xy</span> = c: the hyperbolic flow
      </p>
    </div>
  );
}
