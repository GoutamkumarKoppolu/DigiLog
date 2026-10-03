import { useState } from "react";
import { currency } from "../../utils/format";
import PlanSheet from "./PlanSheet";
import { useSpendingPlan } from "./useSpendingPlan";

// In "<Month> at glance" after a salary is added: the plan so far, and a way
// to set money aside (last month's tags are offered in the sheet).
export default function SetAsideCard() {
  const plan = useSpendingPlan();
  const [open, setOpen] = useState(false);
  if (!plan) return null;

  return (
    <>
      <h3 className="plan-heading">Set money aside</h3>
      <div className="card plan-card">
        {plan.rows.length ? (
          plan.rows.map((r) => (
            <div className="plan-line" key={r.id}>
              <span>{r.tag}</span>
              <span>{currency(r.amount)}</span>
            </div>
          ))
        ) : (
          <p className="field-hint plan-note">
            Split your usable balance across tags like Bills or Shopping, and watch each one fill up on Home.
            {plan.previous.length > 0 && ` Last month: ${plan.previous.map((p) => p.tag).join(", ")}.`}
          </p>
        )}
        <button type="button" className="btn btn-soft btn-block" onClick={() => setOpen(true)}>
          {plan.rows.length ? "Edit" : "Set money aside"}
        </button>
      </div>
      {open && <PlanSheet onClose={() => setOpen(false)} />}
    </>
  );
}
