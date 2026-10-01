import { CircleCheck, Repeat } from "lucide-react";
import BottomSheet from "../../components/ui/BottomSheet";
import Money from "../../components/ui/Money";
import { currency, monthLabel, shortDate } from "../../utils/format";
import { useMonthPlan } from "./useMonthPlan";

const STATE_PILL = {
  due: { tone: "accent", text: "Upcoming" },
  waiting: { tone: "warning", text: "Waiting for salary" },
  deducted: { tone: "positive", text: "Paid" },
};

const monthName = (month) => monthLabel(month).split(" ")[0];

// One "label …… ₹amount" line; `text` replaces the amount.
function Line({ label, value, text, strong = false, minus = false }) {
  return (
    <div className={`plan-line ${strong ? "is-total" : ""}`}>
      <span>{label}</span>
      <span className={text ? "muted" : ""}>{text ?? `${minus && value > 0 ? "−" : ""}${currency(value)}`}</span>
    </div>
  );
}

// "<Month> at glance": usable balance (what's left to spend now), usable
// salary (what's left of the salary after this month's recurring payments)
// and every payment this month. Opened from Home, and after adding a salary
// (`salaryAdded`).
export default function MonthPlanSheet({ salaryAdded = false, onClose, onOpenRecurring }) {
  const plan = useMonthPlan();
  const name = plan ? monthName(plan.month) : "";

  return (
    <BottomSheet
      title={plan ? `${name} at glance` : "This month at glance"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => {
              onClose();
              onOpenRecurring();
            }}
          >
            <Repeat size={18} /> Open Recurring
          </button>
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      {!plan ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="plan">
          {salaryAdded && (
            <span className="pill tone-positive plan-added">
              <CircleCheck size={14} /> Salary added
            </span>
          )}

          <div className="plan-hero">
            <span className="muted">Usable balance</span>
            <Money value={plan.usableBalance} className="big-amount" />
            <span className="muted">What&apos;s left to spend after this month&apos;s recurring payments.</span>
          </div>

          <div className="card plan-card">
            <Line label="Current balance" value={plan.balance} />
            <Line label="Still to be deducted" value={plan.stillToDeduct} minus />
            <Line label="Usable balance" value={plan.usableBalance} strong />
            {plan.waitingForSalary > 0 && (
              <p className="field-hint plan-note">
                {currency(plan.waitingForSalary)} waiting for your salary isn&apos;t counted here: it comes out of the salary when you add
                it.
              </p>
            )}
          </div>

          <h3 className="plan-heading">Salary</h3>
          <div className="card plan-card">
            {plan.salary == null ? (
              <>
                <Line label={`${name} salary`} text="Not added yet" />
                <p className="field-hint plan-note">
                  Add an earning tagged <strong>Salary</strong>. {currency(plan.total)} of recurring payments will come out of it.
                </p>
              </>
            ) : (
              <>
                <Line label={`${name} salary`} value={plan.salary} />
                <Line label="Recurring this month" value={plan.total} minus />
                <Line label="Usable salary" value={plan.usableSalary} strong />
              </>
            )}
          </div>

          <h3 className="plan-heading">Recurring this month</h3>
          {plan.rows.length ? (
            <div className="card card-list">
              {plan.rows.map((r) => (
                <div className="tx-row" key={r.id}>
                  <span className="tx-main">
                    <span className="tx-title">{r.name}</span>
                    <span className="tx-sub">{[shortDate(r.date), r.kind === "saving" && "Saving"].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="plan-row-end">
                    <span className="tx-amount">{currency(r.amount)}</span>
                    <span className={`pill tone-${STATE_PILL[r.state].tone}`}>{STATE_PILL[r.state].text}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No recurring payments this month.</p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
