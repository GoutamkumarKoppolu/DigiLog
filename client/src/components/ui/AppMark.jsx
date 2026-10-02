import { useId } from "react";

// The DigiLog mark ("Rupee trail"): a ₹ drawn as strokes (two bars, the
// bowl and the leg), leaving a trail of three fading dots. Drawn on a
// 108-unit square like Android's adaptive icon, inside its safe zone.
// The same shapes are in android/.../drawable/ic_digilog_foreground.xml.
const RUPEE = "M44 31H72M44 43H72M48 31H56A12 12 0 0 1 56 55H48M50 55L71 77";
const TRAIL = [
  { cx: 37, r: 4.2, opacity: 0.9 },
  { cx: 29.5, r: 3.2, opacity: 0.6 },
  { cx: 23.5, r: 2.3, opacity: 0.35 },
];

// `tile`: on the brand-green rounded square (the app icon); otherwise just
// the mark in the current text colour.
export default function AppMark({ size = 24, tile = false, className = "" }) {
  const gradient = useId();
  const ink = tile ? "#fff" : "currentColor";
  return (
    <svg className={className} width={size} height={size} viewBox={tile ? "0 0 108 108" : "20 26 58 56"} aria-hidden="true">
      {tile && (
        <>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--brand-from)" }} />
              <stop offset="1" style={{ stopColor: "var(--brand-to)" }} />
            </linearGradient>
          </defs>
          <rect width="108" height="108" rx="24" fill={`url(#${gradient})`} />
        </>
      )}
      <path d={RUPEE} fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {TRAIL.map((d) => (
        <circle key={d.cx} cx={d.cx} cy="55" r={d.r} fill={ink} opacity={d.opacity} />
      ))}
    </svg>
  );
}
