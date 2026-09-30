// On-device data layer (Dexie/IndexedDB) behind the same function names and
// signatures the old fetch()-based client used, so every calling component
// needs zero changes. Validation and error messages are carried over
// verbatim from server/routes/transactions.js, options.js, and
// creditCards.js for behavioral parity.
import { db } from "./db";
import { isKnownOption, requirePositiveAmount, requireNonEmpty } from "./db/validators";
import { TRANSACTION_KINDS, computeTotals, matchesFilters, movementTotals, normalizeDeductFlag } from "./domain/transactions";

const nowIso = () => new Date().toISOString();

async function kindByTypeNameMap() {
  const types = await db.transaction_types.toArray();
  return Object.fromEntries(types.map((t) => [t.name, t.kind]));
}

async function attachTypeKind(row) {
  const map = await kindByTypeNameMap();
  return { ...row, type_kind: map[row.type] ?? null };
}

function sortByDateDesc(rows) {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

async function allTransactionsWithKind() {
  const [rows, map] = await Promise.all([db.transactions.toArray(), kindByTypeNameMap()]);
  return rows.map((t) => ({ ...t, type_kind: map[t.type] ?? null }));
}

// filters: see matchesFilters in domain/transactions.js
export async function fetchTransactions(filters = {}) {
  const rows = await allTransactionsWithKind();
  return sortByDateDesc(rows.filter((t) => matchesFilters(t, filters)));
}

export async function fetchTags() {
  const rows = await db.transactions.toArray();
  return [...new Set(rows.map((t) => t.tag))].sort();
}

// Features add money that moves in or out of the balance or a savings pot
// without being income, an expense or a saving (e.g. borrowing registers
// repayments). A source is an async function returning movement rows, see
// domain/transactions.js.
const movementSources = [];

export function registerMovementSource(source) {
  movementSources.push(source);
}

export async function fetchMovements() {
  const lists = await Promise.all(movementSources.map((source) => source()));
  return sortByDateDesc(lists.flat());
}

// totalSavings is net of money used from savings (features/savings). Using
// savings never changes the balance, so withdrawals only affect that figure.
// Movements change the balance or savings but not earnings or expenses.
export async function fetchOverview() {
  const [rows, withdrawals, movements] = await Promise.all([
    allTransactionsWithKind(),
    db.savings_withdrawals.toArray(),
    fetchMovements(),
  ]);
  const totals = computeTotals(rows);
  const moved = movementTotals(movements);
  const withdrawn = withdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  return {
    totalEarnings: totals.earnings,
    totalExpenses: totals.expenses,
    totalSavings: totals.savings - withdrawn + moved.savings,
    balance: totals.balance + moved.balance,
  };
}

const OPTION_KINDS = ["transaction-types", "payment-methods", "payment-sources"];
const TABLE_BY_KIND = {
  "transaction-types": "transaction_types",
  "payment-methods": "payment_methods",
  "payment-sources": "payment_sources",
};
const NOT_FOUND_MESSAGE = {
  "transaction-types": "Transaction type not found",
  "payment-methods": "payment method not found",
  "payment-sources": "payment source not found",
};

export function fetchOptions(kind) {
  return db[TABLE_BY_KIND[kind]].orderBy("name").toArray();
}

export function fetchAllOptions() {
  return Promise.all(OPTION_KINDS.map(fetchOptions)).then((results) =>
    Object.fromEntries(OPTION_KINDS.map((kind, i) => [kind, results[i]]))
  );
}

// `payload` is either a plain name string, or (for transaction-types) an
// object like { name, kind } where kind is 'earning' | 'expense' | 'saving'.
// Mirrors the old API's upsert-by-name semantics (re-adding an existing name
// updates it in place rather than throwing a duplicate-key error).
export async function addOption(kind, payload) {
  const body = typeof payload === "string" ? { name: payload } : payload;
  const name = requireNonEmpty(body.name, "name");
  const table = TABLE_BY_KIND[kind];

  if (kind === "transaction-types") {
    if (!TRANSACTION_KINDS.includes(body.kind)) {
      throw new Error(`kind must be one of ${TRANSACTION_KINDS.join(", ")}`);
    }
    const existing = await db.transaction_types.where("name").equals(name).first();
    if (existing) {
      await db.transaction_types.update(existing.id, { kind: body.kind });
      return db.transaction_types.get(existing.id);
    }
    const id = await db.transaction_types.add({ name, kind: body.kind });
    return db.transaction_types.get(id);
  }

  const existing = await db[table].where("name").equals(name).first();
  if (existing) return existing;
  const id = await db[table].add({ name });
  return db[table].get(id);
}

export async function deleteOption(kind, id) {
  const table = TABLE_BY_KIND[kind];
  const optId = Number(id);
  const existing = await db[table].get(optId);
  if (!existing) throw new Error(NOT_FOUND_MESSAGE[kind]);
  await db[table].delete(optId);
  return null;
}

async function validateTransactionFields({ type, amount, tag, payment_method, payment_source, date }) {
  if (!(await isKnownOption(db, "transaction_types", type))) {
    throw new Error("type must be a known transaction type");
  }
  requirePositiveAmount(amount);
  const trimmedTag = requireNonEmpty(tag, "tag");
  if (!(await isKnownOption(db, "payment_methods", payment_method))) {
    throw new Error("payment_method must be a known payment method");
  }
  if (!(await isKnownOption(db, "payment_sources", payment_source))) {
    throw new Error("payment_source must be a known payment source");
  }
  if (!date) throw new Error("date is required");
  return trimmedTag;
}

async function transactionRecord(data, trimmedTag) {
  const { type, amount, payment_method, payment_source, date, note, deduct_from_balance } = data;
  const kind = (await kindByTypeNameMap())[type];
  return {
    type,
    amount: Number(amount),
    tag: trimmedTag,
    payment_method: payment_method || null,
    payment_source: payment_source || null,
    date,
    note: note || null,
    deduct_from_balance: normalizeDeductFlag(kind, deduct_from_balance),
  };
}

// Features can veto edits/deletes that would break their own data (e.g. the
// savings feature refuses changes that leave a pot below zero). A guard gets
// (before, after) rows with `type_kind`; `after` is null for a delete. It
// throws an Error with a user-facing message to block the change.
const transactionGuards = [];

export function registerTransactionGuard(guard) {
  transactionGuards.push(guard);
}

async function runTransactionGuards(before, after) {
  for (const guard of transactionGuards) await guard(before, after);
}

export async function createTransaction(data) {
  const trimmedTag = await validateTransactionFields(data);
  const record = await transactionRecord(data, trimmedTag);
  const id = await db.transactions.add({ ...record, created_at: nowIso() });
  return attachTypeKind(await db.transactions.get(id));
}

export async function updateTransaction(id, data) {
  const trimmedTag = await validateTransactionFields(data);

  const txId = Number(id);
  const existing = await db.transactions.get(txId);
  if (!existing) throw new Error("Transaction not found");

  const record = await transactionRecord(data, trimmedTag);
  await runTransactionGuards(await attachTypeKind(existing), await attachTypeKind({ ...existing, ...record }));
  await db.transactions.update(txId, record);
  return attachTypeKind(await db.transactions.get(txId));
}

export async function deleteTransaction(id) {
  const txId = Number(id);
  const existing = await db.transactions.get(txId);
  if (!existing) throw new Error("Transaction not found");
  await runTransactionGuards(await attachTypeKind(existing), null);
  await db.transactions.delete(txId);
  return null;
}
