import { Ban, ChevronDown, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { currency, dateHeading, shortDate } from "../../utils/format";
import { REMIND_OPTIONS, daysBetween, monthlyCost, onTrial, renewalLabel, yearlyCost } from "./domain";

const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

const billing = (s) => (s.cycle === "yearly" ? `Yearly on ${s.day} ${MONTHS[s.month - 1]}` : `Monthly on the ${ordinal(s.day)}`);

// One subscription: cost, how it's paid, when it renews; expands to details
// and actions (Edit, Cancel / Restart, Delete).
export default function SubscriptionCard({ subscription: s, today, open, onToggle, onEdit, onCancel, onDelete }) {
  const cancelled = Boolean(s.cancelled_at);
  const trial = !cancelled && onTrial(s, today);
  const days = cancelled ? null : daysBetween(today, s.next);
  const tone = cancelled ? "negative" : trial ? "savings" : days <= 3 ? "warning" : "accent";
  const status = cancelled ? `Cancelled ${shortDate(s.cancelled_at)}` : renewalLabel(s, today);
  const initial = s.name.trim().charAt(0).toUpperCase() || "?";
  const remind = REMIND_OPTIONS.find((o) => o.value === s.remind)?.label ?? "Off";

  return (
    <div className={`card tag-card record-card ${open ? "is-open" : ""}`}>
      <button type="button" className="record-head" aria-expanded={open} onClick={onToggle}>
        <span className={`record-avatar tone-${cancelled ? "negative" : "accent"}`} aria-hidden="true">
          {initial}
        </span>
        <span className="record-text">
          <span className="record-person">{s.name}</span>
          <span className="record-sub subscription-sub">
            <strong>{currency(s.amount)}</strong> · {s.cycle === "yearly" ? "yearly" : "monthly"}
            {s.payment_method && ` · ${s.payment_method}`}
          </span>
          <span className={`pill tone-${tone} recurring-status`}>{status}</span>
        </span>
        <ChevronDown size={18} className="tag-card-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="tag-card-body record-body">
          <dl className="recurring-facts">
            <div>
              <dt>Billing</dt>
              <dd>{billing(s)}</dd>
            </div>
            {!cancelled && (
              <div>
                <dt>{trial ? "First charge" : "Next renewal"}</dt>
                <dd>{dateHeading(s.next)}</dd>
              </div>
            )}
            <div>
              <dt>Costs</dt>
              <dd>
                {s.cycle === "yearly" ? `≈ ${currency(monthlyCost(s))} a month` : `${currency(yearlyCost(s))} a year`}
              </dd>
            </div>
            {s.payment_method && (
              <div>
                <dt>Paid with</dt>
                <dd>{s.payment_method}</dd>
              </div>
            )}
            {s.category && (
              <div>
                <dt>Category</dt>
                <dd>{s.category}</dd>
              </div>
            )}
            {s.trial_end && (
              <div>
                <dt>Free trial</dt>
                <dd>{trial ? `until ${shortDate(s.trial_end)}` : `ended ${shortDate(s.trial_end)}`}</dd>
              </div>
            )}
            {!cancelled && (
              <div>
                <dt>Reminder</dt>
                <dd>{s.remind === "off" ? "Off" : `${remind}, 9 AM`}</dd>
              </div>
            )}
          </dl>

          <div className="button-row">
            <button type="button" className="btn btn-soft btn-block" onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`}>
              <Pencil size={18} /> Edit
            </button>
            <button type="button" className="btn btn-danger-ghost btn-block" onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`}>
              <Trash2 size={18} /> Delete
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => onCancel(s, !cancelled)}>
            {cancelled ? <RotateCcw size={18} /> : <Ban size={18} />}
            {cancelled ? "Restart subscription" : "Cancel subscription"}
          </button>
        </div>
      )}
    </div>
  );
}
