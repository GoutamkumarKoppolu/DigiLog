import { useEffect, useState } from "react";
import ColumnChart from "../../components/ui/ColumnChart";
import InfoButton from "../../components/ui/InfoButton";
import { fetchTransactions } from "../../api";
import { useLedger } from "../ledger";
import { ledgerMonth } from "../../domain/salary";
import { currency, monthLabel } from "../../utils/format";
import { averageRate, monthlyTrend } from "./domain";

// Fixed chart order (--cat-1..3), the same in the legend, bars and tip.
const SERIES = [
  { key: "income", label: "Income", color: "var(--cat-1)" },
  { key: "expenses", label: "Expenses", color: "var(--cat-2)" },
  { key: "saved", label: "Saved", color: "var(--cat-3)" },
];

const pct = (rate) => `${Math.round(rate * 100)}%`;

// Top of the Report: how much of `month`'s income was kept (not spent), the
// 12-month average, and income / expenses / saved for each of those months.
export default function SavingsRateCard({ month }) {
  const { transactions: ledgerVersion } = useLedger();
  const [rows, setRows] = useState(null);

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
  const trend = monthlyTrend(rows, month, ledgerMonth);
  const focus = trend[trend.length - 1];
  const average = averageRate(trend);
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

      <ColumnChart
        label="Income, expenses and saved for the last 12 months"
        series={SERIES}
        columns={trend.map((m) => ({
          key: m.month,
          label: monthLabel(m.month, "short").slice(0, 3),
          title: monthLabel(m.month),
          values: m,
          extra: [{ key: "rate", label: "Kept", value: m.rate == null ? "–" : pct(m.rate) }],
        }))}
      />
    </section>
  );
}
