import { useEffect, useState } from "react";
import { useLedger } from "../ledger";
import { planMonth, salaryMonths } from "../../domain/salary";
import { today } from "../../utils/format";
import { fetchPlanData } from "./api";
import { planProgress, previousPlan, stillSetAside } from "./domain";

// The spending plan of the month on show (next month as soon as its salary
// is in, like Recurring), with what's been spent on each tag. Reloads when
// the ledger changes. null until loaded.
export function useSpendingPlan() {
  const { transactions: ledgerVersion } = useLedger();
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    fetchPlanData()
      .then((next) => live && setData(next))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [ledgerVersion]);

  if (!data) return null;
  const month = planMonth(salaryMonths(data.transactions), today());
  const rows = planProgress(data.plans, data.transactions, month);
  return { month, rows, setAside: stillSetAside(rows), previous: previousPlan(data.plans, month) };
}
