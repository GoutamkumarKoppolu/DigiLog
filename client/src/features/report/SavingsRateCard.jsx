import { useEffect, useState } from "react";
import ChartTip from "../../components/ui/ChartTip";
import InfoButton from "../../components/ui/InfoButton";
import { fetchTransactions } from "../../api";
import { useLedger } from "../ledger";
import { isSalary, salaryMonth } from "../recurring";
import { currency, monthLabel } from "../../utils/format";
import { averageRate, monthlyTrend } from "./domain";

// Fixed chart order (--cat-1..3), the same in the legend, bars and tip.
const SERIES = [
  { key: "income", label: "Income", color: "var(--cat-1)" },
  { key: "expenses", label: "Expenses", color: "var(--cat-2)" },
  { key: "saved", label: "Saved", color: "var(--cat-3)" },
];

// A salary counts in the month it pays for, so one on 30 Sep is October's.
const monthOf = (t) => (isSalary(t) ? salaryMonth(t.date) : t.date.slice(0, 7));
const pct = (rate) => `${Math.round(rate * 100)}%`;

// Top of the Report: how much of `month`'s income was kept (not spent), the
// 12-month average, and income / expenses / saved for each of those months.
export default function SavingsRateCard({ month }) {
  const { transactions: ledgerVersion } = useLedger();
  const [rows, setRows] = useState(null);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    let live = true;
    fetchTransactions()
      .then((all) => live && setRows(all))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [ledgerVersion]);

  if (!rows) return null;
  const trend = monthlyTrend(rows, month, monthOf);
  const focus = trend[trend.length - 1];
  const average = averageRate(trend);
  const max = Math.max(1, ...trend.flatMap((m) => SERIES.map((s) => m[s.key])));
  const name = monthLabel(month).split(" ")[0];

  return (
    <section className="card savings-rate">
      <span className="muted savings-rate-label">
        Savings rate <InfoButton topic="savingsRate" />
      </span>
      {focus.rate == null ? (
        <p className="savings-rate-headline">No income recorded for {name} yet.</p>
      ) : (
        <p className="savings-rate-headline">
          You kept <strong className={focus.rate < 0 ? "text-negative" : "text-positive"}>{pct(focus.rate)}</strong> of your income in{" "}
          {name}
        </p>
      )}
      <p className="muted savings-rate-sub">
        {focus.rate != null && `${currency(focus.kept)} of ${currency(focus.income)}`}
        {focus.rate != null && average != null && " · "}
        {average != null && `12-month average ${pct(average)}`}
      </p>

      <div className="cc-legend">
        {SERIES.map((s) => (
          <span className="cc-legend-item" key={s.key}>
            <span className="cc-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="cc-chart trend-chart" role="group" aria-label="Income, expenses and saved for the last 12 months">
        {trend.map((m, i) => (
          <button
            type="button"
            key={m.month}
            className={`cc-chart-month ${tip === m.month ? "is-selected" : ""}`}
            aria-pressed={tip === m.month}
            aria-label={`${monthLabel(m.month)}: ${SERIES.map((s) => `${s.label} ${currency(m[s.key])}`).join(", ")}`}
            onClick={() => setTip((t) => (t === m.month ? null : m.month))}
          >
            <span className="cc-chart-bars">
              {SERIES.map((s) => (
                <span key={s.key} className="cc-chart-bar" style={{ height: `${(m[s.key] / max) * 100}%`, background: s.color }} />
              ))}
            </span>
            <span className="cc-chart-month-label">{monthLabel(m.month, "short").split(" ")[0].slice(0, 3)}</span>
            {tip === m.month && (
              <ChartTip
                title={monthLabel(m.month)}
                index={i}
                count={trend.length}
                lines={[
                  ...SERIES.map((s) => ({ key: s.key, label: s.label, value: currency(m[s.key]), swatch: { background: s.color } })),
                  { key: "rate", label: "Kept", value: m.rate == null ? "–" : pct(m.rate) },
                ]}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
