import { ChevronDown, CircleCheck, Pause, Pencil, PiggyBank, Play, Repeat, RotateCcw, SkipForward, Trash2, Undo2 } from "lucide-react";
import { currency, monthLabel, shortDate } from "../../utils/format";
import { lastPaymentMonth } from "./domain";

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// This month's state as a short label and a tone.
const STATUS = {
  deducted: (s) => [`Deducted on ${shortDate(s.date)}`, "positive"],
  // A due day that has passed means the balance couldn't cover it yet.
  due: (s, today) => (s.date <= today ? [`Not enough balance · due ${shortDate(s.date)}`, "negative"] : [`Due on ${shortDate(s.date)}`, "warning"]),
  waiting: (s) => [`Waiting for salary · ${shortDate(s.date)}`, "accent"],
  removed: (s, today, name) => [`Deleted for ${name}`, "negative"],
  starts: (s) => [`Starts ${shortDate(s.date)}`, "accent"],
  skipped: (s, today, name) => [`Skipped for ${name}`, "accent"],
  paused: () => ["Paused", "warning"],
  completed: () => ["Completed", "positive"],
};

// One recurring payment: what it is, where it stands in `month` (the one on
// show), progress;
// expands to details, month-by-month history and actions.
export default function RecurringCard({ entry, today, month, open, onToggle, onEdit, onDelete, onSetCompleted, onSetPaused, onSetSkipped }) {
  const { item, prog, status } = entry;
  const monthName = monthLabel(month).split(" ")[0];
  const [label, tone] = STATUS[status.state](status, today, monthName);
  const Icon = item.kind === "saving" ? PiggyBank : Repeat;
  const total = prog.remaining != null ? prog.paid + prog.remaining : item.duration;
  const done = prog.remaining != null ? prog.paid : prog.paidCount;
  const share = total ? Math.min(1, done / total) : null;
  const last = lastPaymentMonth(item, prog, today);
  const isSaving = item.kind === "saving";
  const canSkip = isSaving && !item.paused && !prog.completed && ["due", "waiting", "skipped"].includes(status.state);

  return (
    <div className={`card tag-card record-card ${open ? "is-open" : ""}`}>
      <button type="button" className="record-head" aria-expanded={open} onClick={onToggle}>
        <span className={`icon-badge ${isSaving ? "tone-savings" : "tone-negative"}`}>
          <Icon size={18} />
        </span>
        <span className="record-text">
          <span className="record-person">{item.name}</span>
          <span className="record-sub">
            <strong>{currency(item.amount)}</strong> · every {ordinal(item.day)}
          </span>
          <span className={`pill tone-${tone} recurring-status`}>{label}</span>
        </span>
        <ChevronDown size={18} className="tag-card-chevron" aria-hidden="true" />
        {share != null && (
          <span className="bar-track record-bar">
            <span className="bar-fill" style={{ width: `${share * 100}%`, background: prog.completed ? "var(--positive)" : "var(--accent)" }} />
          </span>
        )}
      </button>

      {open && (
        <div className="tag-card-body record-body">
          <dl className="recurring-facts">
            <div>
              <dt>Tag</dt>
              <dd>{item.tag}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{isSaving ? (item.deduct_from_balance === false ? "Saving · not from balance" : "Saving · from balance") : "Expense"}</dd>
            </div>
            {(item.payment_method || item.payment_source) && (
              <div>
                <dt>Paid with</dt>
                <dd>{[item.payment_method, item.payment_source].filter(Boolean).join(" · ")}</dd>
              </div>
            )}
            {prog.remaining != null && (
              <div>
                <dt>Pending balance</dt>
                <dd>
                  {currency(prog.remaining)} <span className="muted">· {currency(prog.paid)} paid</span>
                </dd>
              </div>
            )}
            {prog.left != null && (
              <div>
                <dt>Payments left</dt>
                <dd>
                  {prog.left} <span className="muted">· {prog.paidCount} of {item.duration} made</span>
                </dd>
              </div>
            )}
            {last && (
              <div>
                <dt>Last payment</dt>
                <dd>around {monthLabel(last)}</dd>
              </div>
            )}
          </dl>

          {prog.history.length > 0 && <span className="muted recurring-history-head">Deducted so far</span>}
          {prog.history.length > 0 ? (
            <div className="tag-card-rows">
              {prog.history.map((r) => (
                <div className="tx-row recurring-history" key={r.id}>
                  <span className="record-payment-date">{monthLabel(r.month, "short")}</span>
                  <span className="tx-main">
                    <span className="tx-title">{r.transaction ? shortDate(r.transaction.date) : "Deleted"}</span>
                  </span>
                  <span className={`tx-amount ${r.transaction ? "" : "muted"}`}>{r.transaction ? currency(r.transaction.amount) : "—"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted record-empty">Nothing deducted yet.</p>
          )}

          {isSaving && !prog.completed && (
            <div className="button-row">
              <button type="button" className="btn btn-soft btn-block" onClick={() => onSetPaused(item, !item.paused)}>
                {item.paused ? <Play size={18} /> : <Pause size={18} />} {item.paused ? "Resume" : "Pause"}
              </button>
              {canSkip && (
                <button type="button" className="btn btn-soft btn-block" onClick={() => onSetSkipped(item, month, status.state !== "skipped")}>
                  {status.state === "skipped" ? <Undo2 size={18} /> : <SkipForward size={18} />}
                  {status.state === "skipped" ? "Undo skip" : `Skip ${monthName}`}
                </button>
              )}
            </div>
          )}

          <div className="button-row">
            <button type="button" className="btn btn-soft btn-block" onClick={() => onEdit(entry)} aria-label={`Edit ${item.name}`}>
              <Pencil size={18} /> Edit
            </button>
            <button type="button" className="btn btn-danger-ghost btn-block" onClick={() => onDelete(entry)} aria-label={`Delete ${item.name}`}>
              <Trash2 size={18} /> Delete
            </button>
          </div>

          {prog.finished ? (
            <p className="muted record-empty">
              Finished by itself. To continue it, edit the pending balance or payments left.
            </p>
          ) : (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => onSetCompleted(item, !item.completed)}>
              {item.completed ? <RotateCcw size={18} /> : <CircleCheck size={18} />}
              {item.completed ? "Reopen" : "Mark as completed"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
