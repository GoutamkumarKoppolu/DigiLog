// Pure rules for deleting money history: the whole of it (month = "") or one
// "YYYY-MM" month. Only ledger transactions and savings withdrawals go;
// movements (borrowed & lent) stay, so the page warns about them.
import { balanceEffect, computeTotals, isSaving } from "../../domain/transactions";
import { computePots } from "../savings/domain";
import { ledgerMonth } from "../../domain/salary";

// Transactions are in their ledger month (a salary in the month it pays
// for, like everywhere else); savings uses and movements in their date's.
const monthOf = (row) => (row.type_kind ? ledgerMonth(row) : row.date.slice(0, 7));
const inMonth = (month) => (row) => !month || monthOf(row) === month;

// Months that have history, newest first.
export function historyMonths(transactions, withdrawals) {
  return [...new Set([...transactions, ...withdrawals].map(monthOf))].sort().reverse();
}

// transactions need `type_kind`; movements are all movement rows.
export function planHistoryDelete({ transactions, withdrawals, movements }, month = "") {
  const scope = inMonth(month);
  const removed = transactions.filter(scope);
  const keptSavings = transactions.filter((t) => isSaving(t) && !scope(t));
  let keptWithdrawals = withdrawals.filter((w) => !scope(w));

  // Pots must never go below zero, e.g. March's saving was used in April:
  // that pot's other uses go too, newest first, until it's back at zero or
  // more. Only Borrowed & lent can still leave it short (those stay), which
  // blocks the delete.
  // ponytail: recomputes all pots per removed use; fine at personal scale.
  const laterUses = [];
  let short;
  while ((short = computePots(keptSavings, keptWithdrawals, movements).find((p) => Math.round(p.remaining * 100) < 0))) {
    const use = keptWithdrawals
      .filter((w) => w.tag === short.tag)
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at)))[0];
    if (!use) break;
    laterUses.push(use);
    keptWithdrawals = keptWithdrawals.filter((w) => w !== use);
  }
  const removedWithdrawals = [...withdrawals.filter(scope), ...laterUses];

  // What each savings pot gains or loses: its savings go, its uses come back.
  const potChange = new Map();
  const change = (tag, amount) => potChange.set(tag, (potChange.get(tag) ?? 0) + amount);
  removed.filter(isSaving).forEach((t) => change(t.tag, -Number(t.amount)));
  removedWithdrawals.forEach((w) => change(w.tag, Number(w.amount)));

  return {
    month,
    transactions: removed,
    withdrawals: removedWithdrawals,
    laterUses,
    totals: computeTotals(removed),
    pots: [...potChange].map(([tag, amount]) => ({ tag, amount })).filter((p) => Math.round(p.amount * 100) !== 0),
    shortPot: short ? { tag: short.tag, amount: -short.remaining } : null,
    keptMovements: movements.filter(scope),
    // What the delete does to the balance: the removed transactions' effect
    // undone, and savings moved into the balance taken back out.
    balanceChange:
      -removed.reduce((sum, t) => sum + balanceEffect(t), 0) -
      removedWithdrawals.filter((w) => w.to_balance).reduce((sum, w) => sum + Number(w.amount), 0),
    empty: removed.length + removedWithdrawals.length === 0,
  };
}
