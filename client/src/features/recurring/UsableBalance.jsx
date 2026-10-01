import { useState } from "react";
import { currency } from "../../utils/format";
import MonthPlanSheet from "./MonthPlanSheet";
import { useMonthPlan } from "./useMonthPlan";

// The "Usable ₹55,000 · See breakup" line under the current balance on Home.
// Hidden when nothing recurring falls in this month (usable = current).
export default function UsableBalance({ navigate }) {
  const plan = useMonthPlan();
  const [open, setOpen] = useState(false);
  if (!plan?.rows.length) return null;

  return (
    <>
      <button type="button" className="hero-usable" onClick={() => setOpen(true)}>
        Usable {currency(plan.usableBalance)} · <span className="hero-usable-link">See breakup</span>
      </button>
      {open && <MonthPlanSheet onClose={() => setOpen(false)} onOpenRecurring={() => navigate("recurring")} />}
    </>
  );
}
