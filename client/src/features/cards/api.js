// Credit card data access. Logged card spends are kept separate from the
// main ledger so nothing is double-counted; the bill is paid on Home as an
// expense tagged "<card name> bill" (see domain.js), which is only read here.
import { db } from "../../db";
import { fetchTransactions } from "../../api";
import { requireNonEmpty, requirePositiveAmount, requireValidLast4 } from "../../db/validators";
import { billsByCard } from "./domain";

const nowIso = () => new Date().toISOString();

// Newest first; ties broken by creation time.
function sortByDateDesc(rows) {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.created_at < b.created_at ? 1 : -1;
  });
}

export function fetchCreditCards() {
  return db.credit_cards.orderBy("created_at").toArray();
}

// Everything the page compares: every logged spend, and every bill paid from
// Home (expenses tagged with a card's bill tag), by card.
export async function fetchCardData() {
  const [cards, spends, expenses] = await Promise.all([
    fetchCreditCards(),
    db.credit_card_transactions.toArray(),
    fetchTransactions({ kind: "expense" }),
  ]);
  return { cards, spends, bills: billsByCard(cards, expenses) };
}

export async function createCreditCard(data) {
  const name = requireNonEmpty(data.name, "name");
  requireValidLast4(data.last4);
  // Each card's name is its bill tag, so two cards can't share one.
  const cards = await db.credit_cards.toArray();
  if (cards.some((c) => c.name.trim().toLowerCase() === name.toLowerCase())) throw new Error(`You already have a card called "${name}"`);
  const id = await db.credit_cards.add({ name, last4: data.last4 || null, created_at: nowIso() });
  return db.credit_cards.get(id);
}

// Cascade-deletes the card's logged spends too, since IndexedDB has no
// FK/ON DELETE CASCADE support. Bills paid for it stay: they're expenses.
export async function deleteCreditCard(id) {
  const cardId = Number(id);
  const existing = await db.credit_cards.get(cardId);
  if (!existing) throw new Error("Credit card not found");
  await db.transaction("rw", db.credit_cards, db.credit_card_transactions, async () => {
    await db.credit_card_transactions.where("card_id").equals(cardId).delete();
    await db.credit_cards.delete(cardId);
  });
  return null;
}

export async function fetchCardTransactions(cardId, { months = [] } = {}) {
  let rows = await db.credit_card_transactions.where("card_id").equals(Number(cardId)).toArray();
  if (months.length) rows = rows.filter((t) => months.includes(t.date.slice(0, 7)));
  return sortByDateDesc(rows);
}

export async function createCardTransaction(cardId, data) {
  const id = Number(cardId);
  const card = await db.credit_cards.get(id);
  if (!card) throw new Error("Credit card not found");
  requirePositiveAmount(data.amount);
  const description = requireNonEmpty(data.description, "description");
  if (!data.date) throw new Error("date is required");

  const txId = await db.credit_card_transactions.add({
    card_id: id,
    amount: Number(data.amount),
    description,
    date: data.date,
    created_at: nowIso(),
  });
  return db.credit_card_transactions.get(txId);
}

export async function deleteCardTransaction(cardId, txId) {
  const row = await db.credit_card_transactions.get(Number(txId));
  if (!row || row.card_id !== Number(cardId)) throw new Error("Transaction not found");
  await db.credit_card_transactions.delete(Number(txId));
  return null;
}
