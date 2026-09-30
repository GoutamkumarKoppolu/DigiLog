import { useEffect, useState } from "react";
import { CalendarDays, ChartPie } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SegmentedControl from "../../components/ui/SegmentedControl";
import DonutChart from "../../components/ui/DonutChart";
import Money from "../../components/ui/Money";
import EmptyState from "../../components/ui/EmptyState";
import ErrorBanner from "../../components/ui/ErrorBanner";
import PeriodSheet from "../../components/PeriodSheet";
import { fetchTransactions } from "../../api";
import { useLedger } from "../ledger";
import { currency, monthLabel, periodLabel, shiftMonth } from "../../utils/format";
import { breakdownByTag, changePct } from "./domain";

const KINDS = [
  { value: "expense", label: "Expenses", noun: "expenses" },
  { value: "earning", label: "Income", noun: "income" },
  { value: "saving", label: "Savings", noun: "savings" },
];

// Per-tag breakdown for the period picked on Home (shared filter). Ignores
// Home's type/tag filters on purpose: a report shows the whole period.
export default function ReportPage({ navigate }) {
  // `transactions` changes after any ledger mutation (e.g. via the + button),
  // which is the cue to reload this page's own queries.
  const { filters, setFilters, transactions: ledgerVersion } = useLedger();
  const [kind, setKind] = useState("expense");
  const [data, setData] = useState({ rows: [], previousRows: null });
  const [error, setError] = useState("");
  const [showPeriod, setShowPeriod] = useState(false);

  const singleMonth = filters.months.length === 1 ? filters.months[0] : null;
  const previousMonth = singleMonth ? shiftMonth(singleMonth, -1) : null;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchTransactions({ months: filters.months }),
      previousMonth ? fetchTransactions({ months: [previousMonth] }) : null,
    ])
      .then(([rows, previousRows]) => !cancelled && setData({ rows, previousRows }))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [filters.months, previousMonth, ledgerVersion]);

  const meta = KINDS.find((k) => k.value === kind);
  const { total, items } = breakdownByTag(data.rows, kind, data.previousRows);
  // The donut slice tapped, if it's still in this breakdown.
  const [tappedTag, setTappedTag] = useState(null);
  const tapped = items.find((i) => i.tag === tappedTag);

  return (
    <>
      <PageHeader title="Report" subtitle={`${meta.label} by tag`} onBack={() => navigate("more")} />
      <div className="page-body">
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <SegmentedControl label="Report type" options={KINDS} value={kind} onChange={setKind} />

        <button type="button" className="period-button" onClick={() => setShowPeriod(true)}>
          <CalendarDays size={16} /> {periodLabel(filters.months)}
        </button>

        <div className="card report-chart">
          <DonutChart
            label={`Donut chart of ${meta.noun} by tag`}
            segments={items.map((i) => ({ key: i.tag, value: i.amount, color: i.color, label: `${i.tag}: ${currency(i.amount)}` }))}
            selected={tapped?.tag ?? null}
            onSelect={setTappedTag}
          >
            {tapped ? (
              <>
                <span className="donut-caption donut-caption-tag">{tapped.tag}</span>
                <Money value={tapped.amount} className="donut-amount" />
                <span className="donut-caption">{(tapped.share * 100).toFixed(1)}% of total</span>
              </>
            ) : (
              <>
                <span className="donut-caption">Total {meta.noun}</span>
                <Money value={total} className="donut-amount" />
                {items.length > 0 && <span className="donut-caption">Tap a slice for details</span>}
              </>
            )}
          </DonutChart>
        </div>

        <div className="section-head">
          <h2>All {meta.noun}</h2>
          <span className="muted">Total {currency(total)}</span>
        </div>

        {items.length ? (
          <div className="report-list">
            {items.map((i) => {
              const change = changePct(i.amount, i.previous);
              // More spending is bad; more income/savings is good.
              const good = change !== null && (kind === "expense" ? change <= 0 : change >= 0);
              return (
                <div className="card report-item" key={i.tag}>
                  <div className="report-item-head">
                    <span className="report-dot" style={{ background: i.color }} />
                    <span className="report-item-text">
                      <span className="report-item-title">{i.tag}</span>
                      <span className="muted">{(i.share * 100).toFixed(1)}% of total</span>
                    </span>
                    <span className="report-item-figures">
                      <span className="report-item-amount">{currency(i.amount)}</span>
                      {change !== null && (
                        <span className={`pill ${good ? "tone-positive" : "tone-negative"}`}>
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(0)}% vs {monthLabel(previousMonth, "short")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${i.share * 100}%`, background: i.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={ChartPie}>No {meta.noun} recorded for {periodLabel(filters.months).toLowerCase()}.</EmptyState>
        )}
      </div>

      {showPeriod && (
        <PeriodSheet
          selectedMonths={filters.months}
          onChange={(months) => setFilters({ months })}
          onClose={() => setShowPeriod(false)}
        />
      )}
    </>
  );
}
