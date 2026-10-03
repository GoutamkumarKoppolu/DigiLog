// Pure report rules: per-tag breakdown of one transaction kind, and the
// month-by-month trend with the savings rate.
import { shiftMonth } from "../../utils/format";
const MAX_SLICES = 7; // + "Other" = 8, matching the --cat-1..8 palette

// rows: ledger rows with type_kind. Returns { total, items } where items are
// [{ tag, amount, share, color, previous }] biggest first; tags past the
// palette size are folded into "Other". `previousRows` (optional) supplies
// the prior period for a change-vs-last-period figure.
export function breakdownByTag(rows, kind, previousRows = null) {
  const sumByTag = (list) => {
    const map = new Map();
    list
      .filter((t) => t.type_kind === kind)
      .forEach((t) => map.set(t.tag, (map.get(t.tag) || 0) + Number(t.amount)));
    return map;
  };

  const current = sumByTag(rows);
  const previous = previousRows ? sumByTag(previousRows) : null;
  const total = [...current.values()].reduce((s, v) => s + v, 0);

  const sorted = [...current.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);

  const items = head.map(([tag, amount]) => ({ tag, amount, previous: previous ? previous.get(tag) || 0 : null }));
  if (rest.length) {
    items.push({
      tag: `Other (${rest.length})`,
      amount: rest.reduce((s, [, v]) => s + v, 0),
      previous: previous ? rest.reduce((s, [tag]) => s + (previous.get(tag) || 0), 0) : null,
    });
  }

  return {
    total,
    items: items.map((item, i) => ({
      ...item,
      share: total ? item.amount / total : 0,
      color: `var(--cat-${i + 1})`,
    })),
  };
}

// Percentage change vs the previous period, or null when not comparable.
export function changePct(amount, previous) {
  if (previous === null || previous === 0) return null;
  return ((amount - previous) / previous) * 100;
}

const toPaise = (n) => Math.round(Number(n) * 100);

// Income, expenses and savings for each of the `count` months up to
// `lastMonth`, oldest first. `monthOf(t)` is the month a transaction counts
// in (a salary counts in the month it pays for). Savings rate = what wasn't
// spent ÷ income (money saved or left in the balance both count as kept);
// null without income.
export function monthlyTrend(rows, lastMonth, monthOf, count = 12) {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(lastMonth, i - count + 1));
  const sums = new Map(months.map((m) => [m, { earning: 0, expense: 0, saving: 0 }]));
  rows.forEach((t) => {
    const sum = sums.get(monthOf(t));
    if (sum && t.type_kind in sum) sum[t.type_kind] += toPaise(t.amount);
  });
  return months.map((month) => {
    const { earning, expense, saving } = sums.get(month);
    return {
      month,
      income: earning / 100,
      expenses: expense / 100,
      saved: saving / 100,
      kept: (earning - expense) / 100,
      rate: earning > 0 ? (earning - expense) / earning : null,
    };
  });
}

// Savings rate over every month with income, weighted by income.
export function averageRate(trend) {
  const months = trend.filter((m) => m.income > 0);
  if (!months.length) return null;
  const income = months.reduce((s, m) => s + toPaise(m.income), 0);
  return months.reduce((s, m) => s + toPaise(m.kept), 0) / income;
}
