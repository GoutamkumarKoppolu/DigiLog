import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Info, Plus, Repeat } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ErrorBanner from "../../components/ui/ErrorBanner";
import FormSheet from "../../components/ui/FormSheet";
import Money from "../../components/ui/Money";
import { useLedger } from "../ledger";
import { currency, today as todayDate } from "../../utils/format";
import {
  createRecurring,
  deleteRecurring,
  fetchRecurringData,
  runDueRecurring,
  setCompleted,
  setPaused,
  setSkipped,
  updateRecurring,
} from "./api";
import { monthStatus, monthTotals, progress, salaryMonths } from "./domain";
import RecurringCard from "./RecurringCard";
import RecurringForm from "./RecurringForm";

const FORM_ID = "recurring-form";

// Sections by this month's state, in page order.
const SECTIONS = [
  { title: "Coming up", states: ["due", "waiting"] },
  { title: "Deducted this month", states: ["deducted"] },
  { title: "Not this month", states: ["starts", "skipped", "paused", "removed"] },
];

// Recurring payments (EMIs, rent, SIPs). Each becomes a normal transaction
// once the month's Salary is in and its day comes (see RecurringEngine).
// Reloads when the ledger changes, e.g. after a payment was just added.
export default function RecurringPage() {
  const { transactions: ledgerVersion, refresh: refreshLedger, tags, options } = useLedger();
  const [data, setData] = useState({ items: [], runs: [], transactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sheet, setSheet] = useState(null); // null | { entry? }
  const today = todayDate();

  const load = useCallback(
    () =>
      fetchRecurringData()
        .then(setData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load, ledgerVersion]);

  // The engine keeps quiet about failures (it runs on every page); this page
  // runs the same check so a problem, e.g. a deleted transaction type, shows.
  useEffect(() => {
    runDueRecurring(todayDate()).catch((e) => setError(`Couldn't add due payments: ${e.message}`));
  }, []);

  // After any change, add whatever is now due, then refresh everything
  // (the ledger refresh also reloads this page).
  async function run(action) {
    try {
      setError("");
      await action();
      await runDueRecurring(todayDate());
      await load();
      refreshLedger();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }

  const txById = new Map(data.transactions.map((t) => [t.id, t]));
  const salarySet = salaryMonths(data.transactions);
  const entries = data.items
    .map((item) => {
      const prog = progress(item, data.runs, txById);
      return { item, prog, status: monthStatus(item, prog, salarySet, today) };
    })
    .sort((a, b) => a.item.day - b.item.day || a.item.name.localeCompare(b.item.name));
  const totals = monthTotals(entries.map((e) => e.status));
  const salaryIn = salarySet.has(today.slice(0, 7));
  const completed = entries.filter((e) => e.status.state === "completed");

  async function handleSave(form) {
    const editing = sheet.entry;
    let saved;
    const ok = await run(async () => (saved = editing ? await updateRecurring(editing.item.id, form) : await createRecurring(form, todayDate())));
    if (ok) {
      setSheet(null);
      setOpenId(saved.id);
    }
  }

  function handleDelete({ item, prog }) {
    const kept = prog.paidCount ? ` The ${prog.paidCount} payment${prog.paidCount === 1 ? "" : "s"} already added stay in your transactions.` : "";
    if (window.confirm(`Delete "${item.name}"? Nothing more will be deducted.${kept}`)) {
      run(() => deleteRecurring(item.id)).then((ok) => ok && setSheet(null));
    }
  }

  function handleSetCompleted(item, value) {
    const text = value
      ? `Mark "${item.name}" as completed? Nothing more will be deducted when your salary comes in.`
      : `Reopen "${item.name}"? It will be deducted again from its next date.`;
    if (window.confirm(text)) run(() => setCompleted(item.id, value, todayDate()));
  }

  const card = (entry) => (
    <RecurringCard
      key={entry.item.id}
      entry={entry}
      today={today}
      open={openId === entry.item.id}
      onToggle={() => setOpenId(openId === entry.item.id ? null : entry.item.id)}
      onEdit={(e) => {
        setError("");
        setSheet({ entry: e });
      }}
      onDelete={handleDelete}
      onSetCompleted={handleSetCompleted}
      onSetPaused={(item, value) => run(() => setPaused(item.id, value))}
      onSetSkipped={(item, month, value) => run(() => setSkipped(item.id, month, value))}
    />
  );

  return (
    <>
      <PageHeader title="Recurring" subtitle="Added when your salary comes in" info="recurring" />
      <div className="page-body">
        {!sheet && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        <p className="callout">
          <Info size={16} aria-hidden="true" />
          <span>
            Recorded for you on their day, once you add the month&apos;s earning tagged <strong>Salary</strong>. Don&apos;t add them on Home
            yourself, even if you pay by hand.
          </span>
        </p>

        {entries.length > 0 && (
          <div className="card savings-summary">
            <span className="muted">Coming up this month</span>
            <div className="savings-summary-amount">
              <Money value={totals.upcoming} className="big-amount" />
            </div>
            <div className="mini-stats">
              <div>
                <span className="muted">Deducted this month</span>
                <strong>{currency(totals.deducted)}</strong>
              </div>
              <div>
                <span className="muted">This month's salary</span>
                <strong className={salaryIn ? "text-positive" : ""}>{salaryIn ? "Received" : "Not added yet"}</strong>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            setError("");
            setSheet({});
          }}
        >
          <Plus size={18} /> Add recurring payment
        </button>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState icon={Repeat}>
            No recurring payments yet. Add your EMIs, rent or SIPs, and they&apos;ll be added for you each month once your
            Salary is in.
          </EmptyState>
        ) : (
          <>
            {SECTIONS.map((s) => {
              const list = entries.filter((e) => s.states.includes(e.status.state));
              if (!list.length) return null;
              return (
                <section key={s.title} className="tag-section">
                  <div className="section-head">
                    <h2>{s.title}</h2>
                  </div>
                  <div className="budget-list">{list.map(card)}</div>
                </section>
              );
            })}

            {completed.length > 0 && (
              <>
                <button
                  type="button"
                  className={`section-toggle ${showCompleted ? "is-open" : ""}`}
                  aria-expanded={showCompleted}
                  onClick={() => setShowCompleted((v) => !v)}
                >
                  <span>Completed ({completed.length})</span>
                  <ChevronDown size={18} />
                </button>
                {showCompleted && <div className="budget-list">{completed.map(card)}</div>}
              </>
            )}
          </>
        )}
      </div>

      {sheet && (
        <FormSheet
          title={sheet.entry ? "Edit recurring payment" : "Add recurring payment"}
          formId={FORM_ID}
          submitLabel={sheet.entry ? "Save changes" : "Save"}
          error={error}
          onClose={() => {
            setSheet(null);
            setError("");
          }}
          onDelete={sheet.entry ? () => handleDelete(sheet.entry) : null}
        >
          <RecurringForm
            id={FORM_ID}
            item={sheet.entry?.item}
            prog={sheet.entry?.prog}
            tags={tags}
            paymentMethods={options["payment-methods"]}
            paymentSources={options["payment-sources"]}
            onSubmit={handleSave}
          />
        </FormSheet>
      )}
    </>
  );
}
