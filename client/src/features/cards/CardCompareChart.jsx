import ChartTip from "../../components/ui/ChartTip";
import { currency, periodLabel } from "../../utils/format";
import { compareStatus } from "./domain";

const shortMonth = (month) => new Date(`${month}-01T00:00:00`).toLocaleString("en-IN", { month: "short" });

// One card, last few months: what was logged (outlined bar) next to the bill
// paid for it (filled bar), both in the card's colour, so the two read apart
// by fill rather than by colour. Tapping a month (`tip`) labels its bars and
// shows its numbers underneath; `selected` is the month shown underneath.
export default function CardCompareChart({ rows, selected, tip, onSelect }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.logged, r.paid]));
  const row = rows.find((r) => r.month === selected) || rows[rows.length - 1];
  const status = compareStatus(row);
  // No bar at all for nothing (an outlined bar would still draw its border).
  const bar = (amount) => (amount > 0 ? { height: `${(amount / max) * 100}%` } : { height: 0, visibility: "hidden" });

  return (
    <div className="card cc-compare">
      <div className="cc-compare-legend">
        <span className="cc-legend-item">
          <span className="cc-swatch cc-swatch-logged" /> Logged
        </span>
        <span className="cc-legend-item">
          <span className="cc-swatch cc-swatch-paid" /> Paid
        </span>
      </div>

      <div className="cc-compare-chart" role="group" aria-label="Logged spends and paid bills, last 6 months">
        {rows.map((r, i) => (
          <button
            type="button"
            key={r.month}
            className={`cc-compare-month ${r.month === row.month ? "is-selected" : ""}`}
            aria-pressed={r.month === row.month}
            aria-label={`${periodLabel([r.month])}: logged ${currency(r.logged)}, paid ${currency(r.paid)}`}
            onClick={() => onSelect(r.month)}
          >
            <span className="cc-compare-bars">
              <span className="cc-bar cc-bar-logged" style={bar(r.logged)} />
              <span className="cc-bar cc-bar-paid" style={bar(r.paid)} />
            </span>
            <span className="cc-chart-month-label">{shortMonth(r.month)}</span>
            {tip === r.month && (
              <ChartTip
                index={i}
                count={rows.length}
                lines={[
                  { key: "paid", label: "Paid", value: currency(r.paid), swatch: { background: "var(--bar)" } },
                  { key: "logged", label: "Logged", value: currency(r.logged), swatch: { border: "2px solid var(--bar)" } },
                ]}
              />
            )}
          </button>
        ))}
      </div>

      <div className="cc-compare-summary">
        <div className="cc-compare-figures">
          <strong>{periodLabel([row.month])}</strong>
          <span className="muted">
            Logged {currency(row.logged)} · Paid {currency(row.paid)}
          </span>
        </div>
        <span className={`pill tone-${status.tone}`}>
          {status.amount ? `${currency(status.amount)} ${status.text}` : status.text}
        </span>
      </div>
    </div>
  );
}
