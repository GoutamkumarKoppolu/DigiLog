// Savings data access. Deposits come from the main ledger (transactions of
// kind "saving"); withdrawals live in their own store; movements (money other
// features move into or out of a pot) come from the core registry.
import { db } from "../../db";
import { balanceMessage, fetchMovements, fetchTransactions, withBalanceCheck } from "../../api";
import { requireNonEmpty, requirePositiveAmount } from "../../db/validators";
import { currency } from "../../utils/format";
import { computePots } from "./domain";

const nowIso = () => new Date().toISOString();

export async function fetchSavingsData() {
  const [savings, withdrawals, movements] = await Promise.all([
    fetchTransactions({ kind: "saving" }),
    db.savings_withdrawals.toArray(),
    fetchMovements(),
  ]);
  return { savings, withdrawals, movements: movements.filter((m) => m.account === "savings") };
}

const belowZero = (pot) => Math.round(pot.remaining * 100) < 0;

export async function fetchPots() {
  const { savings, withdrawals, movements } = await fetchSavingsData();
  return computePots(savings, withdrawals, movements);
}

// For features that move money into or out of pots: throws if `change`
// (current movements → movements after the edit) would leave a pot below zero.
export async function checkPots(change) {
  const { savings, withdrawals, movements } = await fetchSavingsData();
  const short = computePots(savings, withdrawals, change(movements)).find(belowZero);
  if (!short) return;
  const before = computePots(savings, withdrawals, movements).find((p) => p.tag === short.tag);
  throw new Error(`Only ${currency(Math.max(0, before?.remaining ?? 0))} left in "${short.tag}" savings`);
}

export async function createWithdrawal(data) {
  requirePositiveAmount(data.amount);
  const tag = requireNonEmpty(data.tag, "pot");
  if (!data.date) throw new Error("date is required");

  const { savings, withdrawals, movements } = await fetchSavingsData();
  const pot = computePots(savings, withdrawals, movements).find((p) => p.tag === tag);
  if (!pot) throw new Error(`No savings found for "${tag}"`);
  // Compare in paise so float noise (e.g. 0.1 + 0.2) never blocks using the full pot.
  if (Math.round(Number(data.amount) * 100) > Math.round(pot.remaining * 100)) {
    throw new Error(`Only ${currency(pot.remaining)} left in "${tag}"`);
  }

  const id = await db.savings_withdrawals.add({
    tag,
    amount: Number(data.amount),
    date: data.date,
    note: data.note?.trim() || null,
    // Money moved into the balance to cover an expense it couldn't (set by
    // the funding feature), and that transaction's id.
    to_balance: data.to_balance === true,
    transaction_id: data.transaction_id ?? null,
    created_at: nowIso(),
  });
  return db.savings_withdrawals.get(id);
}

// Movement source (registered in ./index.js): savings moved into the balance
// add to it; the withdrawal itself already takes them out of the pot.
export async function fetchSavingsMovements() {
  return (await db.savings_withdrawals.toArray())
    .filter((w) => w.to_balance)
    .map((w) => ({
      key: `savings-withdrawal-${w.id}`,
      date: w.date,
      created_at: w.created_at,
      amount: Number(w.amount),
      flow: "in",
      account: "balance",
      pot: null,
      title: `From ${w.tag} savings`,
      note: w.note,
      route: "savings",
    }));
}

// Transaction dependents (registered in ./index.js): savings that covered a
// deleted expense go back into their pot.
export async function removeFundingFor(transactionId) {
  await db.savings_withdrawals.filter((w) => w.transaction_id === transactionId).delete();
}

export async function deleteWithdrawal(id) {
  const wId = Number(id);
  const w = await db.savings_withdrawals.get(wId);
  if (!w) throw new Error("Withdrawal not found");
  await withBalanceCheck(
    () => db.savings_withdrawals.delete(wId),
    (ctx) =>
      `This ${currency(w.amount)} from "${w.tag}" covered an expense and has been spent. ${balanceMessage(ctx)} ` +
      "Delete that expense instead: its savings go back into the pot with it."
  );
  return null;
}

// Transaction guard (registered in ./index.js): blocks editing or deleting a
// Saving transaction when money already used from its pot would then exceed
// what's saved in it.
export async function guardSavingsPots(before, after) {
  if (before.type_kind !== "saving") return;
  const { savings, withdrawals, movements } = await fetchSavingsData();
  const nextSavings = savings.filter((t) => t.id !== before.id);
  if (after && after.type_kind === "saving") nextSavings.push(after);

  const pot = computePots(nextSavings, withdrawals, movements).find((p) => p.tag === before.tag);
  if (pot && belowZero(pot)) {
    throw new Error(
      `${currency(pot.used)} has been used from "${before.tag}". Delete what was used from it first.`
    );
  }
}
