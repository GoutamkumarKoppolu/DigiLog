// Recurring payments data access. The payments themselves become ordinary
// ledger transactions (through the core api, same rules as the + button), so
// balance, Home, Report, Tags and Savings all see them without changes.
import { db } from "../../db";
import { BalanceError, createTransaction, deleteTransaction, fetchAllOptions, fetchTransactions } from "../../api";
import { requireNonEmpty, requirePositiveAmount } from "../../db/validators";
import { RECURRING_KINDS, duePayments, firstMonth, progress, salaryMonths } from "./domain";

const nowIso = () => new Date().toISOString();

export async function fetchRecurringData() {
  const [items, runs, transactions] = await Promise.all([
    db.recurring_payments.toArray(),
    db.recurring_runs.toArray(),
    fetchTransactions({}),
  ]);
  return { items, runs, transactions };
}

async function getItem(id) {
  const item = await db.recurring_payments.get(Number(id));
  if (!item) throw new Error("Recurring payment not found");
  return item;
}

const optionalNumber = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

// Form fields → stored fields. "Pending balance" and "payments left" are
// typed as what's left now; they're stored as totals so that deleting a past
// payment gives it back automatically.
function fields(data, paid = 0, paidCount = 0) {
  const kind = data.kind;
  if (!RECURRING_KINDS.includes(kind)) throw new Error("Pick expense or saving");
  requirePositiveAmount(data.amount);
  const day = Number(data.day);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error("Day must be between 1 and 31");
  const pending = optionalNumber(data.pending);
  if (pending != null && !(pending >= 0)) throw new Error("Pending balance can't be negative");
  const left = optionalNumber(data.left);
  if (left != null && !(Number.isInteger(left) && left >= 0)) throw new Error("Payments left must be a whole number");
  return {
    name: requireNonEmpty(data.name, "name"),
    kind,
    amount: Number(data.amount),
    tag: requireNonEmpty(data.tag, "tag"),
    day,
    payment_method: data.payment_method || null,
    payment_source: data.payment_source || null,
    deduct_from_balance: kind === "saving" ? data.deduct_from_balance !== false : null,
    pending_start: pending == null ? null : pending + paid,
    duration: left == null ? null : left + paidCount,
  };
}

export async function createRecurring(data, today) {
  const f = fields(data);
  const id = await db.recurring_payments.add({
    ...f,
    start_month: firstMonth(f.day, today),
    paused: false,
    completed: false,
    skipped_months: [],
    created_at: nowIso(),
  });
  return db.recurring_payments.get(id);
}

async function progressOf(item) {
  const [runs, transactions] = await Promise.all([
    db.recurring_runs.where("recurring_id").equals(item.id).toArray(),
    fetchTransactions({}),
  ]);
  return progress(item, runs, new Map(transactions.map((t) => [t.id, t])));
}

export async function updateRecurring(id, data) {
  const item = await getItem(id);
  const p = await progressOf(item);
  const f = fields(data, p.paid, p.paidCount);
  // Pause and skip only apply to savings.
  const extra = f.kind === "saving" ? {} : { paused: false, skipped_months: [] };
  await db.recurring_payments.update(item.id, { ...f, ...extra });
  return db.recurring_payments.get(item.id);
}

// Removes the recurring payment. Transactions it already added are real
// payments and stay in the ledger.
export async function deleteRecurring(id) {
  const item = await getItem(id);
  await db.transaction("rw", db.recurring_payments, db.recurring_runs, async () => {
    await db.recurring_runs.where("recurring_id").equals(item.id).delete();
    await db.recurring_payments.delete(item.id);
  });
  return null;
}

async function assertSaving(item) {
  if (item.kind !== "saving") throw new Error("Only saving payments can be paused or skipped");
}

export async function setPaused(id, paused) {
  const item = await getItem(id);
  await assertSaving(item);
  await db.recurring_payments.update(item.id, { paused: Boolean(paused) });
  return null;
}

// Skips (or un-skips) one month for a saving payment.
export async function setSkipped(id, month, skipped) {
  const item = await getItem(id);
  await assertSaving(item);
  const set = new Set(item.skipped_months || []);
  if (skipped) set.add(month);
  else set.delete(month);
  await db.recurring_payments.update(item.id, { skipped_months: [...set].sort() });
  return null;
}

// ---------- adding due payments ----------

// First transaction type of the kind (the default "expense"/"saving" unless
// renamed in Manage options).
async function typeNameFor(kind) {
  const type = (await db.transaction_types.toArray()).find((t) => t.kind === kind);
  if (!type) throw new Error(`Add a transaction type of kind "${kind}" in Manage options`);
  return type.name;
}

async function addDuePayments(today) {
  const { items, runs, transactions } = await fetchRecurringData();
  const due = duePayments(items, runs, new Map(transactions.map((t) => [t.id, t])), salaryMonths(transactions), today);
  if (!due.length) return 0;

  const options = await fetchAllOptions();
  const known = (kind, value) => (value && options[kind].some((o) => o.name === value) ? value : null);
  let added = 0;
  // Payments the balance can't cover wait (shown as "Not enough balance") and
  // are added once money comes in; their later months wait behind them.
  const waiting = new Set();
  for (const { item, month, date, amount } of due) {
    if (waiting.has(item.id)) continue;
    // Never add a month twice, even if another run got there first.
    if (await db.recurring_runs.where("[recurring_id+month]").equals([item.id, month]).count()) continue;
    const tx = await createTransaction({
      type: await typeNameFor(item.kind),
      amount,
      tag: item.tag,
      date,
      // An option deleted in Manage options is left empty rather than failing.
      payment_method: known("payment-methods", item.payment_method),
      payment_source: known("payment-sources", item.payment_source),
      note: `Recurring: ${item.name}`,
      deduct_from_balance: item.deduct_from_balance,
    }).catch((e) => {
      if (!(e instanceof BalanceError)) throw e;
      waiting.add(item.id);
      return null;
    });
    if (!tx) continue;
    try {
      await db.recurring_runs.add({ recurring_id: item.id, month, transaction_id: tx.id, created_at: nowIso() });
      added++;
    } catch (e) {
      await deleteTransaction(tx.id).catch(() => {});
      throw e;
    }
  }
  return added;
}

// Adds every payment that's due. Calls are queued one after another, so two
// quick triggers (opening the app while saving a salary) can't both add the
// same month. Resolves to how many were added.
let queue = Promise.resolve();
export function runDueRecurring(today) {
  const next = queue.then(() => addDuePayments(today));
  queue = next.catch(() => {});
  return next;
}

// Stops (or restarts) a payment by hand, e.g. one with no known end. A
// reopened payment carries on from its next due date; months that passed
// while it was completed aren't charged.
export async function setCompleted(id, completed, today) {
  const item = await getItem(id);
  const patch = { completed: Boolean(completed) };
  if (!completed) {
    const from = firstMonth(item.day, today);
    if (from > item.start_month) patch.start_month = from;
  }
  await db.recurring_payments.update(item.id, patch);
  return null;
}
