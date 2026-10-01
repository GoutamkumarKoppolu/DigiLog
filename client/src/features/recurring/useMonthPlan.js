import { useEffect, useState } from "react";
import { useLedger } from "../ledger";
import { today } from "../../utils/format";
import { fetchRecurringData } from "./api";
import { monthPlan } from "./domain";

// This month at a glance (see monthPlan), kept up to date as the ledger
// changes, e.g. when a payment is deducted right after the salary is added.
// null until loaded.
export function useMonthPlan() {
  const { transactions: ledgerVersion, overview } = useLedger();
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    fetchRecurringData()
      .then((next) => live && setData(next))
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [ledgerVersion]);

  return data ? monthPlan(data.items, data.runs, data.transactions, overview.balance, today()) : null;
}
