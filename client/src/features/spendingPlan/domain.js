// Pure rules for the spending plan: money from the usable balance set aside
// per tag for a month (e.g. Bills ₹10,000, Shopping ₹5,000). Expenses with
// that tag in that month fill its bar. It never changes the balance: the
// plan only shows how much of what you set aside is used, and what's left as
// free money.

const toPaise = (n) => Math.round((Number(n) || 0) * 100);
const fromPaise = (p) => p / 100;

export const sameTag = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

// A bar turns red from this share of the amount set aside.
export const RED_AT = 0.95;
const COLORS = 8; // --cat-1..8, in order

// Each tag of `month`'s plan with what's been spent on it (expenses with that
// tag dated in that month), in the order they were set aside.
export function planProgress(plans, transactions, month) {
  const spent = new Map();
  transactions
    .filter((t) => t.type_kind === "expense" && t.date.slice(0, 7) === month)
    .forEach((t) => {
      const key = String(t.tag).trim().toLowerCase();
      spent.set(key, (spent.get(key) ?? 0) + toPaise(t.amount));
    });

  return plans
    .filter((p) => p.month === month)
    .sort((a, b) => a.id - b.id)
    .map((p, i) => {
      const used = spent.get(p.tag.trim().toLowerCase()) ?? 0;
      const amount = toPaise(p.amount);
      const share = amount ? used / amount : 1;
      return {
        id: p.id,
        tag: p.tag,
        amount: fromPaise(amount),
        spent: fromPaise(used),
        left: fromPaise(amount - used),
        share,
        red: share >= RED_AT,
        color: `var(--cat-${(i % COLORS) + 1})`,
      };
    });
}

// Money still set aside: what's left in each tag (overspending counts as 0).
export const stillSetAside = (rows) => fromPaise(rows.reduce((sum, r) => sum + Math.max(0, toPaise(r.left)), 0));

// The plan of the latest month before `month`, as suggestions for this one.
export function previousPlan(plans, month) {
  const last = plans.filter((p) => p.month < month).reduce((m, p) => (p.month > m ? p.month : m), "");
  return plans.filter((p) => p.month === last).sort((a, b) => a.id - b.id).map((p) => ({ tag: p.tag, amount: p.amount }));
}

// What's wrong with a plan being saved ([{ tag, amount }]), or "".
export function planProblem(rows) {
  for (const [i, r] of rows.entries()) {
    if (!String(r.tag ?? "").trim()) return "Every row needs a tag";
    if (!(toPaise(r.amount) > 0)) return `Set an amount for "${r.tag.trim()}"`;
    if (rows.slice(0, i).some((o) => sameTag(o.tag, r.tag))) return `"${r.tag.trim()}" is in the plan twice`;
  }
  return "";
}
