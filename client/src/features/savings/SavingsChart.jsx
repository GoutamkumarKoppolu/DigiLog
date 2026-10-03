import ColumnChart from "../../components/ui/ColumnChart";
import { currency, currentMonth, monthLabel } from "../../utils/format";
import { monthlySavings } from "./domain";

// Fixed chart order (--cat-1..2).
const SERIES = [
  { key: "saved", label: "Saved", color: "var(--cat-1)" },
  { key: "used", label: "Used", color: "var(--cat-2)" },
];

// How much was saved (and used) each month over the last 12 months, for all
// pots or the one picked.
export default function SavingsChart({ savings, withdrawals, movements, tag }) {
  const months = monthlySavings(savings, withdrawals, movements, currentMonth(), 12, tag);
  const now = months[months.length - 1];
  const withSavings = months.filter((m) => m.saved > 0);
  const average = withSavings.length ? withSavings.reduce((s, m) => s + m.saved, 0) / withSavings.length : 0;

  return (
    <section className="card savings-rate">
      <p className="savings-rate-headline">
        <strong className="text-savings">{currency(now.saved)}</strong> saved in {monthLabel(now.month).split(" ")[0]}
      </p>
      {average > 0 && <p className="muted savings-rate-sub">Average {currency(average)} in months you saved</p>}
      <ColumnChart
        label={`Saved and used per month, last 12 months${tag ? `, ${tag}` : ""}`}
        series={SERIES}
        columns={months.map((m) => ({
          key: m.month,
          label: monthLabel(m.month, "short").slice(0, 3),
          title: monthLabel(m.month),
          values: m,
          extra: [{ key: "net", label: "Net", value: currency(m.saved - m.used) }],
        }))}
      />
    </section>
  );
}
