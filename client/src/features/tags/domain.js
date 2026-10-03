// Pure rules for the Tags page: every transaction grouped by kind, then by
// tag, then by month, across whatever period is selected.
import { deductsFromBalance } from "../../domain/transactions";
import { ledgerMonth } from "../../domain/salary";

// Display order of kind sections.
export const TAG_SECTIONS = [
  { kind: "expense", title: "Expenses" },
  { kind: "saving", title: "Savings" },
  { kind: "earning", title: "Income" },
];

function groupByMonth(rows) {
  const months = new Map();
  rows.forEach((t) => {
    const month = ledgerMonth(t);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(t);
  });
  return [...months.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => ({ month, rows: list, total: list.reduce((s, t) => s + Number(t.amount), 0) }));
}

function summarizeTag(tag, rows) {
  const dates = rows.map((t) => t.date).sort();
  let fromBalance = 0;
  let notFromBalance = 0;
  rows.forEach((t) => {
    if (t.type_kind !== "saving") return;
    if (deductsFromBalance(t)) fromBalance += Number(t.amount);
    else notFromBalance += Number(t.amount);
  });
  return {
    tag,
    count: rows.length,
    total: rows.reduce((s, t) => s + Number(t.amount), 0),
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    fromBalance,
    notFromBalance,
    months: groupByMonth(rows),
  };
}

// rows: ledger rows with type_kind (newest first). `search` filters tag
// names case-insensitively. Empty sections are dropped.
export function groupByKindAndTag(rows, search = "") {
  const needle = search.trim().toLowerCase();
  return TAG_SECTIONS.map(({ kind, title }) => {
    const byTag = new Map();
    rows
      .filter((t) => t.type_kind === kind && (!needle || t.tag.toLowerCase().includes(needle)))
      .forEach((t) => {
        if (!byTag.has(t.tag)) byTag.set(t.tag, []);
        byTag.get(t.tag).push(t);
      });
    const tags = [...byTag.entries()].map(([tag, list]) => summarizeTag(tag, list)).sort((a, b) => b.total - a.total);
    return { kind, title, total: tags.reduce((s, t) => s + t.total, 0), tags };
  }).filter((section) => section.tags.length);
}
