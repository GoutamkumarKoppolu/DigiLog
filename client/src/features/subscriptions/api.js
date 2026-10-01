// Subscription data access. Tracking only: nothing here touches the ledger
// or the balance. A subscription can be charged to a credit card (`card_id`),
// which feeds that card's estimated bill (registered in ./index.js).
import { db } from "../../db";
import { requireNonEmpty, requirePositiveAmount } from "../../db/validators";
import { CYCLES, REMIND_OPTIONS, cardEstimates } from "./domain";

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
    card_id: data.card_id ? Number(data.card_id) : null,
  };
}

// The card must still exist (it may have been deleted while the form was open).
async function checkCard(f) {
  if (f.card_id != null && !(await db.credit_cards.get(f.card_id))) throw new Error("That credit card no longer exists");
  return f;
}

// Card estimate source: this month's subscription charges per card. Cards
// deleted since are left out (their subscriptions just aren't linked any more).
export async function fetchSubscriptionEstimates(month) {
  const [subs, cards] = await Promise.all([db.subscriptions.toArray(), db.credit_cards.toArray()]);
  const ids = new Set(cards.map((c) => c.id));
  return cardEstimates(subs.filter((s) => ids.has(s.card_id)), month);
}

export async function createSubscription(data) {
  const id = await db.subscriptions.add({ ...(await checkCard(fields(data))), cancelled_at: null, created_at: nowIso() });
  return db.subscriptions.get(id);
}

export async function updateSubscription(id, data) {
  const s = await getSubscription(id);
  await db.subscriptions.update(s.id, await checkCard(fields(data)));
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
