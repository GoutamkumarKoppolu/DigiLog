import { useEffect, useState } from "react";
import { CalendarDays, Search, Tags } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ErrorBanner from "../../components/ui/ErrorBanner";
import PeriodSheet from "../../components/PeriodSheet";
import { fetchTransactions } from "../../api";
import { useLedger } from "../ledger";
import { currency, periodLabel } from "../../utils/format";
import { groupByKindAndTag } from "./domain";
import TagCard from "./TagCard";

// Every tag across months, grouped Expenses → Savings → Income. Defaults to
// all time (independent of Home's filters) so a tag like "Car loan" shows
// all its EMIs. Reloads when the ledger changes.
export default function TagsPage({ navigate, onOpenTransaction }) {
  const { transactions: ledgerVersion } = useLedger();
  const [months, setMonths] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [openKey, setOpenKey] = useState("");
  const [showPeriod, setShowPeriod] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchTransactions({ months })
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [months, ledgerVersion]);

  const sections = groupByKindAndTag(rows, search);

  return (
    <>
      <PageHeader title="Tags" subtitle={`${periodLabel(months)} · grouped by type`} info="tags" onBack={() => navigate("more")} />
      <div className="page-body">
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            autoComplete="off"
            className="input"
            placeholder="Search tags"
            aria-label="Search tags"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button type="button" className="period-button" onClick={() => setShowPeriod(true)}>
          <CalendarDays size={16} /> {periodLabel(months)}
        </button>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : sections.length ? (
          sections.map((section) => (
            <section key={section.kind} className="tag-section">
              <div className="section-head">
                <h2>{section.title}</h2>
                <span className="muted">
                  {section.tags.length} {section.tags.length === 1 ? "tag" : "tags"} · {currency(section.total)}
                </span>
              </div>
              <div className="tag-list">
                {section.tags.map((summary) => {
                  const key = `${section.kind}:${summary.tag}`;
                  return (
                    <TagCard
                      key={key}
                      kind={section.kind}
                      summary={summary}
                      open={openKey === key}
                      onToggle={() => setOpenKey(openKey === key ? "" : key)}
                      onOpenTransaction={onOpenTransaction}
                    />
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <EmptyState icon={Tags}>
            {search ? `No tags match "${search}".` : `No transactions for ${periodLabel(months).toLowerCase()}.`}
          </EmptyState>
        )}
      </div>

      {showPeriod && <PeriodSheet selectedMonths={months} onChange={setMonths} onClose={() => setShowPeriod(false)} />}
    </>
  );
}
