// Pure credit card rules: each card's bill tag, which month a bill pays for,
// and logged spends vs paid bills per month. No storage, no UI.

// Sums in paise so float noise never shows up as a difference.
const toPaise = (n) => Math.round(Number(n) * 100);
const fromPaise = (p) => p / 100;

// Bills are paid when the salary comes in, around the turn of the month: one
// paid on or after this day pays for that month's spends, one paid before it
// for the previous month's (30 Sep and 3 Oct both pay for September).
export const BILL_CUTOFF_DAY = 25;

// The expense tag that marks paying this card's bill.
export const billTag = (cardName) => `${cardName.trim()} bill`;

const sameTag = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// The card whose bill an expense pays, or undefined.
export const cardForTag = (cards, tag) => cards.find((c) => sameTag(billTag(c.name), tag || ""));

function shiftMonth(month, by) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// "YYYY-MM" of the spends a bill paid on `date` covers.
export function billMonth(date) {
  const month = date.slice(0, 7);
  return Number(date.slice(8, 10)) >= BILL_CUTOFF_DAY ? month : shiftMonth(month, -1);
}

// The last `count` months up to the one containing `today`, oldest first.
export function lastMonths(count, today) {
  const current = today.slice(0, 7);
  return Array.from({ length: count }, (_, i) => shiftMonth(current, i - count + 1));
}

// Paid bills (expense rows) grouped by card id, each with the month it pays for.
export function billsByCard(cards, expenses) {
  const byCard = new Map(cards.map((c) => [c.id, []]));
  expenses.forEach((t) => {
    const card = cardForTag(cards, t.tag);
    if (card) byCard.get(card.id).push({ ...t, month: billMonth(t.date) });
  });
  return byCard;
}

// One card, month by month: what was logged as spent, what was paid for it,
// and the difference (paid − logged).
export function compareMonths(months, spends, bills) {
  const sum = (rows, month) => rows.reduce((s, r) => s + (r.month === month ? toPaise(r.amount) : 0), 0);
  const logged = spends.map((s) => ({ ...s, month: s.date.slice(0, 7) }));
  return months.map((month) => {
    const l = sum(logged, month);
    const p = sum(bills, month);
    return { month, logged: fromPaise(l), paid: fromPaise(p), difference: fromPaise(p - l) };
  });
}

// What a month's comparison means, for the line under a card's chart.
export function compareStatus({ logged, paid, difference }) {
  if (!logged && !paid) return { tone: "muted", text: "Nothing logged or paid" };
  if (difference === 0) return { tone: "positive", text: "Matches" };
  if (!paid) return { tone: "muted", text: "Bill not paid yet" };
  if (difference > 0) return { tone: "warning", text: "paid but not logged", amount: difference };
  return { tone: "muted", text: "logged but not paid yet", amount: -difference };
}

// The newest month with anything logged or paid, else the newest month.
export function latestActiveMonth(rows) {
  const active = rows.filter((r) => r.logged || r.paid);
  const pick = active.length ? active : rows;
  return pick.length ? pick[pick.length - 1].month : null;
}
