// Spending plan data access. The plan is stored per month; what's spent
// comes from the ledger, so nothing here touches transactions or the balance.
import { db } from "../../db";
import { fetchTransactions } from "../../api";
import { planProblem } from "./domain";

const nowIso = () => new Date().toISOString();

export async function fetchPlanData() {
  const [plans, transactions] = await Promise.all([db.spending_plans.toArray(), fetchTransactions()]);
  return { plans, transactions };
}

// Replaces `month`'s plan with `rows` ([{ tag, amount }]); [] clears it.
// Tags that stay keep their place (and colour).
export async function savePlan(month, rows) {
  const problem = planProblem(rows);
  if (problem) throw new Error(problem);
  const clean = rows.map((r) => ({ tag: r.tag.trim(), amount: Number(r.amount) }));
  await db.transaction("rw", db.spending_plans, async () => {
    const existing = await db.spending_plans.where("month").equals(month).toArray();
    const byTag = new Map(existing.map((p) => [p.tag.toLowerCase(), p]));
    const keep = new Set();
    for (const r of clean) {
      const old = byTag.get(r.tag.toLowerCase());
      if (old) {
        keep.add(old.id);
        await db.spending_plans.update(old.id, { tag: r.tag, amount: r.amount });
      } else {
        await db.spending_plans.add({ month, ...r, created_at: nowIso() });
      }
    }
    await db.spending_plans.bulkDelete(existing.filter((p) => !keep.has(p.id)).map((p) => p.id));
  });
}
