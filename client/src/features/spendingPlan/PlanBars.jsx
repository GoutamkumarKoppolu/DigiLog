import { useState } from "react";
import { currency, monthLabel } from "../../utils/format";
import PlanSheet from "./PlanSheet";
import { useSpendingPlan } from "./useSpendingPlan";

// One tag's bar: how much of what was set aside is spent. Red from 95%.
function PlanBar({ r }) {
  const pct = Math.round(r.share * 100);
  return (
    <div className="plan-bar">
      <div className="plan-bar-head">
        <span className="plan-bar-tag">{r.tag}</span>
        <span className={r.red ? "text-negative" : "muted"}>{pct}%</span>
      </div>
      <div className="bar-track bar-track-lg" role="progressbar" aria-label={`${r.tag} spent`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: r.red ? "var(--negative)" : r.color }} />
      </div>
      <span className={`plan-bar-sub ${r.left < 0 ? "text-negative" : "muted"}`}>
        {r.left < 0
          ? `Over by ${currency(-r.left)}, taken from your free money`
          : `${currency(r.spent)} of ${currency(r.amount)} · ${currency(r.left)} left`}
      </span>
    </div>
  );
}

// Under "Your money" on Home: a bar per tag of the month's spending plan, or
// a way to start one.
export default function PlanBars() {
  const plan = useSpendingPlan();
  const [open, setOpen] = useState(false);
  if (!plan) return null;
  const name = monthLabel(plan.month).split(" ")[0];

  return (
    <>
      {plan.rows.length ? (
        <section className="card plan-bars">
          <div className="plan-bars-head">
            <h3>{name} plan</h3>
            <button type="button" className="link-btn" onClick={() => setOpen(true)}>
              Edit
            </button>
          </div>
          {plan.rows.map((r) => (
            <PlanBar key={r.id} r={r} />
          ))}
        </section>
      ) : (
        <button type="button" className="link-btn plan-bars-start" onClick={() => setOpen(true)}>
          Set money aside for {name}
        </button>
      )}
      {open && <PlanSheet onClose={() => setOpen(false)} />}
    </>
  );
}
