import { currency, monthLabel } from "../../utils/format";
import { useSpendingPlan } from "./useSpendingPlan";

// The plan's tags as their own row of suggestions when adding an expense
// (TransactionForm `tagPicks`), each with what's left.
export function usePlanTags() {
  const plan = useSpendingPlan();
  if (!plan?.rows.length) return [];
  return [
    {
      kind: "expense",
      label: `${monthLabel(plan.month).split(" ")[0]} plan`,
      tags: plan.rows.map((r) => ({
        tag: r.tag,
        label: r.left < 0 ? `${r.tag} · over ${currency(-r.left)}` : `${r.tag} · ${currency(r.left)} left`,
        red: r.red,
      })),
    },
  ];
}
