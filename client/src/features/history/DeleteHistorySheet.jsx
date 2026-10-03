import { useEffect, useState } from "react";
import { CircleCheck, DatabaseBackup, Trash2, TriangleAlert } from "lucide-react";
import BottomSheet from "../../components/ui/BottomSheet";
import ErrorBanner from "../../components/ui/ErrorBanner";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { useLedger } from "../ledger";
import { currency, monthLabel, shortDate } from "../../utils/format";
import { balanceBlockMessage, deleteHistory, fetchHistoryMonths, previewHistoryDelete, shortPotMessage } from "./api";

const SCOPES = [
  { value: "all", label: "Whole history" },
  { value: "month", label: "One month" },
];
const CONFIRM_WORD = "DELETE";

const signed = (n) => `${n > 0 ? "+" : "−"}${currency(Math.abs(n))}`;

// What will go: counts, totals, and how each savings pot changes.
function Preview({ plan }) {
  const rows = [
    ["Transactions", plan.transactions.length],
    ["Income", currency(plan.totals.earnings)],
    ["Expenses", currency(plan.totals.expenses)],
    ["Saved", currency(plan.totals.savings)],
    ["Savings used", plan.withdrawals.length],
    ...plan.pots.map((p) => [`"${p.tag}" savings`, signed(p.amount)]),
  ];
  return (
    <div className="card card-list backup-counts">
      {rows.map(([label, value]) => (
        <div className="backup-count-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

// More → Delete history: the whole money history or one month of it.
export default function DeleteHistorySheet({ navigate, onClose }) {
  const { refresh } = useLedger();
  const [scope, setScope] = useState("all");
  const [month, setMonth] = useState("");
  const [months, setMonths] = useState([]);
  const [plan, setPlan] = useState(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  const target = scope === "all" ? "" : month;
  const ready = scope === "all" || month;

  useEffect(() => {
    fetchHistoryMonths().then(setMonths).catch((e) => setError(e.message));
  }, [done]);

  useEffect(() => {
    if (!ready) return;
    previewHistoryDelete(target)
      .then(setPlan)
      .catch((e) => setError(e.message));
  }, [ready, target, done]);

  async function handleDelete() {
    try {
      setBusy(true);
      setError("");
      const deleted = await deleteHistory(target);
      refresh();
      setDone(deleted);
      setMonth("");
      setTyped("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;
  const shown = ready && plan?.month === target ? plan : null;
  const canDelete = shown && !shown.empty && !shown.shortPot && !(shown.balanceShort > 0) && (scope === "month" || confirmed) && !busy;
  const what = scope === "all" ? "everything" : month ? monthLabel(month) : "month";
  // The DELETE box can be below the fold, so the button says why it's off.
  const needsWord = scope === "all" && shown && !shown.empty && !confirmed;
  const buttonLabel = busy ? "Deleting…" : needsWord ? `Type ${CONFIRM_WORD} to delete` : `Delete ${what}`;

  return (
    <BottomSheet
      title="Delete history"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-danger btn-block" onClick={handleDelete} disabled={!canDelete}>
          <Trash2 size={18} /> {buttonLabel}
        </button>
      }
    >
      <ErrorBanner message={error} />
      {done && (
        <div className="success-note" role="status">
          <CircleCheck size={20} aria-hidden="true" />
          <p>
            Deleted {done.month ? monthLabel(done.month) : "your whole history"}: {done.transactions.length} transactions and{" "}
            {done.withdrawals.length} savings {done.withdrawals.length === 1 ? "use" : "uses"}.
          </p>
        </div>
      )}

      <SegmentedControl label="What to delete" options={SCOPES} value={scope} onChange={setScope} />

      {scope === "month" && (
        <div className="field">
          <span className="field-label">Month</span>
          {months.length ? (
            <div className="chip-group" role="radiogroup" aria-label="Month">
              {months.map((m) => (
                <button
                  type="button"
                  key={m}
                  role="radio"
                  aria-checked={month === m}
                  className={`chip ${month === m ? "is-active" : ""}`}
                  onClick={() => setMonth(m)}
                >
                  {monthLabel(m, "short")}
                </button>
              ))}
            </div>
          ) : (
            <p className="field-hint">There's no history to delete.</p>
          )}
        </div>
      )}

      {shown && (shown.empty ? <p className="field-hint">Nothing to delete{target ? ` in ${what}` : ""}.</p> : <Preview plan={shown} />)}

      {shown && !shown.empty && (
        <>
          {shown.pots.length > 0 && (
            <p className="field-hint">
              Savings added and used {target ? `in ${what}` : "so far"} are deleted too, so your savings pots change as shown.
            </p>
          )}
          {shown.laterUses.length > 0 && (
            <div className="warning-note">
              <TriangleAlert size={18} aria-hidden="true" />
              <p>
                So no savings pot goes below zero, {shown.laterUses.length} other{" "}
                {shown.laterUses.length === 1 ? "use" : "uses"} of that money{" "}
                {shown.laterUses.length === 1 ? "is" : "are"} deleted too:{" "}
                {shown.laterUses.map((w) => `${currency(w.amount)} from "${w.tag}" on ${shortDate(w.date)}`).join(", ")}.
              </p>
            </div>
          )}
          {shown.shortPot && <ErrorBanner message={shortPotMessage(shown)} />}
          {shown.balanceShort > 0 && <ErrorBanner message={balanceBlockMessage(shown)} />}
          {shown.keptMovements.length > 0 && (
            <div className="warning-note">
              <TriangleAlert size={18} aria-hidden="true" />
              <p>
                {shown.keptMovements.length} Borrowed & lent {shown.keptMovements.length === 1 ? "entry" : "entries"}
                {target ? ` in ${what}` : ""} stay and still change your balance or savings. Adjust them on Borrowed & lent if your
                balance should change too.
              </p>
            </div>
          )}
          <div className="warning-note">
            <DatabaseBackup size={18} aria-hidden="true" />
            <div>
              <p>This can't be undone. Recurring payments already added aren't added again. Make a backup first if you might need it.</p>
              <button type="button" className="btn btn-soft" onClick={() => {
                  onClose();
                  navigate("backup");
                }}>
                Back up first
              </button>
            </div>
          </div>
          {scope === "all" && (
            <div className="field">
              <label className="field-label" htmlFor="delete-history-confirm">
                Type {CONFIRM_WORD} to confirm
              </label>
              <input
                id="delete-history-confirm"
                className="input"
                autoComplete="off"
                autoCapitalize="characters"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}
