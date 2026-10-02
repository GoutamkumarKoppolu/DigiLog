import { useId } from "react";

// The DigiLog mark ("Ledger D"): a D with three entry lines cut out of it,
// drawn on a 108-unit square like Android's adaptive icon. One path with
// even-odd fill, so the lines are holes that show whatever is behind them.
// The same path is in android/.../drawable/ic_digilog_foreground.xml.
const MARK_PATH =
  "M30 30H54A24 24 0 0 1 54 78H30Z" +
  "M38 41.5H62A2.5 2.5 0 0 1 62 46.5H38A2.5 2.5 0 0 1 38 41.5Z" +
  "M38 51.5H68A2.5 2.5 0 0 1 68 56.5H38A2.5 2.5 0 0 1 38 51.5Z" +
  "M38 61.5H58A2.5 2.5 0 0 1 58 66.5H38A2.5 2.5 0 0 1 38 61.5Z";

// `tile`: on the brand-green rounded square (the app icon); otherwise just
// the mark in the current text colour.
export default function AppMark({ size = 24, tile = false, className = "" }) {
  const gradient = useId();
  return (
    <svg className={className} width={size} height={size} viewBox={tile ? "0 0 108 108" : "24 24 60 60"} aria-hidden="true">
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
      <path d={MARK_PATH} fillRule="evenodd" fill={tile ? "#fff" : "currentColor"} />
    </svg>
  );
}
