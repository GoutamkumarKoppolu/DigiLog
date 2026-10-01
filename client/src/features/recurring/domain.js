// Pure rules for recurring payments (EMIs, rent, SIPs…). Each month, once the
// month's Salary has been added and the payment's day has come, it becomes a
// normal ledger transaction dated on that day. A "run" records that month's
// payment (recurring_id + month → transaction_id), so each month is added at
// most once, and deleting the transaction gives its amount back to the
// pending balance.

export const SALARY_TAG = "salary";
export const RECURRING_KINDS = ["expense", "saving"];

const toPaise = (n) => Math.round(Number(n) * 100);
const fromPaise = (p) => p / 100;
const pad2 = (n) => String(n).padStart(2, "0");

// Shown under the Tag field when adding an earning (see TransactionForm
// tagHints): the salary must carry this tag for payments to be deducted.
export const SALARY_HINT = {
  kind: "earning",
  tag: "Salary",
  text: "Is this your salary? Tag it \"Salary\". Recurring payments (EMIs, rent, SIPs) are only deducted once it's added.",
  info: "salary",
};

export const isSalary = (t) => t.type_kind === "earning" && String(t.tag).trim().toLowerCase() === SALARY_TAG;

// Months ("YYYY-MM") in which a Salary earning has been added.
export const salaryMonths = (transactions) => new Set(transactions.filter(isSalary).map((t) => t.date.slice(0, 7)));

const lastDayOf = (month) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

// The payment's date in a month; the 31st becomes the 30th in a 30-day month.
export const dueDate = (month, day) => `${month}-${pad2(Math.min(day, lastDayOf(month)))}`;

export function nextMonth(month) {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${pad2(m + 1)}`;
}

export function monthsFrom(from, to) {
  const out = [];
  for (let m = from; m <= to; m = nextMonth(m)) out.push(m);
  return out;
}

// A new payment starts this month if its day is still to come (or today),
// otherwise next month, so nothing is charged for a date that has passed.
export const firstMonth = (day, today) => (dueDate(today.slice(0, 7), day) >= today ? today.slice(0, 7) : nextMonth(today.slice(0, 7)));

// Paid so far = the payments whose transaction still exists (edited amounts
// count as edited). remaining / left are null when not tracked.
export function progress(item, runs, txById) {
  const own = runs.filter((r) => r.recurring_id === item.id).sort((a, b) => b.month.localeCompare(a.month));
  const history = own.map((r) => ({ ...r, transaction: txById.get(r.transaction_id) ?? null }));
  const live = history.filter((r) => r.transaction);
  const paidPaise = live.reduce((sum, r) => sum + toPaise(r.transaction.amount), 0);
  const remaining = item.pending_start == null ? null : fromPaise(Math.max(0, toPaise(item.pending_start) - paidPaise));
  const left = item.duration == null ? null : Math.max(0, item.duration - live.length);
  return {
    history,
    paid: fromPaise(paidPaise),
    paidCount: live.length,
    remaining,
    left,
    // Ends by itself when nothing is pending or no payments are left, or
    // when marked completed by hand (for payments with no known end).
    finished: remaining === 0 || left === 0,
    completed: remaining === 0 || left === 0 || Boolean(item.completed),
  };
}

// Payments to add now: for each month from the payment's start to today's,
// with Salary added, not skipped, not added before, and its day reached.
// Months missed while the app was closed are caught up, each on its own date.
export function duePayments(items, runs, txById, salarySet, today) {
  const out = [];
  const done = new Set(runs.map((r) => `${r.recurring_id}:${r.month}`));
  for (const item of items) {
    if (item.paused) continue;
    const p = progress(item, runs, txById);
    if (p.completed) continue;
    let remaining = p.remaining == null ? null : toPaise(p.remaining);
    let left = p.left;
    for (const month of monthsFrom(item.start_month, today.slice(0, 7))) {
      if (!salarySet.has(month) || item.skipped_months?.includes(month) || done.has(`${item.id}:${month}`)) continue;
      const date = dueDate(month, item.day);
      if (date > today) continue;
      const amount = remaining == null ? toPaise(item.amount) : Math.min(toPaise(item.amount), remaining);
      if (amount <= 0) break;
      out.push({ item, month, date, amount: fromPaise(amount) });
      if (remaining != null) remaining -= amount;
      if (left != null) left -= 1;
      if (remaining === 0 || left === 0) break;
    }
  }
  return out;
}

// Where a payment stands this month, for the Recurring page.
//   deducted · removed (its transaction was deleted) · due (salary in, date to
//   come) · waiting (no salary yet) · skipped · paused · starts (later month) ·
//   completed
export function monthStatus(item, prog, salarySet, today) {
  const month = today.slice(0, 7);
  const date = dueDate(month, item.day);
  const run = prog.history.find((r) => r.month === month);
  if (run) return run.transaction ? { state: "deducted", date: run.transaction.date, amount: run.transaction.amount } : { state: "removed", date };
  if (prog.completed) return { state: "completed" };
  if (item.paused) return { state: "paused" };
  if (item.start_month > month) return { state: "starts", date: dueDate(item.start_month, item.day) };
  if (item.skipped_months?.includes(month)) return { state: "skipped", date };
  const amount = prog.remaining == null ? item.amount : Math.min(item.amount, prog.remaining);
  return salarySet.has(month) ? { state: "due", date, amount } : { state: "waiting", date, amount };
}

// Roughly when the last payment will be, if the payment ends by itself.
export function lastPaymentMonth(item, prog, today) {
  const counts = [];
  if (prog.remaining != null && item.amount > 0) counts.push(Math.ceil(toPaise(prog.remaining) / toPaise(item.amount)));
  if (prog.left != null) counts.push(prog.left);
  if (!counts.length || prog.completed) return null;
  const n = Math.min(...counts);
  const month = today.slice(0, 7);
  let m = item.start_month > month ? item.start_month : month;
  if (prog.history.some((r) => r.month === m && r.transaction)) m = nextMonth(m);
  for (let i = 1; i < n; i++) m = nextMonth(m);
  return m;
}

// This month's totals over all payments.
export function monthTotals(statuses) {
  const t = statuses.reduce(
    (acc, s) => {
      if (s.state === "deducted") acc.deducted += toPaise(s.amount);
      if (s.state === "due" || s.state === "waiting") acc.upcoming += toPaise(s.amount);
      return acc;
    },
    { deducted: 0, upcoming: 0 }
  );
  return { deducted: fromPaise(t.deducted), upcoming: fromPaise(t.upcoming) };
}

// ---------- this month at a glance ----------

const PLAN_STATES = ["due", "waiting", "deducted"];
// Upcoming first (they're what's still to come), then what's been paid.
const PLAN_ORDER = { due: 0, waiting: 0, deducted: 1 };

// The month's salary, every recurring payment that comes out of the balance
// this month, and what's usable:
//   usable salary  = salary − all of this month's payments (paid or not)
//   usable balance = balance − payments still to be deducted
// Payments waiting for the salary aren't taken off the balance: they come out
// of the salary when it's added. Savings that don't come from the balance
// are left out, since they never reduce it.
export function monthPlan(items, runs, transactions, balance, today) {
  const month = today.slice(0, 7);
  const txById = new Map(transactions.map((t) => [t.id, t]));
  const salarySet = salaryMonths(transactions);
  const salaries = transactions.filter((t) => isSalary(t) && t.date.slice(0, 7) === month);

  const rows = items
    .filter((item) => item.kind !== "saving" || item.deduct_from_balance !== false)
    .map((item) => ({ item, status: monthStatus(item, progress(item, runs, txById), salarySet, today) }))
    .filter(({ status }) => PLAN_STATES.includes(status.state))
    .map(({ item, status }) => ({ id: item.id, name: item.name, kind: item.kind, amount: Number(status.amount), date: status.date, state: status.state }))
    .sort((a, b) => PLAN_ORDER[a.state] - PLAN_ORDER[b.state] || a.date.localeCompare(b.date));

  const sum = (states) => rows.reduce((s, r) => s + (states.includes(r.state) ? toPaise(r.amount) : 0), 0);
  const total = sum(PLAN_STATES);
  const stillToDeduct = sum(["due"]);
  const salary = salaries.length ? salaries.reduce((s, t) => s + toPaise(t.amount), 0) : null;

  return {
    month,
    rows,
    salary: salary == null ? null : fromPaise(salary),
    total: fromPaise(total),
    stillToDeduct: fromPaise(stillToDeduct),
    waitingForSalary: fromPaise(sum(["waiting"])),
    usableSalary: salary == null ? null : fromPaise(salary - total),
    balance,
    usableBalance: fromPaise(toPaise(balance) - stillToDeduct),
  };
}
