import { ChevronDown, CircleCheck, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { currency, shortDate } from "../../utils/format";
import ContactButtons from "./ContactButtons";
import { linkLabel } from "./domain";

// One borrowing/lending: who, what's left and progress; expands to the note,
// phone, every payment (with where its money went) and the actions.
export default function RecordCard(props) {
  const { record, meta, open, onToggle, onAddPayment, onOpenPayment, onDeletePayment, onEdit, onDelete, onToggleCompleted } = props;
  const share = record.amount ? Math.min(1, record.paid / record.amount) : 0;
  const panelId = `record-${record.id}`;
  const initial = record.person.trim().charAt(0).toUpperCase() || "?";

  return (
    <div id={`record-card-${record.id}`} className={`card tag-card record-card ${open ? "is-open" : ""}`}>
      <button type="button" className="record-head" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className={`record-avatar ${record.completed ? "tone-positive" : "tone-accent"}`} aria-hidden="true">
          {initial}
        </span>
        <span className="record-text">
          <span className="record-person">{record.person}</span>
          <span className="record-sub">
            {record.completed ? (
              <>
                <CircleCheck size={13} aria-hidden="true" /> Completed
                {!record.fullyPaid && ` · ${currency(record.remaining)} let go`}
              </>
            ) : (
              <>
                <strong>{currency(record.remaining)}</strong> left of {currency(record.amount)}
              </>
            )}
          </span>
        </span>
        <ChevronDown size={18} className="tag-card-chevron" aria-hidden="true" />
        <span className="bar-track record-bar">
          <span className="bar-fill" style={{ width: `${share * 100}%`, background: record.completed ? "var(--positive)" : "var(--accent)" }} />
        </span>
      </button>

      {open && (
        <div id={panelId} className="tag-card-body record-body">
          <div className="record-facts">
            <span className="muted">
              {meta.personLabel} {record.person} on {shortDate(record.date)} {record.date.slice(0, 4)} · {currency(record.amount)}
              {record.linked_to && ` ${linkLabel(record, meta.recordFlow)}`}
            </span>
            {record.note && <p className="record-note">{record.note}</p>}
          </div>

          {record.phone && <ContactButtons phone={record.phone} person={record.person} />}

          {record.payments.length > 0 ? (
            <div className="tag-card-rows">
              {record.payments.map((p) => (
                <div className="split-row" key={p.id}>
                  <button type="button" className="split-row-tap record-payment" onClick={() => onOpenPayment(record, p)}>
                    <span className="record-payment-date">{shortDate(p.date)}</span>
                    <span className="tx-main">
                      <span className="tx-title">{meta.payment}</span>
                      {(p.linked_to || p.note) && (
                        <span className="tx-sub">{[linkLabel(p, meta.paymentFlow), p.note].filter(Boolean).join(" · ")}</span>
                      )}
                    </span>
                    <span className="tx-amount text-positive">{currency(p.amount)}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => onDeletePayment(p)}
                    aria-label={`Delete ${currency(p.amount)} on ${shortDate(p.date)}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted record-empty">No payments yet.</p>
          )}

          {!record.fullyPaid && (
            <button type="button" className="btn btn-primary btn-block" onClick={() => onAddPayment(record)}>
              <Plus size={18} /> {meta.addPayment}
            </button>
          )}
          <div className="button-row">
            <button type="button" className="btn btn-soft btn-block" onClick={() => onEdit(record)} aria-label={`Edit ${record.person}`}>
              <Pencil size={18} /> Edit
            </button>
            <button
              type="button"
              className="btn btn-danger-ghost btn-block"
              onClick={() => onDelete(record)}
              aria-label={`Delete ${record.person}`}
            >
              <Trash2 size={18} /> Delete
            </button>
          </div>
          {!record.fullyPaid && (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => onToggleCompleted(record)}>
              {record.completed ? <RotateCcw size={18} /> : <CircleCheck size={18} />}
              {record.completed ? "Reopen" : "Mark as completed"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
