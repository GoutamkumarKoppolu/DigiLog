// Deleting money history (transactions + savings withdrawals) for one month
// or all time. See domain.js for what goes and the savings-pot check.
import { db } from "../../db";
import { currentBalance, fetchMovements, fetchTransactions, withBalanceCheck } from "../../api";
import { balanceShortfall } from "../../domain/transactions";
import { currency, monthLabel } from "../../utils/format";
import { historyMonths, planHistoryDelete } from "./domain";

async function loadHistory() {
  const [transactions, withdrawals, movements] = await Promise.all([
    fetchTransactions(),
    db.savings_withdrawals.toArray(),
    fetchMovements(),
  ]);
  return { transactions, withdrawals, movements };
}

export async function fetchHistoryMonths() {
  const { transactions, withdrawals } = await loadHistory();
  return historyMonths(transactions, withdrawals);
}

// The plan, plus `balanceBefore` / `balanceAfter` / `balanceShort` (> 0 when
// the balance would go below zero, which blocks the delete).
export async function previewHistoryDelete(month = "") {
  const [history, balanceBefore] = await Promise.all([loadHistory(), currentBalance()]);
  const plan = planHistoryDelete(history, month);
  const balanceAfter = balanceBefore + plan.balanceChange;
  return { ...plan, balanceBefore, balanceAfter, balanceShort: balanceShortfall(balanceBefore, balanceAfter) };
}

export function balanceBlockMessage({ balanceBefore, balanceAfter, month }) {
  if (!month) {
    return (
      `Can't delete everything: your balance would go from ${currency(balanceBefore)} to ${currency(balanceAfter)}, ` +
      "because Borrowed & lent entries (which stay) took money out of it. Change those on Borrowed & lent first."
    );
  }
  return (
    `Can't delete ${monthLabel(month)}: your balance would go from ${currency(balanceBefore)} to ${currency(balanceAfter)}. ` +
    "Money earned that month was spent later, and those later expenses would be left with nothing paying for them. " +
    "Delete those later expenses first, or delete the whole history."
  );
}

export function shortPotMessage({ shortPot }) {
  return (
    `Can't delete: "${shortPot.tag}" savings would go ${currency(shortPot.amount)} below zero, because Borrowed & lent ` +
    `moved money out of it. Change those entries on Borrowed & lent first.`
  );
}

// Skips the per-transaction guards on purpose: they check one row at a time,
// while this checks every pot once after the whole deletion.
export async function deleteHistory(month = "") {
  const plan = await previewHistoryDelete(month);
  if (plan.shortPot) throw new Error(shortPotMessage(plan));
  if (plan.balanceShort > 0) throw new Error(balanceBlockMessage(plan));
  await withBalanceCheck(
    async () => {
      await db.transactions.bulkDelete(plan.transactions.map((t) => t.id));
      await db.savings_withdrawals.bulkDelete(plan.withdrawals.map((w) => w.id));
    },
    () => "Something changed while this was open. Close it and try again."
  );
  return plan;
}
