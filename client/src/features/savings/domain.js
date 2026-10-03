// Pure savings rules: pots are savings grouped by tag, reduced by
// withdrawals. Withdrawals only reduce savings, never the current balance.
import { deductsFromBalance } from "../../domain/transactions";
import { shiftMonth } from "../../utils/format";

// savings: ledger rows of kind "saving"; withdrawals: savings_withdrawals rows;
// movements: money moved into or out of a pot by other features (e.g. a
// repayment paid from savings). Money moved in didn't come from the balance.
export function computePots(savings, withdrawals, movements = []) {
  const pots = new Map();
  const pot = (tag) => {
    if (!pots.has(tag)) pots.set(tag, { tag, saved: 0, fromBalance: 0, notFromBalance: 0, used: 0 });
    return pots.get(tag);
  };

  savings.forEach((t) => {
    const p = pot(t.tag);
    const amount = Number(t.amount);
    p.saved += amount;
    if (deductsFromBalance(t)) p.fromBalance += amount;
    else p.notFromBalance += amount;
  });
  withdrawals.forEach((w) => {
    pot(w.tag).used += Number(w.amount);
  });
  movements
    .filter((m) => m.account === "savings")
    .forEach((m) => {
      const p = pot(m.pot);
      const amount = Number(m.amount);
      if (m.flow === "in") {
        p.saved += amount;
        p.notFromBalance += amount;
      } else p.used += amount;
    });

  return [...pots.values()]
    .map((p) => ({ ...p, remaining: p.saved - p.used }))
    .sort((a, b) => b.remaining - a.remaining || a.tag.localeCompare(b.tag));
}

export function summarizePots(pots) {
  return pots.reduce(
    (acc, p) => ({
      saved: acc.saved + p.saved,
      fromBalance: acc.fromBalance + p.fromBalance,
      notFromBalance: acc.notFromBalance + p.notFromBalance,
      used: acc.used + p.used,
      remaining: acc.remaining + p.remaining,
    }),
    { saved: 0, fromBalance: 0, notFromBalance: 0, used: 0, remaining: 0 }
  );
}

// Deposits, withdrawals and movements merged into one newest-first timeline,
// optionally limited to one pot (tag).
export function buildHistory(savings, withdrawals, movements = [], tag = "") {
  const entries = [
    ...savings.map((t) => ({
      key: `deposit-${t.id}`,
      id: t.id,
      entry: "deposit",
      tag: t.tag,
      amount: Number(t.amount),
      date: t.date,
      note: t.note,
      deducted: deductsFromBalance(t),
      created_at: t.created_at,
    })),
    ...withdrawals.map((w) => ({
      key: `withdrawal-${w.id}`,
      id: w.id,
      entry: "withdrawal",
      toBalance: Boolean(w.to_balance),
      tag: w.tag,
      amount: Number(w.amount),
      date: w.date,
      note: w.note,
      created_at: w.created_at,
    })),
    ...movements
      .filter((m) => m.account === "savings")
      .map((m) => ({
        key: `movement-${m.key}`,
        entry: "movement",
        title: m.title,
        flow: m.flow,
        tag: m.pot,
        amount: Number(m.amount),
        date: m.date,
        note: m.note,
        created_at: m.created_at,
      })),
  ];
  return entries
    .filter((e) => !tag || e.tag === tag)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.created_at).localeCompare(String(a.created_at)));
}

// Money saved into and used from savings in each of the `count` months up to
// `lastMonth`, oldest first, optionally for one pot (tag). Saved: Saving
// transactions and movements into a pot; used: withdrawals and movements out.
export function monthlySavings(savings, withdrawals, movements, lastMonth, count = 12, tag = "") {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(lastMonth, i - count + 1));
  const sums = new Map(months.map((m) => [m, { saved: 0, used: 0 }]));
  const add = (date, key, amount) => {
    const sum = sums.get(date.slice(0, 7));
    if (sum) sum[key] += Math.round(Number(amount) * 100);
  };
  const inPot = (t) => !tag || t === tag;
  savings.filter((t) => inPot(t.tag)).forEach((t) => add(t.date, "saved", t.amount));
  withdrawals.filter((w) => inPot(w.tag)).forEach((w) => add(w.date, "used", w.amount));
  movements
    .filter((m) => m.account === "savings" && inPot(m.pot))
    .forEach((m) => add(m.date, m.flow === "in" ? "saved" : "used", m.amount));
  return months.map((month) => ({ month, saved: sums.get(month).saved / 100, used: sums.get(month).used / 100 }));
}
