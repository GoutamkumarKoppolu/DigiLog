// Pure business rules for ledger transactions: no UI, no storage.
// Rows passed in are expected to carry `type_kind` (attached by api.js).

export const TRANSACTION_KINDS = ["earning", "expense", "saving"];

export const KIND_LABELS = { earning: "Earning", expense: "Expense", saving: "Saving" };

export const DEDUCTION_FILTERS = {
  ALL: "all",
  DEDUCTED: "deducted",
  NOT_DEDUCTED: "not-deducted",
};

export const isSaving = (t) => t.type_kind === "saving";

// Savings recorded before this flag existed have no value stored and were
// always deducted, so anything other than an explicit `false` counts.
export const deductsFromBalance = (t) => isSaving(t) && t.deduct_from_balance !== false;

// Value to persist for the flag given the transaction's kind: only savings
// carry it, and it defaults to deducting.
export const normalizeDeductFlag = (kind, value) => (kind === "saving" ? value !== false : null);

export function computeTotals(rows) {
  const totals = { earnings: 0, expenses: 0, savings: 0, deductedSavings: 0 };
  rows.forEach((t) => {
    const amount = Number(t.amount);
    if (t.type_kind === "earning") totals.earnings += amount;
    else if (t.type_kind === "expense") totals.expenses += amount;
    else if (isSaving(t)) {
      totals.savings += amount;
      if (deductsFromBalance(t)) totals.deductedSavings += amount;
    }
  });
  return { ...totals, balance: totals.earnings - totals.expenses - totals.deductedSavings };
}

// filters: { months: string[], tags: string[], kind: "" | kind, deduction: DEDUCTION_FILTERS value }
export function matchesFilters(t, { months = [], tags = [], kind = "", deduction = DEDUCTION_FILTERS.ALL } = {}) {
  if (months.length && !months.includes(t.date.slice(0, 7))) return false;
  if (tags.length && !tags.includes(t.tag)) return false;
  if (kind && t.type_kind !== kind) return false;
  if (kind === "saving" && deduction !== DEDUCTION_FILTERS.ALL) {
    const wanted = deduction === DEDUCTION_FILTERS.DEDUCTED;
    if (deductsFromBalance(t) !== wanted) return false;
  }
  return true;
}

// ---------- movements ----------
// Money moving in or out of the balance or a savings pot that isn't income,
// an expense or a saving, e.g. repaying someone you borrowed from. Features
// register where they come from (see registerMovementSource in api.js). Row:
// { key, date, created_at, amount, flow: "in" | "out", account: "balance" |
//   "savings", pot (savings only), title, note, route }

export const movementSign = (m) => (m.flow === "in" ? 1 : -1);

// How much movements add to (or take from) the balance and overall savings.
export function movementTotals(movements) {
  const totals = { balance: 0, savings: 0 };
  movements.forEach((m) => {
    totals[m.account] += movementSign(m) * Number(m.amount);
  });
  return totals;
}

// Movements aren't income, expenses or savings, so they only show on Home
// when no type or tag filter is picked.
export function matchesMovementFilters(m, { months = [], tags = [], kind = "" } = {}) {
  if (kind || tags.length) return false;
  return !months.length || months.includes(m.date.slice(0, 7));
}
