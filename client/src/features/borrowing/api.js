// Data access for money borrowed from and lent to people. A record or payment
// can be linked to the balance or a savings pot; it then shows up as a
// movement (registered in ./index.js), and no pot may go below zero.
import { db } from "../../db";
import { balanceMessage, withBalanceCheck } from "../../api";
import { requireNonEmpty, requirePositiveAmount } from "../../db/validators";
import { currency } from "../../utils/format";
import { checkPots } from "../savings";
import { LINKS, MOVEMENT_KEY, borrowMovements, cleanPhone, exceeds, isDirection, maxPayment, summarizeRecord } from "./domain";

const nowIso = () => new Date().toISOString();

export async function fetchBorrowingData() {
  const [records, payments] = await Promise.all([db.borrow_records.toArray(), db.borrow_payments.toArray()]);
  return { records, payments };
}

// Movement source for the core ledger (see registerMovementSource).
export async function fetchBorrowMovements() {
  const { records, payments } = await fetchBorrowingData();
  return borrowMovements(records, payments);
}

// Refuses a change that would leave a savings pot below zero. `edit` turns
// the current { records, payments } into what they'd be after the change.
async function checkSavings(edit) {
  const next = edit(await fetchBorrowingData());
  await checkPots((movements) => [
    ...movements.filter((m) => !m.key.startsWith(MOVEMENT_KEY)),
    ...borrowMovements(next.records, next.payments),
  ]);
}

const replaceRow = (rows, row) => rows.map((r) => (r.id === row.id ? row : r));

// Refusal for a change that takes back money that was already spent.
const spent = (ctx, what = "Delete or edit what it paid for first.") =>
  `${balanceMessage(ctx)} That money has already been spent. ${what}`;

// What's left in the balance to pay or lend from, never below zero.
const available = (before) => currency(Math.max(0, before));

async function getRecord(id) {
  const record = await db.borrow_records.get(Number(id));
  if (!record) throw new Error("Record not found");
  return record;
}

async function summaryOf(record) {
  return summarizeRecord(record, await db.borrow_payments.where("record_id").equals(record.id).toArray());
}

// null (or anything empty) = just note it.
function linkFields(data) {
  if (!data.linked_to) return { linked_to: null, pot: null };
  if (!LINKS.includes(data.linked_to)) throw new Error("Pick balance, savings or just note it");
  return { linked_to: data.linked_to, pot: data.linked_to === "savings" ? requireNonEmpty(data.pot, "pot") : null };
}

function recordFields(data) {
  requirePositiveAmount(data.amount);
  if (!data.date) throw new Error("date is required");
  return {
    person: requireNonEmpty(data.person, "name"),
    amount: Number(data.amount),
    date: data.date,
    phone: cleanPhone(data.phone) || null,
    note: data.note?.trim() || null,
    ...linkFields(data),
  };
}

// `transaction_id`: the expense this borrowing covered (set by the funding
// feature), so deleting that expense removes it too.
export async function createRecord(direction, data) {
  if (!isDirection(direction)) throw new Error("Pick borrowed or lent");
  const record = { direction, ...recordFields(data), completed: false, transaction_id: data.transaction_id ?? null, created_at: nowIso() };
  await checkSavings(({ records, payments }) => ({ records: [...records, { ...record, id: 0 }], payments }));
  return withBalanceCheck(
    async () => db.borrow_records.get(await db.borrow_records.add(record)),
    ({ before }) =>
      `You have ${available(before)} in your balance, so you can't lend ${currency(record.amount)} from it. ` +
      "Lend from a Savings pot instead, or lend less."
  );
}

export async function updateRecord(id, data) {
  const record = await getRecord(id);
  const fields = recordFields(data);
  const { paid } = await summaryOf(record);
  if (exceeds(paid, fields.amount)) {
    throw new Error(`${currency(paid)} has already been paid back, so the amount can't be less than that`);
  }
  await checkSavings(({ records, payments }) => ({ records: replaceRow(records, { ...record, ...fields }), payments }));
  return withBalanceCheck(async () => {
    await db.borrow_records.update(record.id, fields);
    return db.borrow_records.get(record.id);
  }, spent);
}

// Marks a record completed by hand (e.g. the rest was let go), or reopens it.
export async function setCompleted(id, completed) {
  const record = await getRecord(id);
  await db.borrow_records.update(record.id, { completed: Boolean(completed) });
  return db.borrow_records.get(record.id);
}

// Also undoes its payments, and whatever they and the record moved.
export async function deleteRecord(id) {
  const record = await getRecord(id);
  await checkSavings(({ records, payments }) => ({
    records: records.filter((r) => r.id !== record.id),
    payments: payments.filter((p) => p.record_id !== record.id),
  }));
  await withBalanceCheck(async () => {
    await db.borrow_payments.where("record_id").equals(record.id).delete();
    await db.borrow_records.delete(record.id);
  }, (ctx) =>
    spent(ctx, record.transaction_id ? "It covered an expense: delete that expense instead, and this record goes with it." : undefined)
  );
  return null;
}

function paymentFields(data) {
  requirePositiveAmount(data.amount);
  if (!data.date) throw new Error("date is required");
  return { amount: Number(data.amount), date: data.date, note: data.note?.trim() || null, ...linkFields(data) };
}

// A payment can't be more than what's left.
function assertFits(summary, amount, editing = null) {
  const max = maxPayment(summary, editing);
  if (exceeds(amount, max)) throw new Error(`Only ${currency(max)} is left`);
}

export async function createPayment(recordId, data) {
  const record = await getRecord(recordId);
  const fields = paymentFields(data);
  assertFits(await summaryOf(record), fields.amount);
  const payment = { record_id: record.id, ...fields, created_at: nowIso() };
  await checkSavings(({ records, payments }) => ({ records, payments: [...payments, { ...payment, id: 0 }] }));
  return withBalanceCheck(
    async () => db.borrow_payments.get(await db.borrow_payments.add(payment)),
    ({ before }) =>
      `You have ${available(before)} in your balance, so you can't pay ${currency(payment.amount)} from it. ` +
      "Pay that much now and the rest later, or pay from a Savings pot."
  );
}

export async function updatePayment(paymentId, data) {
  const payment = await db.borrow_payments.get(Number(paymentId));
  if (!payment) throw new Error("Payment not found");
  const fields = paymentFields(data);
  assertFits(await summaryOf(await getRecord(payment.record_id)), fields.amount, payment);
  await checkSavings(({ records, payments }) => ({ records, payments: replaceRow(payments, { ...payment, ...fields }) }));
  return withBalanceCheck(async () => {
    await db.borrow_payments.update(payment.id, fields);
    return db.borrow_payments.get(payment.id);
  }, spent);
}

export async function deletePayment(paymentId) {
  const id = Number(paymentId);
  if (!(await db.borrow_payments.get(id))) throw new Error("Payment not found");
  await checkSavings(({ records, payments }) => ({ records, payments: payments.filter((p) => p.id !== id) }));
  await withBalanceCheck(() => db.borrow_payments.delete(id), spent);
  return null;
}

// People money was borrowed from, most recent first (suggestions when
// borrowing to cover an expense).
export async function fetchLenders() {
  const records = (await db.borrow_records.toArray()).filter((r) => r.direction === "borrowed");
  records.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return [...new Set(records.map((r) => r.person))];
}

// Transaction dependents (registered in ./index.js): borrowing that covered a
// deleted expense goes with it, unless some of it was already repaid.
export async function removeFundingFor(transactionId) {
  const records = await db.borrow_records.filter((r) => r.transaction_id === transactionId).toArray();
  for (const record of records) {
    const { paid } = await summaryOf(record);
    if (paid > 0) {
      throw new Error(
        `You've already repaid ${currency(paid)} of the ${currency(record.amount)} borrowed from ${record.person} for this. ` +
          "That debt is real, so the expense can't be deleted. Edit it instead, or delete those repayments first."
      );
    }
    await db.borrow_records.delete(record.id);
  }
}
