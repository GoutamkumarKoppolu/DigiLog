// Subscription data access. Tracking only: nothing here touches the ledger
// or the balance.
import { db } from "../../db";
import { requireNonEmpty, requirePositiveAmount } from "../../db/validators";
import { CYCLES, REMIND_OPTIONS } from "./domain";

const nowIso = () => new Date().toISOString();

export function fetchSubscriptions() {
  return db.subscriptions.toArray();
}

async function getSubscription(id) {
  const s = await db.subscriptions.get(Number(id));
  if (!s) throw new Error("Subscription not found");
  return s;
}

// Form → stored fields. Yearly ones keep a month and day (from the renewal
// date picked); monthly ones just the day.
function fields(data) {
  requirePositiveAmount(data.amount);
  if (!Object.keys(CYCLES).includes(data.cycle)) throw new Error("Pick monthly or yearly");
  const day = Number(data.day);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error("Day must be between 1 and 31");
  const month = data.cycle === "yearly" ? Number(data.month) : null;
  if (data.cycle === "yearly" && !(Number.isInteger(month) && month >= 1 && month <= 12)) throw new Error("Pick the renewal date");
  if (data.trial_end && !/^\d{4}-\d{2}-\d{2}$/.test(data.trial_end)) throw new Error("Pick when the trial ends");
  const remind = REMIND_OPTIONS.some((o) => o.value === data.remind) ? data.remind : "off";
  return {
    name: requireNonEmpty(data.name, "name"),
    amount: Number(data.amount),
    cycle: data.cycle,
    day,
    month,
    payment_method: data.payment_method?.trim() || null,
    category: data.category?.trim() || null,
    trial_end: data.trial_end || null,
    remind,
  };
}

export async function createSubscription(data) {
  const id = await db.subscriptions.add({ ...fields(data), cancelled_at: null, created_at: nowIso() });
  return db.subscriptions.get(id);
}

export async function updateSubscription(id, data) {
  const s = await getSubscription(id);
  await db.subscriptions.update(s.id, fields(data));
  return db.subscriptions.get(s.id);
}

// Cancel (keeps it, with the date) or restart a subscription.
export async function setCancelled(id, cancelledOn) {
  const s = await getSubscription(id);
  await db.subscriptions.update(s.id, { cancelled_at: cancelledOn || null });
  return db.subscriptions.get(s.id);
}

export async function deleteSubscription(id) {
  const s = await getSubscription(id);
  await db.subscriptions.delete(s.id);
  return null;
}
