import { useState } from "react";
import ChartTip from "./ChartTip";
import { currency } from "../../utils/format";

// Grouped columns (e.g. one per month) with a legend; tap a column for its
// figures (ChartTip), tap again to hide.
//   series:  [{ key, label, color }] — colors from --cat-1..8, in order
//   columns: [{ key, label (under the column), title (tip), values: { [series key]: number },
//              extra?: [{ key, label, value }] (more tip lines, e.g. a rate) }]
export default function ColumnChart({ series, columns, label }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...columns.flatMap((c) => series.map((s) => c.values[s.key] || 0)));

  return (
    <>
      <div className="cc-legend">
        {series.map((s) => (
          <span className="cc-legend-item" key={s.key}>
            <span className="cc-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="cc-chart column-chart" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }} role="group" aria-label={label}>
        {columns.map((c, i) => (
          <button
            type="button"
            key={c.key}
            className={`cc-chart-month ${tip === c.key ? "is-selected" : ""}`}
            aria-pressed={tip === c.key}
            aria-label={`${c.title}: ${series.map((s) => `${s.label} ${currency(c.values[s.key] || 0)}`).join(", ")}`}
            onClick={() => setTip((t) => (t === c.key ? null : c.key))}
          >
            <span className="cc-chart-bars">
              {series.map((s) => (
                <span key={s.key} className="cc-chart-bar" style={{ height: `${((c.values[s.key] || 0) / max) * 100}%`, background: s.color }} />
              ))}
            </span>
            <span className="cc-chart-month-label">{c.label}</span>
            {tip === c.key && (
              <ChartTip
                title={c.title}
                index={i}
                count={columns.length}
                lines={[
                  ...series.map((s) => ({ key: s.key, label: s.label, value: currency(c.values[s.key] || 0), swatch: { background: s.color } })),
                  ...(c.extra ?? []),
                ]}
              />
            )}
          </button>
        ))}
      </div>
    </>
  );
}
